import { Pressable, Text, TextInput, View } from 'react-native';

import { t } from '../localization/clientCopy';

interface ComposerProps {
  value: string;
  canSend: boolean;
  isTemporary: boolean;
  onChangeText: (value: string) => void;
}

export function Composer({ value, canSend, isTemporary, onChangeText }: ComposerProps) {
  return (
    <View className="bg-surface-primary-alt px-2 pb-2">
      <View
        className={`rounded-3xl border bg-surface-chat px-4 pb-2 pt-3 ${
          isTemporary ? 'border-brand-purple/60 bg-brand-purple-soft' : 'border-border-light'
        }`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={t('com_ui_message_input')}
          placeholderTextColor="#595959"
          className="min-h-9 text-base text-text-primary"
          multiline
          testID="composer-input"
        />

        <View className="mt-2 flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-2">
            <Pressable className="h-8 w-8 items-center justify-center rounded-full border border-border-light bg-surface-primary">
              <Text className="text-base text-text-primary">◖</Text>
            </Pressable>
            <Pressable className="h-8 rounded-full border border-border-light bg-surface-primary px-3">
              <Text className="pt-1 text-xs font-semibold text-text-primary">◍ {t('com_ui_memory')}</Text>
            </Pressable>
          </View>

          <View className="flex flex-row items-center gap-2">
            <Pressable className="h-8 w-8 items-center justify-center rounded-full border border-border-light bg-surface-primary">
              <Text className="text-base text-text-primary">◉</Text>
            </Pressable>
            <Pressable
              className={`h-8 w-8 items-center justify-center rounded-full ${
                canSend ? 'bg-text-primary' : 'bg-surface-hover'
              }`}
              disabled={!canSend}
              accessibilityState={{ disabled: !canSend }}
              testID="composer-send-button"
            >
              <Text className={`text-base ${canSend ? 'text-white' : 'text-text-tertiary'}`}>↑</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
