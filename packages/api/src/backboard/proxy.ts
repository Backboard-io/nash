import { v4 as uuidv4 } from 'uuid';
import { logger } from '@librechat/data-schemas';
import { BackboardClient } from './client';
import type { Request, Response } from 'express';
import type {
  BackboardMemory,
  OpenAIChatMessage,
  OpenAIChatCompletionRequest,
  OpenAIChatCompletionChunk,
  OpenAIChatCompletionResponse,
} from './types';

let cachedClient: BackboardClient | null = null;
let cachedAssistantId: string | null = null;

function getClient(): BackboardClient {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.BACKBOARD_API_KEY;
  if (!apiKey) {
    throw new Error('BACKBOARD_API_KEY environment variable is required');
  }

  const baseUrl = process.env.BACKBOARD_BASE_URL ?? 'https://app.backboard.io/api';
  cachedClient = new BackboardClient(apiKey, baseUrl);
  return cachedClient;
}

async function getOrCreateAssistant(client: BackboardClient): Promise<string> {
  if (cachedAssistantId) {
    return cachedAssistantId;
  }

  const envId = process.env.BACKBOARD_ASSISTANT_ID;
  if (envId) {
    cachedAssistantId = envId;
    logger.info(`[Backboard] Using assistant from env: ${envId}`);
    return envId;
  }

  const assistants = await client.listAssistants();
  const appName = process.env.APP_TITLE ?? 'Nash';
  const existing = assistants.find((a) => a.name === appName || a.name === 'LibreChat');
  if (existing) {
    cachedAssistantId = existing.assistant_id;
    logger.info(`[Backboard] Using existing assistant: ${cachedAssistantId}`);
    return cachedAssistantId;
  }

  const created = await client.createAssistant(
    appName,
    `${appName} conversational assistant powered by Backboard`,
  );
  cachedAssistantId = created.assistant_id;
  logger.info(`[Backboard] Created assistant: ${cachedAssistantId}`);
  return cachedAssistantId;
}

async function createThread(
  client: BackboardClient,
  assistantId: string,
): Promise<string> {
  const thread = await client.createThread(assistantId);
  return thread.thread_id;
}

function buildPromptFromMessages(messages: OpenAIChatMessage[]): string {
  if (messages.length === 0) {
    return '';
  }

  if (messages.length === 1) {
    return messages[0].content ?? '';
  }

  const systemMessages = messages.filter((m) => m.role === 'system');
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  const parts: string[] = [];

  if (systemMessages.length > 0) {
    const systemContent = systemMessages
      .map((m) => m.content)
      .filter(Boolean)
      .join('\n');
    parts.push(`[System Instructions]\n${systemContent}`);
  }

  if (conversationMessages.length > 1) {
    const history = conversationMessages.slice(0, -1);
    const historyLines = history
      .map((m) => {
        const label = m.role === 'user' ? 'User' : 'Assistant';
        return `${label}: ${m.content ?? ''}`;
      })
      .join('\n');
    parts.push(`[Conversation History]\n${historyLines}`);
  }

  const lastMessage = conversationMessages[conversationMessages.length - 1];
  if (lastMessage) {
    parts.push(`[Current Message]\n${lastMessage.content ?? ''}`);
  }

  return parts.join('\n\n');
}

function parseModelSpec(model: string): { provider?: string; modelName: string } {
  if (model.includes('/')) {
    const [provider, ...rest] = model.split('/');
    return { provider, modelName: rest.join('/') };
  }
  return { modelName: model };
}

const FOLDER_CONTEXT_TYPE = 'folder_thread_context';
const MAX_FOLDER_CONTEXT_CHARS = 8000;

async function fetchFolderContext(
  client: BackboardClient,
  assistantId: string,
): Promise<string> {
  try {
    const response = await client.getMemories(assistantId);
    const contextMemories = response.memories.filter((m: BackboardMemory) => {
      const meta = (m.metadata ?? {}) as Record<string, unknown>;
      return meta.type === FOLDER_CONTEXT_TYPE;
    });

    if (contextMemories.length === 0) {
      return '';
    }

    contextMemories.sort((a: BackboardMemory, b: BackboardMemory) => {
      const aTime = a.created_at ?? '';
      const bTime = b.created_at ?? '';
      return aTime.localeCompare(bTime);
    });

    let totalChars = 0;
    const selected: string[] = [];
    for (let i = contextMemories.length - 1; i >= 0; i--) {
      const content = contextMemories[i].content;
      if (totalChars + content.length > MAX_FOLDER_CONTEXT_CHARS) {
        break;
      }
      selected.unshift(content);
      totalChars += content.length;
    }

    return selected.join('\n---\n');
  } catch (err) {
    logger.warn('[Backboard Proxy] Failed to fetch folder context:', err);
    return '';
  }
}

