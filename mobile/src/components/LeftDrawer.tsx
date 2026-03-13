import { Pressable, Text, TextInput, View } from 'react-native';

import { t } from '../localization/clientCopy';
import type { GroupedConversations, UserProfile } from '../types/chatShell';

interface LeftDrawerProps {
  visible: boolean;
  groupedConversations: GroupedConversations;
  selectedConversationId: string | null;
  searchQuery: string;
  isChatsExpanded: boolean;
  profile: UserProfile;
  onSearchQueryChange: (value: string) => void;
  onToggleChats: () => void;
  onSelectConversation: (conversationId: string) => void;
  onClose: () => void;
}

export function LeftDrawer({
  visible,
  groupedConversations,
  selectedConversationId,
  searchQuery,
  isChatsExpanded,
  profile,
  onSearchQueryChange,
  onToggleChats,
  onSelectConversation,
  onClose,
}: LeftDrawerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-20 flex-row" pointerEvents="box-none">
      <Pressable className="absolute inset-0 bg-overlay-mask" onPress={onClose} testID="left-drawer-overlay" />

      <View className="h-full w-[82%] border-r border-border-light bg-surface-primary-alt px-4 pb-4 pt-4" testID="left-drawer">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl text-text-primary">☰</Text>
          <Text className="text-xl text-text-primary">⌖</Text>
          <Text className="text-xl text-text-primary">✎</Text>
        </View>

        <View className="rounded-lg border border-border-light bg-surface-primary px-3 py-2">
          <TextInput
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder={t('com_nav_search_placeholder')}
            placeholderTextColor="#595959"
            className="text-sm text-text-primary"
            testID="drawer-search-input"
          />
        </View>

        <View className="mt-4">
          <Text className="text-base font-medium text-text-primary">◫ Persona Marketplace</Text>
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
            {t('com_folder_folders')}
          </Text>
          <Text className="text-lg text-text-tertiary">+</Text>
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-text-primary">{t('com_ui_chats')}</Text>
          <Pressable onPress={onToggleChats} testID="toggle-chats-expanded">
            <Text className="text-sm text-text-tertiary">{isChatsExpanded ? '⌃' : '⌄'}</Text>
          </Pressable>
        </View>

        {isChatsExpanded && (
          <View className="mt-2 flex-1">
            {groupedConversations.map(([groupName, conversations]) => (
              <View key={groupName} className="mb-3">
                <Text className="mb-1 text-xs text-text-tertiary">{groupName}</Text>
                {conversations.map((conversation) => {
                  const selected = selectedConversationId === conversation.conversationId;
                  return (
                    <Pressable
                      key={conversation.conversationId}
                      onPress={() => onSelectConversation(conversation.conversationId)}
                      className={`rounded-md px-2 py-2 ${selected ? 'bg-surface-hover' : ''}`}
                      testID={`conversation-item-${conversation.conversationId}`}
                    >
                      <Text className="text-sm text-text-primary">⚙ {conversation.title}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View className="mt-2 flex-row items-center border-t border-border-light pt-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-[#8c7521]">
            <Text className="text-xs font-bold text-white">{profile.initials}</Text>
          </View>
          <Text className="ml-2 flex-1 text-sm text-text-primary">{profile.name}</Text>
          <View className="rounded-full border border-border-light px-2 py-0.5">
            <Text className="text-xxs font-bold text-text-tertiary">{profile.plan}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
