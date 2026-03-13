import type { ClientCopyKey } from '../localization/clientCopy';

export interface ConversationItem {
  conversationId: string;
  title: string;
  updatedAt: string;
  endpoint: string;
}

export type GroupedConversations = Array<[string, ConversationItem[]]>;

export type SideNavActionId =
  | 'agents'
  | 'prompts'
  | 'chat-assistant-prompt'
  | 'memories'
  | 'files'
  | 'bookmarks'
  | 'mcp-builder'
  | 'hide-panel';

export interface SideNavAction {
  id: SideNavActionId;
  titleKey: ClientCopyKey;
  iconToken: string;
  isAvailable: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  plan: 'FREE' | 'PLUS' | 'UNL';
}

export interface GreetingResult {
  period: 'late_night' | 'morning' | 'afternoon' | 'evening';
  text: string;
}

export interface ChatShellSnapshot {
  versionLabel: string;
  profile: UserProfile;
  conversations: ConversationItem[];
  sideNavActions: SideNavAction[];
  initialDraft: string;
  initialTemporaryMode: boolean;
}

export interface ChatShellStoreState {
  navVisible: boolean;
  sidePanelVisible: boolean;
  isTemporary: boolean;
  searchQuery: string;
  isChatsExpanded: boolean;
  selectedConversationId: string | null;
  activePanel: SideNavActionId | null;
  composerText: string;
}

export interface ChatShellService {
  getInitialShellData(): ChatShellSnapshot;
  getGreeting(date: Date, userName?: string): GreetingResult;
  groupConversationsByDate(conversations: ConversationItem[], now?: Date): GroupedConversations;
  resetDraft(): { composerText: string; isTemporary: boolean };
}
