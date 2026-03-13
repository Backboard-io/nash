import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionRow } from '../components/ActionRow';
import { Composer } from '../components/Composer';
import { LandingGreeting } from '../components/LandingGreeting';
import { LeftDrawer } from '../components/LeftDrawer';
import { RightPanel } from '../components/RightPanel';
import { TopBar } from '../components/TopBar';
import { chatShellService } from '../services/chatShellService';
import { useChatShellStore } from '../store/useChatShellStore';
import type { ChatShellService, ChatShellStoreState } from '../types/chatShell';

interface ChatShellScreenProps {
  service?: ChatShellService;
  now?: Date;
  initialState?: Partial<ChatShellStoreState>;
}

export function ChatShellScreen({
  service = chatShellService,
  now,
  initialState,
}: ChatShellScreenProps) {
  const { state, data, actions } = useChatShellStore({
    service,
    now,
    initialState,
  });

  return (
    <SafeAreaView className="flex-1 bg-surface-primary-alt">
      <StatusBar style="dark" />

      <View className="flex-1 bg-surface-primary-alt">
        <TopBar
          title={data.headerTitle}
          versionLabel={data.versionLabel}
          navVisible={state.navVisible}
          onToggleNav={actions.toggleNav}
          onNewChat={actions.startNewChat}
        />

        <ActionRow
          isTemporary={state.isTemporary}
          onToggleTemporary={() => actions.setTemporary(!state.isTemporary)}
        />

        <LandingGreeting greeting={data.greeting.text} />

        <Composer
          value={state.composerText}
          canSend={data.canSend}
          isTemporary={state.isTemporary}
          onChangeText={actions.setComposerText}
        />

        <LeftDrawer
          visible={state.navVisible}
          groupedConversations={data.groupedConversations}
          selectedConversationId={state.selectedConversationId}
          searchQuery={state.searchQuery}
          isChatsExpanded={state.isChatsExpanded}
          profile={data.profile}
          onSearchQueryChange={actions.setSearchQuery}
          onToggleChats={actions.toggleChatsExpanded}
          onSelectConversation={actions.selectConversation}
          onClose={actions.closeNav}
        />

        <RightPanel
          visible={state.sidePanelVisible}
          actions={data.sideNavActions}
          activePanel={state.activePanel}
          onToggleVisible={actions.toggleSidePanel}
          onClose={actions.closeSidePanel}
          onSelectAction={actions.setActivePanel}
        />
      </View>
    </SafeAreaView>
  );
}
