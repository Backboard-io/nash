import { t } from '../localization/clientCopy';
import type {
  ChatShellService,
  ChatShellSnapshot,
  ConversationItem,
  GroupedConversations,
  GreetingResult,
} from '../types/chatShell';

const monthKeyByIndex = [
  'com_ui_date_january',
  'com_ui_date_february',
  'com_ui_date_march',
  'com_ui_date_april',
  'com_ui_date_may',
  'com_ui_date_june',
  'com_ui_date_july',
  'com_ui_date_august',
  'com_ui_date_september',
  'com_ui_date_october',
  'com_ui_date_november',
  'com_ui_date_december',
] as const;

const dayMs = 24 * 60 * 60 * 1000;

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function dayDiff(dateA: Date, dateB: Date): number {
  const a = normalizeDate(dateA).getTime();
  const b = normalizeDate(dateB).getTime();
  return Math.floor((a - b) / dayMs);
}

function getGroupName(date: Date, now: Date): string {
  const diff = dayDiff(now, date);

  if (diff <= 0) {
    return t('com_ui_date_today');
  }
  if (diff === 1) {
    return t('com_ui_date_yesterday');
  }
  if (diff <= 7) {
    return t('com_ui_date_previous_7_days');
  }
  if (diff <= 30) {
    return t('com_ui_date_previous_30_days');
  }
  if (date.getFullYear() === now.getFullYear()) {
    return t(monthKeyByIndex[date.getMonth()]);
  }

  return ` ${date.getFullYear()}`;
}

function sortGroupNames(groupA: string, groupB: string): number {
  const order = [
    t('com_ui_date_today'),
    t('com_ui_date_yesterday'),
    t('com_ui_date_previous_7_days'),
    t('com_ui_date_previous_30_days'),
  ];

  const indexA = order.indexOf(groupA);
  const indexB = order.indexOf(groupB);

  if (indexA !== -1 || indexB !== -1) {
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  }

  const yearA = Number(groupA.trim());
  const yearB = Number(groupB.trim());

  if (!Number.isNaN(yearA) && !Number.isNaN(yearB)) {
    return yearB - yearA;
  }

  const monthIndexA = monthKeyByIndex.findIndex((key) => t(key) === groupA);
  const monthIndexB = monthKeyByIndex.findIndex((key) => t(key) === groupB);

  return monthIndexB - monthIndexA;
}

const mockSnapshot: ChatShellSnapshot = {
  versionLabel: 'v2.14.25',
  profile: {
    id: 'user_erin',
    name: 'Erin Tomorri',
    initials: 'ET',
    plan: 'FREE',
  },
  conversations: [
    {
      conversationId: 'conv_1',
      title: 'Testing: Initiating Dialogue',
      updatedAt: '2026-03-12T16:15:00.000Z',
      endpoint: 'agents',
    },
    {
      conversationId: 'conv_2',
      title: 'Persona ideation checklist',
      updatedAt: '2026-03-10T10:20:00.000Z',
      endpoint: 'agents',
    },
    {
      conversationId: 'conv_3',
      title: 'Backboard setup notes',
      updatedAt: '2026-02-24T09:05:00.000Z',
      endpoint: 'openai',
    },
  ],
  sideNavActions: [
    {
      id: 'agents',
      titleKey: 'com_sidepanel_agent_builder',
      iconToken: 'blocks',
      isAvailable: true,
    },
    {
      id: 'prompts',
      titleKey: 'com_ui_prompts',
      iconToken: 'quote',
      isAvailable: true,
    },
    {
      id: 'chat-assistant-prompt',
      titleKey: 'com_sidepanel_chat_assistant_prompt',
      iconToken: 'message',
      isAvailable: true,
    },
    {
      id: 'memories',
      titleKey: 'com_ui_memories',
      iconToken: 'database',
      isAvailable: true,
    },
    {
      id: 'files',
      titleKey: 'com_sidepanel_attach_files',
      iconToken: 'paperclip',
      isAvailable: true,
    },
    {
      id: 'bookmarks',
      titleKey: 'com_sidepanel_conversation_tags',
      iconToken: 'bookmark',
      isAvailable: true,
    },
    {
      id: 'mcp-builder',
      titleKey: 'com_nav_setting_mcp',
      iconToken: 'mcp',
      isAvailable: true,
    },
    {
      id: 'hide-panel',
      titleKey: 'com_sidepanel_hide_panel',
      iconToken: 'arrow-right',
      isAvailable: true,
    },
  ],
  initialDraft: '',
  initialTemporaryMode: false,
};

export const chatShellService: ChatShellService = {
  getInitialShellData() {
    return {
      ...mockSnapshot,
      profile: { ...mockSnapshot.profile },
      conversations: [...mockSnapshot.conversations],
      sideNavActions: [...mockSnapshot.sideNavActions],
    };
  },
  getGreeting(date: Date, userName = ''): GreetingResult {
    const hours = date.getHours();
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let base = t('com_ui_good_evening');
    let period: GreetingResult['period'] = 'evening';

    if (hours < 5) {
      base = t('com_ui_late_night');
      period = 'late_night';
    } else if (hours < 12) {
      base = isWeekend ? t('com_ui_weekend_morning') : t('com_ui_good_morning');
      period = 'morning';
    } else if (hours < 17) {
      base = t('com_ui_good_afternoon');
      period = 'afternoon';
    }

    return {
      period,
      text: userName ? `${base}, ${userName}` : base,
    };
  },
  groupConversationsByDate(conversations: ConversationItem[], now = new Date()): GroupedConversations {
    const groups = new Map<string, ConversationItem[]>();
    const seen = new Set<string>();

    conversations.forEach((conversation) => {
      if (seen.has(conversation.conversationId)) {
        return;
      }
      seen.add(conversation.conversationId);
      const date = new Date(conversation.updatedAt);
      const groupName = getGroupName(date, now);
      const groupItems = groups.get(groupName) ?? [];
      groupItems.push(conversation);
      groups.set(groupName, groupItems);
    });

    return Array.from(groups.entries())
      .sort(([groupA], [groupB]) => sortGroupNames(groupA, groupB))
      .map(([groupName, groupItems]) => [
        groupName,
        groupItems.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      ]);
  },
  resetDraft() {
    return {
      composerText: '',
      isTemporary: false,
    };
  },
  async replyAsNash(input: string, options) {
    const normalized = input.trim();
    const provider = options?.provider ?? 'gpt';

    if (!normalized) {
      return 'Share a bit more detail and I can help.';
    }

    if (provider === 'cerebras') {
      return `Something went wrong. Here's the specific error message we encountered: "<!doctype html>\n<html lang=en>\n<title>500 Internal Server Error</title>\n<h1>Internal Server Error</h1>\n<p>The server encountered an internal error and was unable to complete your request. Either the server is overloaded or there is an error in the application.</p>\n"`;
    }

    if (/(^|\s)(hi|hello|hey)(\s|$)/i.test(normalized)) {
      return 'Hey Erin, Nash here. What do you want to build next?';
    }

    if (/cerebras/i.test(normalized)) {
      return 'Cerebras is enabled. Send your prompt and I can route it there.';
    }

    return `Nash: got it — "${normalized}". Want me to turn this into an action plan?`;
  },
};
