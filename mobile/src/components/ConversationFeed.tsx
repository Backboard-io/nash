import { Bot, Copy, PencilLine, RefreshCcw, Share2 } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import type { ChatMessage, UserProfile } from '../types/chatShell';
import { LandingGreeting } from './LandingGreeting';

interface ConversationFeedProps {
  greeting: string;
  profile: UserProfile;
  messages: ChatMessage[];
  isReplying: boolean;
}

export function ConversationFeed({
  greeting,
  profile,
  messages,
  isReplying,
}: ConversationFeedProps) {
  if (!messages.length && !isReplying) {
    return <LandingGreeting greeting={greeting} />;
  }

  return (
    <ScrollView
      className="flex-1 px-4 pt-3"
      contentContainerStyle={{ paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
    >
      {messages.map((message) => {
        if (message.role === 'user') {
          return (
            <View key={message.id} className="mb-5">
              <View className="flex-row items-center gap-2">
                <View className="h-6 w-6 items-center justify-center rounded-full bg-[#8c7521]">
                  <Text className="text-[10px] font-semibold text-white">{profile.initials}</Text>
                </View>
                <Text className="text-[34px] font-semibold text-text-primary">{profile.name}</Text>
              </View>
              <Text className="ml-8 mt-1 text-[17px] text-text-primary">{message.text}</Text>
              <View className="ml-8 mt-3 flex-row items-center gap-4">
                <Copy color="#5a5a5f" size={16} strokeWidth={2} />
                <PencilLine color="#5a5a5f" size={16} strokeWidth={2} />
                <Share2 color="#5a5a5f" size={16} strokeWidth={2} />
              </View>
            </View>
          );
        }

        const isErrorMessage =
          message.text.includes('Something went wrong') || message.text.includes('Internal Server Error');

        return (
          <View key={message.id} className="mb-4 ml-8">
            <Text className="text-[34px] font-semibold text-text-primary">Nash</Text>
            {isErrorMessage ? (
              <View className="mt-2 rounded-2xl border border-[#f0c7c4] bg-[#fdf1f1] px-3 py-2">
                <Text className="text-[16px] leading-7 text-text-primary">{message.text}</Text>
              </View>
            ) : (
              <Text className="mt-1 text-[17px] text-text-primary">{message.text}</Text>
            )}
            <View className="mt-3">
              <RefreshCcw color="#5a5a5f" size={16} strokeWidth={2} />
            </View>
          </View>
        );
      })}

      {isReplying && (
        <View className="ml-8 flex-row items-center gap-2">
          <Text className="text-[34px] font-semibold text-text-primary">Nash</Text>
          <Bot color="#212121" size={16} strokeWidth={2} />
          <Text className="text-lg text-text-primary">•</Text>
        </View>
      )}
    </ScrollView>
  );
}
