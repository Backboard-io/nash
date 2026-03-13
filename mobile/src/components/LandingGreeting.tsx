import { Text, View } from 'react-native';

interface LandingGreetingProps {
  greeting: string;
}

export function LandingGreeting({ greeting }: LandingGreetingProps) {
  return (
    <View className="flex-1 items-center justify-center px-4 pb-16">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full border border-border-light bg-surface-primary">
        <Text className="text-2xl text-text-primary">⚙</Text>
      </View>
      <Text className="text-center text-2xl font-medium text-text-primary" testID="greeting-text">
        {greeting}
      </Text>
    </View>
  );
}