function saveFolderContext(
  client: BackboardClient,
  assistantId: string,
  userPrompt: string,
  assistantResponse: string,
): void {
  const trimmedPrompt = userPrompt.length > 1000 ? userPrompt.slice(0, 1000) + '…' : userPrompt;
  const trimmedResponse = assistantResponse.length > 1000
    ? assistantResponse.slice(0, 1000) + '…'
    : assistantResponse;

  const content = `User: ${trimmedPrompt}\nAssistant: ${trimmedResponse}`;

  client.addMemory(assistantId, content, {
    type: FOLDER_CONTEXT_TYPE,
    savedAt: new Date().toISOString(),
  }).catch((err: unknown) => {
    logger.warn('[Backboard Proxy] Failed to save folder context:', err);
  });
}

export async function handleChatCompletions(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as OpenAIChatCompletionRequest;
    const { messages, model, stream } = body;

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: { message: 'messages array is required', type: 'invalid_request_error' } });
      return;
    }

    const resolvedModel = model ?? 'gpt-4o';
    const { provider, modelName } = parseModelSpec(resolvedModel);
    logger.info(
      `[Backboard Proxy] model from request: "${model ?? '(none)'}" → provider: "${provider ?? '(none)'}", modelName: "${modelName}"${!model ? ' (FALLBACK to gpt-4o)' : ''}`,
    );

    const client = getClient();
    const overrideAssistantId = req.headers['x-backboard-assistant-id'] as string | undefined;
    const assistantId = overrideAssistantId ?? await getOrCreateAssistant(client);
    const threadId = await createThread(client, assistantId);

    let folderContext = '';
    if (overrideAssistantId) {
      folderContext = await fetchFolderContext(client, overrideAssistantId);
    }

    const appName = process.env.APP_TITLE ?? 'Nash';
    let prompt = buildPromptFromMessages(messages);

    const identityPrefix = `[System] You are ${appName}, an AI assistant. Never refer to yourself as LibreChat. Your name is ${appName}.\n\n`;
    prompt = identityPrefix + prompt;

    if (folderContext) {
      prompt = `[Folder Context — prior conversations in this folder]\n${folderContext}\n\n${prompt}`;
      logger.info(`[Backboard Proxy] Injected ${folderContext.length} chars of folder context`);
    }

    const isFolderChat = !!overrideAssistantId;
    const memoryMode = isFolderChat ? 'Off' : 'Auto';

    const onComplete = isFolderChat
      ? (response: string) => {
        const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
        saveFolderContext(client, overrideAssistantId, lastUserMsg?.content ?? '', response);
      }
      : undefined;

    logger.info(
      `[Backboard Proxy] new thread ${threadId}, assistant=${assistantId}${isFolderChat ? ' (folder override)' : ''}, memory=${memoryMode}, ${messages.length} messages, stream=${String(stream)}`,
    );

    if (stream) {
      await handleStreamingResponse(res, client, threadId, prompt, modelName, provider, onComplete, memoryMode);
    } else {
      await handleNonStreamingResponse(res, client, threadId, prompt, resolvedModel, modelName, provider, onComplete, memoryMode);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    logger.error(`[Backboard Proxy] Error: ${message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: { message, type: 'server_error' } });
    }
  }
}

/** Milliseconds of silence after last content token before closing client stream */
const STREAM_IDLE_TIMEOUT_MS = 1500;

async function handleStreamingResponse(
  res: Response,
  client: BackboardClient,
  threadId: string,
  prompt: string,
  modelName: string,
  provider?: string,
  onComplete?: (response: string) => void,
  memoryMode: string = 'Auto',
): Promise<void> {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const completionId = `chatcmpl-bb-${uuidv4().slice(0, 12)}`;
  const created = Math.floor(Date.now() / 1000);

  const roleChunk: OpenAIChatCompletionChunk = {
    id: completionId,
    object: 'chat.completion.chunk',
    created,
    model: modelName,
    choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
  };
  res.write(`data: ${JSON.stringify(roleChunk)}\n\n`);

  const responseParts: string[] = [];
  let streamClosed = false;

  const closeClientStream = () => {
    if (streamClosed || res.writableEnded) {
      return;
    }
    streamClosed = true;
    const stopChunk: OpenAIChatCompletionChunk = {
      id: completionId,
      object: 'chat.completion.chunk',
      created,
      model: modelName,
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    };
    res.write(`data: ${JSON.stringify(stopChunk)}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  };

  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  for await (const event of client.streamMessage(threadId, prompt, {
    llmProvider: provider,
    modelName,
    memory: memoryMode,
  })) {
    if (event.type === 'content_streaming' && event.content) {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      responseParts.push(event.content);
      if (!streamClosed) {
        const chunk: OpenAIChatCompletionChunk = {
          id: completionId,
          object: 'chat.completion.chunk',
          created,
          model: modelName,
          choices: [{ index: 0, delta: { content: event.content }, finish_reason: null }],
        };
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      idleTimer = setTimeout(closeClientStream, STREAM_IDLE_TIMEOUT_MS);
    }
  }

  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  closeClientStream();

  if (onComplete) {
    onComplete(responseParts.join(''));
  }
}

async function handleNonStreamingResponse(
  res: Response,
  client: BackboardClient,
  threadId: string,
  prompt: string,
  model: string,
  modelName: string,
  provider?: string,
  onComplete?: (response: string) => void,
  memoryMode: string = 'Auto',
): Promise<void> {
  const contentParts: string[] = [];
  let responseSent = false;

  const sendResponse = () => {
    if (responseSent) {
      return;
    }
    responseSent = true;
    const fullResponse = contentParts.join('');
    const response: OpenAIChatCompletionResponse = {
      id: `chatcmpl-bb-${uuidv4().slice(0, 12)}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model ?? modelName,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: fullResponse },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
    res.json(response);
  };

  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  for await (const event of client.streamMessage(threadId, prompt, {
    llmProvider: provider,
    modelName,
    memory: memoryMode,
  })) {
    if (event.type === 'content_streaming' && event.content) {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      contentParts.push(event.content);
      idleTimer = setTimeout(sendResponse, STREAM_IDLE_TIMEOUT_MS);
    }
  }

  if (idleTimer) {
    clearTimeout(idleTimer);
  }
  sendResponse();

  if (onComplete) {
    onComplete(contentParts.join(''));
  }
}

let cachedModels: { id: string; object: string; created: number; owned_by: string }[] | null = null;
let modelsCacheExpiry = 0;

const MODELS_CACHE_TTL_MS = 3600_000;

async function fetchBackboardModels(): Promise<
  { id: string; object: string; created: number; owned_by: string }[]
> {
  const now = Date.now();
  if (cachedModels && now < modelsCacheExpiry) {
    return cachedModels;
  }

  const apiKey = process.env.BACKBOARD_API_KEY;
  const baseUrl = process.env.BACKBOARD_BASE_URL ?? 'https://app.backboard.io/api';

  if (!apiKey) {
    return [];
  }

  const providersRes = await fetch(`${baseUrl}/models/providers`, {
    headers: { 'X-API-Key': apiKey },
  });
  const { providers = [] } = (await providersRes.json()) as { providers: string[] };

  const allModels: { id: string; object: string; created: number; owned_by: string }[] = [];

  for (const provider of providers) {
    const modelsRes = await fetch(
      `${baseUrl}/models?provider=${encodeURIComponent(provider)}`,
      { headers: { 'X-API-Key': apiKey } },
    );
    const data = (await modelsRes.json()) as {
      models: { name: string; model_type: string; provider: string }[];
    };

    for (const m of data.models ?? []) {
      if (m.model_type !== 'llm') {
        continue;
      }
      allModels.push({
        id: `${m.provider}/${m.name}`,
        object: 'model',
        created: 1700000000,
        owned_by: m.provider,
      });
    }
  }

  cachedModels = allModels;
  modelsCacheExpiry = now + MODELS_CACHE_TTL_MS;
  logger.info(`[Backboard] Cached ${allModels.length} models from ${providers.length} providers`);
  return allModels;
}

export async function handleListModels(_req: Request, res: Response): Promise<void> {
  try {
    const models = await fetchBackboardModels();
    res.json({ object: 'list', data: models });
  } catch (err) {
    logger.error('[Backboard] Error fetching models:', err);
    res.json({ object: 'list', data: [] });
  }
}
