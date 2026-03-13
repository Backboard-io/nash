import {
  BriefcaseBusiness,
  ChevronDown,
  CircleDashed,
  CirclePlus,
  Copy,
  Gift,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { t } from '../localization/clientCopy';

interface ActionRowProps {
  isTemporary: boolean;
  hasCerebrasAccess: boolean;
  modelMenuVisible: boolean;
  onToggleModelMenu: () => void;
  onToggleTemporary: () => void;
  onToggleCerebrasAccess: () => void;
}

export function ActionRow({
  isTemporary,
  hasCerebrasAccess,
  modelMenuVisible,
  onToggleModelMenu,
  onToggleTemporary,
  onToggleCerebrasAccess,
}: ActionRowProps) {
  return (
    <View className="flex flex-row items-center gap-2 px-3 pt-2">
      <Pressable
        className="h-10 min-w-[112px] max-w-[160px] flex-row items-center justify-center gap-2 rounded-xl border border-border-light bg-surface-primary px-3 py-2"
        onPress={onToggleModelMenu}
        testID="model-trigger"
      >
        <BriefcaseBusiness color="#212121" size={16} strokeWidth={2} />
        <Text className="text-sm font-semibold text-text-primary">{t('com_ui_model')}</Text>
        <ChevronDown
          color="#424242"
          size={16}
          strokeWidth={2}
          style={modelMenuVisible ? { transform: [{ rotate: '180deg' }] } : undefined}
        />
      </Pressable>

      <Pressable className="h-10 flex-row items-center justify-center gap-2 rounded-xl border border-border-light bg-brand-purple-soft px-3">
        <Gift color="#ab68ff" size={16} strokeWidth={2} />
        <View className="rounded-full bg-[#eee3ff] px-2 py-0.5">
          <Text className="text-xs font-semibold text-brand-purple">$5</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onToggleTemporary}
        className={`h-10 w-10 items-center justify-center rounded-xl border bg-surface-primary ${
          isTemporary ? 'border-brand-purple' : 'border-border-light'
        }`}
        testID="temporary-toggle"
      >
        <CircleDashed
          color={isTemporary ? '#ab68ff' : '#212121'}
          size={17}
          strokeWidth={2}
        />
      </Pressable>

      <Pressable className="h-10 w-10 items-center justify-center rounded-xl border border-border-light bg-surface-primary">
        <Copy color="#212121" size={17} strokeWidth={2} />
      </Pressable>

      <Pressable
        className={`h-10 w-10 items-center justify-center rounded-xl border border-border-light ${
          hasCerebrasAccess ? 'bg-surface-hover' : 'bg-surface-primary'
        }`}
        onPress={onToggleCerebrasAccess}
        testID="cerebras-access-toggle"
      >
        <CirclePlus color="#212121" size={18} strokeWidth={2} />
      </Pressable>
    </View>
  );
}
