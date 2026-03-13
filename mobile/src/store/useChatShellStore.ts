import { useMemo, useReducer } from 'react';

import { t } from '../localization/clientCopy';
import { chatShellService } from '../services/chatShellService';
import type {
  ChatShellService,
  ChatShellStoreState,
  SideNavActionId,
} from '../types/chatShell';

type ChatShellAction =
  | { type: 'toggle_nav' }
  | { type: 'close_nav' }
  | { type: 'toggle_side_panel' }
  | { type: 'close_side_panel' }
  | { type: 'set_temporary'; value: boolean }
  | { type: 'set_cerebras_access'; value: boolean }
  | { type: 'set_search_query'; value: string }
  | { type: 'toggle_chats_expanded' }
  | { type: 'select_conversation'; conversationId: string }
  | { type: 'set_active_panel'; actionId: SideNavActionId }
  | { type: 'set_composer_text'; value: string }
  | { type: 'send_message_start'; text: string }
  | { type: 'send_message_complete'; text: string }
  | { type: 'send_message_failed'; text: string }
  | { type: 'new_chat_reset'; composerText: string; isTemporary: boolean };

function reducer(state: ChatShellStoreState, action: ChatShellAction): ChatShellStoreState {
  switch (action.type) {
    case 'toggle_nav': {
      const next = !state.navVisible;
      return {
        ...state,
        navVisible: next,
        sidePanelVisible: next ? false : state.sidePanelVisible,
      };
    }
    case 'close_nav':
      return { ...state, navVisible: false };
    case 'toggle_side_panel': {
      const next = !state.sidePanelVisible;
      return {
        ...state,
        sidePanelVisible: next,
        navVisible: next ? false : state.navVisible,
      };
    }
    case 'close_side_panel':
      return { ...state, sidePanelVisible: false };
    case 'set_temporary':
      return { ...state, isTemporary: action.value };
    case 'set_cerebras_access':
      return { ...state, hasCerebrasAccess: action.value };
    case 'set_search_query':
      return { ...state, searchQuery: action.value };
    case 'toggle_chats_expanded':
      return { ...state, isChatsExpanded: !state.isChatsExpanded };
    case 'select_conversation':
      return { ...state, selectedConversationId: action.conversationId, navVisible: false };
    case 'set_active_panel':
      return {
        ...state,
        activePanel: action.actionId,
        sidePanelVisible: action.actionId === 'hide-panel' ? false : state.sidePanelVisible,
      };
    case 'set_composer_text':
      return { ...state, composerText: action.value };
    case 'send_message_start':
      return {
        ...state,
        composerText: '',
        messages: [
          ...state.messages,
          {
            id: `msg_${state.messages.length + 1}`,
            role: 'user',
            text: action.text,
          },
        ],
        isReplying: true,
      };
    case 'send_message_complete':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `msg_${state.messages.length + 1}`,
            role: 'assistant',
            text: action.text,
          },
        ],
        isReplying: false,
      };
    case 'send_message_failed':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: `msg_${state.messages.length + 1}`,
            role: 'assistant',
            text: action.text,
          },
        ],
        isReplying: false,
      };
    case 'new_chat_reset':
      return {
        ...state,
        selectedConversationId: null,
        composerText: action.composerText,
        isTemporary: action.isTemporary,
        navVisible: false,
        messages: [],
        isReplying: false,
      };
    default:
      return state;
  }
}

interface UseChatShellStoreArgs {
  service?: ChatShellService;
  now?: Date;
  initialState?: Partial<ChatShellStoreState>;
}

export function useChatShellStore({
  service = chatShellService,
  now = new Date(),
  initialState,
}: UseChatShellStoreArgs = {}) {
  const snapshot = useMemo(() => service.getInitialShellData(), [service]);

  const [state, dispatch] = useReducer(reducer, {
    navVisible: false,
    sidePanelVisible: false,
    isTemporary: snapshot.initialTemporaryMode,
    hasCerebrasAccess: true,
    searchQuery: '',
    isChatsExpanded: true,
    selectedConversationId: null,
    activePanel: null,
    composerText: snapshot.initialDraft,
    messages: [],
    isReplying: false,
    ...initialState,
  });

  const filteredConversations = useMemo(() => {
    if (!state.searchQuery.trim()) {
      return snapshot.conversations;
    }

    const lowered = state.searchQuery.toLowerCase();
    return snapshot.conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(lowered),
    );
  }, [state.searchQuery, snapshot.conversations]);

  const groupedConversations = useMemo(
    () => service.groupConversationsByDate(filteredConversations, now),
    [filteredConversations, now, service],
  );

  const greeting = useMemo(
    () => service.getGreeting(now, snapshot.profile.name),
    [now, service, snapshot.profile.name],
  );

  const selectedConversation = useMemo(
    () =>
      snapshot.conversations.find(
        (conversation) => conversation.conversationId === state.selectedConversationId,
      ) ?? null,
    [snapshot.conversations, state.selectedConversationId],
  );

  const headerTitle = selectedConversation?.title ?? t('com_ui_new_chat');
  const canSend = state.composerText.trim().length > 0;

  return {
    state,
    data: {
      versionLabel: snapshot.versionLabel,
      profile: snapshot.profile,
      sideNavActions: snapshot.sideNavActions.filter((action) => action.isAvailable),
      groupedConversations,
      greeting,
      headerTitle,
      canSend,
      selectedConversation,
    },
    actions: {
      toggleNav: () => dispatch({ type: 'toggle_nav' }),
      closeNav: () => dispatch({ type: 'close_nav' }),
      toggleSidePanel: () => dispatch({ type: 'toggle_side_panel' }),
      closeSidePanel: () => dispatch({ type: 'close_side_panel' }),
      setTemporary: (value: boolean) => dispatch({ type: 'set_temporary', value }),
      setCerebrasAccess: (value: boolean) => dispatch({ type: 'set_cerebras_access', value }),
      setSearchQuery: (value: string) => dispatch({ type: 'set_search_query', value }),
      toggleChatsExpanded: () => dispatch({ type: 'toggle_chats_expanded' }),
      selectConversation: (conversationId: string) =>
        dispatch({ type: 'select_conversation', conversationId }),
      setActivePanel: (actionId: SideNavActionId) => dispatch({ type: 'set_active_panel', actionId }),
      setComposerText: (value: string) => dispatch({ type: 'set_composer_text', value }),
      sendMessage: async () => {
        if (state.isReplying) {
          return;
        }

        const text = state.composerText.trim();
        if (!text) {
          return;
        }

        dispatch({ type: 'send_message_start', text });

        try {
          const reply = await service.replyAsNash(text, {
            provider: state.hasCerebrasAccess ? 'cerebras' : 'gpt',
          });
          dispatch({ type: 'send_message_complete', text: reply });
        } catch {
          dispatch({
            type: 'send_message_failed',
            text: 'Nash could not respond right now. Please try again.',
          });
        }
      },
      startNewChat: () => {
        const reset = service.resetDraft();
        dispatch({ type: 'new_chat_reset', ...reset });
      },
    },
  };
}
