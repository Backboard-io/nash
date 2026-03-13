import { Pressable, Text, View } from 'react-native';

import { t } from '../localization/clientCopy';

interface ActionRowProps {
  isTemporary: boolean;
  onToggleTemporary: () => void;
}

export function ActionRow({ isTemporary, onToggleTemporary }: ActionRowProps) {
  return (
    <View className="flex flex-row items-center gap-2 px-4 pt-2">
      <Pressable className="h-10 rounded-xl border border-border-light bg-surface-primary px-4">
        <Text className="pt-2 text-sm font-medium text-text-primary">◻ {t('com_ui_model')}</Text>
      </Pressable>

      <Pressable className="h-10 rounded-xl border border-border-light bg-brand-purple-soft px-4">
        <Text className="pt-2 text-sm font-semibold text-brand-purple">⌁ $5</Text>
      </Pressable>

      <Pressable
        onPress={onToggleTemporary}
        className={`h-10 w-10 items-center justify-center rounded-xl border bg-surface-primary ${
          isTemporary ? 'border-brand-purple' : 'border-border-light'
        }`}
        testID="temporary-toggle"
      >
        <Text className={`text-base ${isTemporary ? 'text-brand-purple' : 'text-text-primary'}`}>
          ◌
        </Text>
      </Pressable>

      <Pressable className="h-10 w-10 items-center justify-center rounded-xl border border-border-light bg-surface-primary">
        <Text className="text-base text-text-primary">⇪</Text>
      </Pressable>

      <Pressable className="h-10 w-10 items-center justify-center rounded-xl border border-border-light bg-surface-primary">
        <Text className="text-base text-text-primary">⌑</Text>
      </Pressable>
    </View>
  );
}
