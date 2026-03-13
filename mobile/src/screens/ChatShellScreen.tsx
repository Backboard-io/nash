import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionRow } from '../components/ActionRow';
import { Composer } from '../components/Composer';
import { ConversationFeed } from '../components/ConversationFeed';
import { LeftDrawer } from '../components/LeftDrawer';
import { ModelMenu } from '../components/ModelMenu';
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
  const [modelMenuVisible, setModelMenuVisible] = useState(false);
  const [modelSearchValue, setModelSearchValue] = useState('');
  const insets = useSafeAreaInsets();

  const { state, data, actions } = useChatShellStore({
    service,
    now,
    initialState,
  });

  useEffect(() => {
    if (state.navVisible || state.sidePanelVisible) {
      setModelMenuVisible(false);
    }
  }, [state.navVisible, state.sidePanelVisible]);

  return (
    <View className="flex-1 bg-presentation" style={{ backgroundColor: '#ffffff' }}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />

      <View
        className="flex-1 bg-presentation"
        style={{ backgroundColor: '#ffffff', paddingTop: insets.top }}
      >
        <TopBar
          title={data.headerTitle}
          versionLabel={data.versionLabel}
          navVisible={state.navVisible}
          onToggleNav={actions.toggleNav}
          onNewChat={actions.startNewChat}
        />

        <ActionRow
          isTemporary={state.isTemporary}
          hasCerebrasAccess={state.hasCerebrasAccess}
          modelMenuVisible={modelMenuVisible}
          onToggleModelMenu={() => setModelMenuVisible((prev) => !prev)}
          onToggleTemporary={() => actions.setTemporary(!state.isTemporary)}
          onToggleCerebrasAccess={() => actions.setCerebrasAccess(!state.hasCerebrasAccess)}
        />

        <ModelMenu
          visible={modelMenuVisible}
          searchValue={modelSearchValue}
          onSearchChange={setModelSearchValue}
          onClose={() => setModelMenuVisible(false)}
        />

        <ConversationFeed
          greeting={data.greeting.text}
          profile={data.profile}
          messages={state.messages}
          isReplying={state.isReplying}
        />

        <Composer
          value={state.composerText}
          canSend={data.canSend}
          isReplying={state.isReplying}
          isTemporary={state.isTemporary}
          hasCerebrasAccess={state.hasCerebrasAccess}
          onChangeText={actions.setComposerText}
          onSend={actions.sendMessage}
          bottomInset={insets.bottom}
        />
      </View>

      <LeftDrawer
        visible={state.navVisible}
        groupedConversations={data.groupedConversations}
        selectedConversationId={state.selectedConversationId}
        searchQuery={state.searchQuery}
        isChatsExpanded={state.isChatsExpanded}
        profile={data.profile}
        topInset={insets.top}
        onSearchQueryChange={actions.setSearchQuery}
        onToggleChats={actions.toggleChatsExpanded}
        onSelectConversation={actions.selectConversation}
        onClose={actions.closeNav}
      />

      <RightPanel
        visible={state.sidePanelVisible}
        actions={data.sideNavActions}
        activePanel={state.activePanel}
        topInset={insets.top}
        onToggleVisible={actions.toggleSidePanel}
        onClose={actions.closeSidePanel}
        onSelectAction={actions.setActivePanel}
      />
    </View>
  );
}
