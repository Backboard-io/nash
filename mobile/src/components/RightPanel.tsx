import {
  ArrowRightToLine,
  ArrowUpRight,
  Blocks,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Database,
  MessageSquare,
  MessageSquareQuote,
  Paperclip,
  Sparkles,
  Building2,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { t } from '../localization/clientCopy';
import { tokenAdapter } from '../theme/tokenAdapter';
import type { SideNavAction, SideNavActionId } from '../types/chatShell';

interface RightPanelProps {
  visible: boolean;
  actions: SideNavAction[];
  activePanel: SideNavActionId | null;
  topInset?: number;
  onToggleVisible: () => void;
  onClose: () => void;
  onSelectAction: (actionId: SideNavActionId) => void;
}

function ActionIcon({ id, color = '#212121' }: { id: SideNavActionId; color?: string }) {
  if (id === 'agents') {
    return <Blocks color={color} size={16} strokeWidth={2} />;
  }
  if (id === 'prompts') {
    return <MessageSquareQuote color={color} size={16} strokeWidth={2} />;
  }
  if (id === 'chat-assistant-prompt') {
    return <MessageSquare color={color} size={16} strokeWidth={2} />;
  }
  if (id === 'memories') {
    return <Database color={color} size={16} strokeWidth={2} />;
  }
  if (id === 'files') {
    return <Paperclip color={color} size={16} strokeWidth={2} />;
  }
  if (id === 'bookmarks') {
    return <Bookmark color={color} size={16} strokeWidth={2} />;
  }
  if (id === 'mcp-builder') {
    return <Sparkles color={color} size={16} strokeWidth={2} />;
  }
  return <ArrowRightToLine color={color} size={16} strokeWidth={2} />;
}

export function RightPanel({
  visible,
  actions,
  activePanel,
  topInset = 0,
  onToggleVisible,
  onClose,
  onSelectAction,
}: RightPanelProps) {
  return (
    <View className="absolute inset-0 z-30" pointerEvents="box-none">
      <View
        className="absolute top-1/2 h-16 w-6 items-center justify-center"
        style={{ marginTop: -32, right: visible ? '84%' : 2 }}
      >
        <Pressable
          className="h-16 w-6 items-center justify-center"
          onPress={onToggleVisible}
          testID="right-rail-toggle"
        >
          {visible ? (
            <ChevronRight color="#b2b2b6" size={18} strokeWidth={3} />
          ) : (
            <ChevronLeft color="#b2b2b6" size={18} strokeWidth={3} />
          )}
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
          <View
            className="absolute bottom-0 right-0 top-0 w-[84%] border-l border-border-light bg-surface-primary-alt px-4 pb-4"
            style={{ paddingTop: topInset + 16 }}
            testID="right-panel"
          >
            {actions.map((action) => {
              return (
                <Pressable
                  key={action.id}
                  onPress={() => onSelectAction(action.id)}
                  className="mb-2 min-h-11 flex-row items-center rounded-xl border border-border-light bg-surface-primary px-4"
                  testID={`panel-action-${action.id}`}
                >
                  <ActionIcon id={action.id} color="#212121" />
                  <Text className="ml-3 text-base font-semibold text-text-primary">
                    {t(action.titleKey)}
                  </Text>
                </Pressable>
              );
            })}

            <View className="mt-2 rounded-2xl border border-border-light bg-surface-secondary p-4">
              <View className="flex-row items-center gap-2">
                <Building2 color="#212121" size={14} strokeWidth={2} />
                <Text className="text-xs font-bold text-text-primary">Built on Backboard.io</Text>
              </View>
              <Text className="mt-3 text-base font-semibold text-text-primary">
                Enterprise workspace setup
              </Text>
              <Text className="mt-2 text-xs leading-5 text-text-secondary">
                Get custom guardrails, team controls, and a setup tailored to your company.
              </Text>
              <Text className="mt-1 text-xs leading-5 text-text-secondary">
                Our team can help you integrate Backboard.io into your AI stack.
              </Text>
              <Pressable className="mt-3 min-h-11 flex-row items-center justify-center rounded-xl border border-border-light bg-surface-primary">
                <Text className="text-sm font-bold text-text-primary">Get started!</Text>
                <ArrowUpRight color="#212121" size={14} strokeWidth={2} />
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}
