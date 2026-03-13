import { ArrowUp, Globe, Lock, Mic, Paperclip, Square } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import { t } from '../localization/clientCopy';

interface ComposerProps {
  value: string;
  canSend: boolean;
  isReplying: boolean;
  isTemporary: boolean;
  hasCerebrasAccess: boolean;
  onChangeText: (value: string) => void;
  onSend: () => void | Promise<void>;
  bottomInset?: number;
}

export function Composer({
  value,
  canSend,
  isReplying,
  isTemporary,
  hasCerebrasAccess,
  onChangeText,
  onSend,
  bottomInset = 0,
}: ComposerProps) {
  return (
    <View className="bg-surface-primary-alt px-0" style={{ paddingBottom: bottomInset }}>
      <View
        className={`rounded-t-[24px] border border-b-0 bg-surface-chat px-4 pb-2 pt-3 ${
          isTemporary ? 'border-brand-purple/60 bg-brand-purple-soft' : 'border-border-light'
        }`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={hasCerebrasAccess ? 'Message Cerebras' : t('com_ui_message_input')}
          placeholderTextColor="#595959"
          className="min-h-9 text-base text-text-primary"
          multiline
          testID="composer-input"
        />

        <View className="mt-2 flex flex-row items-center justify-between">
          <View className="flex flex-row items-center gap-2">
            <Pressable className="h-9 w-9 items-center justify-center rounded-full">
              <Paperclip color="#212121" size={18} strokeWidth={2} />
            </Pressable>
            <Pressable className="h-9 w-9 items-center justify-center rounded-full border border-border-light bg-surface-primary">
              <Globe color="#212121" size={18} strokeWidth={2} />
            </Pressable>
            <Pressable className="h-8 flex-row items-center rounded-full border border-border-light bg-surface-primary px-3">
              <Lock color="#595959" size={13} strokeWidth={2} />
              <Text className="ml-1 text-xs font-semibold text-text-secondary">{t('com_ui_memory')}</Text>
            </Pressable>
          </View>

          <View className="flex flex-row items-center gap-2">
            <Pressable className="h-9 w-9 items-center justify-center rounded-full">
              <Mic color="#212121" size={19} strokeWidth={2} />
            </Pressable>
            <Pressable
              className={`h-9 w-9 items-center justify-center rounded-full ${
                canSend || isReplying ? 'bg-text-primary' : 'bg-surface-hover'
              }`}
              disabled={(!canSend && !isReplying) || isReplying}
              onPress={onSend}
              accessibilityState={{ disabled: (!canSend && !isReplying) || isReplying }}
              testID="composer-send-button"
            >
              {isReplying ? (
                <Square color="#ffffff" size={14} fill="#ffffff" strokeWidth={2} />
              ) : (
                <ArrowUp color={canSend ? '#ffffff' : '#9e9ea3'} size={18} strokeWidth={2} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
