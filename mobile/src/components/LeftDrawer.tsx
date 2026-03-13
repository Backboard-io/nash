import {
  Bookmark,
  BriefcaseBusiness,
  ChevronUp,
  Grid2x2,
  Menu,
  Plus,
  Search,
  SquarePen,
} from 'lucide-react-native';
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
  topInset?: number;
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
  topInset = 0,
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

      <View
        className="h-full w-[82%] border-r border-border-light bg-surface-primary-alt px-4 pb-4"
        style={{ paddingTop: topInset + 12 }}
        testID="left-drawer"
      >
        <View className="mb-2 flex-row items-center justify-between">
          <Pressable className="h-10 w-10 items-center justify-center rounded-xl" onPress={onClose}>
            <Menu color="#212121" size={20} strokeWidth={2} />
          </Pressable>
          <Pressable className="h-10 w-10 items-center justify-center rounded-xl">
            <Bookmark color="#212121" size={19} strokeWidth={2} />
          </Pressable>
          <Pressable className="h-10 w-10 items-center justify-center rounded-xl bg-surface-hover">
            <SquarePen color="#212121" size={19} strokeWidth={2} />
          </Pressable>
        </View>

        <View className="mt-1 flex-row items-center gap-2 px-1 py-2">
          <Search color="#424242" size={16} strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder={t('com_nav_search_placeholder')}
            placeholderTextColor="#595959"
            className="flex-1 text-base text-text-primary"
            testID="drawer-search-input"
          />
        </View>

        <View className="mt-3 flex-row items-center gap-2 px-1">
          <Grid2x2 color="#212121" size={17} strokeWidth={2} />
          <Text className="text-base font-medium text-text-primary">Persona Marketplace</Text>
        </View>

        <View className="mt-8 flex-row items-center justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
            {t('com_folder_folders')}
          </Text>
          <Plus color="#595959" size={16} strokeWidth={2} />
        </View>

        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-base font-bold text-text-primary">{t('com_ui_chats')}</Text>
          <Pressable onPress={onToggleChats} testID="toggle-chats-expanded">
            <ChevronUp
              color="#595959"
              size={14}
              strokeWidth={2}
              style={!isChatsExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
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
                      <View className="flex-row items-center gap-2">
                        <BriefcaseBusiness color="#595959" size={14} strokeWidth={2} />
                        <Text className="text-sm text-text-primary">{conversation.title}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View className="mt-auto flex-row items-center pt-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-[#8c7521]">
            <Text className="text-xs font-bold text-white">{profile.initials}</Text>
          </View>
          <Text className="ml-2 flex-1 text-base text-text-primary">{profile.name}</Text>
          <View className="rounded-full bg-surface-secondary px-2 py-0.5">
            <Text className="text-xxs font-bold text-text-tertiary">{profile.plan}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
