import { Bot } from 'lucide-react-native';
import { Text, View } from 'react-native';

interface LandingGreetingProps {
  greeting: string;
}

export function LandingGreeting({ greeting }: LandingGreetingProps) {
  return (
    <View className="flex-1 items-center justify-center px-4 pb-14">
      <View className="mb-4 h-11 w-11 items-center justify-center rounded-full border border-border-light bg-surface-primary">
        <Bot color="#212121" size={20} strokeWidth={2} />
      </View>
      <Text className="text-center text-2xl font-semibold text-text-primary" testID="greeting-text">
        {greeting}
      </Text>
      <View className="mt-20 w-full items-center">
        <View
          className="h-px w-72 rounded-full bg-border-light/70"
          style={{ transform: [{ rotate: '-4deg' }] }}
        />
      </View>
    </View>
  );
}
