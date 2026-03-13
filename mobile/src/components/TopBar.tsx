import { Menu, SquarePen } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { t } from '../localization/clientCopy';

interface TopBarProps {
  title: string;
  versionLabel: string;
  navVisible: boolean;
  onToggleNav: () => void;
  onNewChat: () => void;
}

export function TopBar({ title, versionLabel, navVisible, onToggleNav, onNewChat }: TopBarProps) {
  const normalizedVersion = versionLabel.toUpperCase();

  return (
    <View className="z-10 flex min-h-[40px] flex-row items-center justify-center bg-presentation px-1">
      <Pressable
        onPress={onToggleNav}
        className="m-1 inline-flex h-10 w-10 items-center justify-center rounded-xl"
        accessibilityLabel={navVisible ? t('com_nav_close_sidebar') : t('com_nav_open_sidebar')}
        testID="menu-toggle"
      >
        <Menu color="#212121" size={20} strokeWidth={2} />
      </Pressable>

      <View className="flex flex-1 flex-row items-center justify-center gap-2 overflow-hidden px-2">
        <Text className="min-w-0 flex-shrink text-center text-sm text-text-primary" numberOfLines={1}>
          {title}
        </Text>
        <View className="rounded-full border border-border-light bg-surface-secondary px-2 py-0.5">
          <Text className="text-xxs font-medium uppercase tracking-wide text-text-secondary">
            {normalizedVersion}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onNewChat}
        className="m-1 inline-flex h-10 w-10 items-center justify-center rounded-xl"
        accessibilityLabel={t('com_ui_new_chat')}
        testID="new-chat-button"
      >
        <SquarePen color="#212121" size={20} strokeWidth={2} />
      </Pressable>
    </View>
  );
}
