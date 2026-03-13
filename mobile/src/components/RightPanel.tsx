import { Pressable, Text, View } from 'react-native';

import { t } from '../localization/clientCopy';
import { tokenAdapter } from '../theme/tokenAdapter';
import type { SideNavAction, SideNavActionId } from '../types/chatShell';

interface RightPanelProps {
  visible: boolean;
  actions: SideNavAction[];
  activePanel: SideNavActionId | null;
  onToggleVisible: () => void;
  onClose: () => void;
  onSelectAction: (actionId: SideNavActionId) => void;
}

export function RightPanel({
  visible,
  actions,
  activePanel,
  onToggleVisible,
  onClose,
  onSelectAction,
}: RightPanelProps) {
  return (
    <View className="absolute inset-0 z-30" pointerEvents="box-none">
      <View
        className="absolute top-20 h-[74px] w-[54px] items-center justify-center rounded-l-md border border-r-0 border-border-light bg-surface-primary/80"
        style={{ right: visible ? '86%' : 0 }}
      >
        <Pressable className="h-10 w-10 items-center justify-center rounded-full border border-border-light bg-surface-primary" onPress={onToggleVisible} testID="right-rail-toggle">
          <Text className="text-base text-text-primary">{visible ? '〈' : '〉'}</Text>
        </Pressable>
      </View>

      {visible && (
        <>
          <Pressable
            className="absolute inset-0"
            style={{ backgroundColor: tokenAdapter.colors.overlayMask }}
            onPress={onClose}
            testID="right-panel-overlay"
          />
          <View className="ml-[14%] h-full border-l border-border-light bg-surface-primary-alt p-4" testID="right-panel">
            {actions.map((action) => {
              const isActive = activePanel === action.id;
              return (
                <Pressable
                  key={action.id}
                  onPress={() => onSelectAction(action.id)}
                  className={`mb-2 min-h-11 justify-center rounded-xl border px-4 ${
                    isActive ? 'border-ring-primary bg-surface-secondary' : 'border-border-light bg-surface-primary'
                  }`}
                  testID={`panel-action-${action.id}`}
                >
                  <Text className="text-sm font-semibold text-text-primary">{t(action.titleKey)}</Text>
                </Pressable>
              );
            })}

            <View className="mt-2 rounded-2xl border border-border-light bg-surface-secondary p-4">
              <Text className="text-xs font-bold text-text-primary">Built on Backboard.io</Text>
              <Text className="mt-2 text-lg font-semibold text-text-primary">Enterprise workspace setup</Text>
              <Text className="mt-2 text-xs leading-5 text-text-secondary">
                Get custom guardrails, team controls, and a setup tailored to your company.
              </Text>
              <Text className="mt-1 text-xs leading-5 text-text-secondary">
                Our team can help you integrate Backboard.io into your AI stack.
              </Text>
              <Pressable className="mt-3 min-h-11 items-center justify-center rounded-xl border border-border-light bg-surface-primary">
                <Text className="text-sm font-bold text-text-primary">Get started! ↗</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
