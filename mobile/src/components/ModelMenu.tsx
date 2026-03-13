import {
  Bot,
  BriefcaseBusiness,
  ChevronRight,
  CircleCheck,
  Lock,
  Route,
} from 'lucide-react-native';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

interface ProviderItem {
  id: string;
  label: string;
  locked?: boolean;
  status?: 'ok';
}

interface ModelMenuProps {
  visible: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
}

const providers: ProviderItem[] = [
  { id: 'aws', label: 'AWS Bedrock', locked: true },
  { id: 'anthropic', label: 'Anthropic', locked: true },
  { id: 'cerebras', label: 'Cerebras', status: 'ok' },
  { id: 'cohere', label: 'Cohere' },
  { id: 'featherless', label: 'Featherless' },
  { id: 'google', label: 'Google', locked: true },
  { id: 'openai', label: 'OpenAI', locked: true },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'personas', label: 'Personas' },
];

function ProviderIcon({ id }: { id: string }) {
  if (id === 'openrouter') {
    return <Image source={require('../../assets/openrouter.png')} className="h-4 w-4 rounded-full" />;
  }
  if (id === 'personas') {
    return <Image source={require('../../assets/nash.png')} className="h-4 w-4 rounded-full" />;
  }
  if (id === 'cohere') {
    return <Image source={require('../../assets/cohere.png')} className="h-4 w-4 rounded-full" />;
  }
  if (id === 'cerebras') {
    return <Bot color="#5b5b5f" size={16} strokeWidth={2} />;
  }

  if (id === 'anthropic') {
    return <Route color="#5b5b5f" size={16} strokeWidth={2} />;
  }

  if (id === 'openai') {
    return <Bot color="#5b5b5f" size={16} strokeWidth={2} />;
  }

  if (id === 'aws') {
    return <BriefcaseBusiness color="#5b5b5f" size={16} strokeWidth={2} />;
  }

  if (id === 'featherless') {
    return <BriefcaseBusiness color="#5b5b5f" size={16} strokeWidth={2} />;
  }

  // Fallback icon for provider rows without a dedicated brand asset.
  return <BriefcaseBusiness color="#5b5b5f" size={16} strokeWidth={2} />;
}

export function ModelMenu({ visible, searchValue, onSearchChange, onClose }: ModelMenuProps) {
  if (!visible) {
    return null;
  }

  const lower = searchValue.trim().toLowerCase();
  const filteredProviders = providers.filter((provider) => provider.label.toLowerCase().includes(lower));

  return (
    <View className="absolute inset-0 z-10" pointerEvents="box-none">
      <Pressable className="absolute inset-0" onPress={onClose} testID="model-menu-overlay" />

      <View className="absolute left-3 right-12 top-[98px] rounded-2xl border border-border-light bg-surface-primary shadow-lg">
        <View className="p-2">
          <View className="rounded-xl border-2 border-text-primary/90 bg-surface-primary px-3 py-2">
            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              placeholder="Search models..."
              placeholderTextColor="#595959"
              className="text-base text-text-primary"
              testID="model-menu-search-input"
            />
          </View>

          <View className="mt-2 flex-row flex-wrap gap-2 pb-2">
            <View className="rounded-full border border-border-light bg-surface-secondary px-3 py-1">
              <Text className="text-sm text-text-secondary">
                <Text className="font-semibold text-text-primary">Free</Text> (Open Source)
              </Text>
            </View>
            <View className="rounded-full border border-border-light bg-surface-secondary px-3 py-1">
              <Text className="text-sm text-text-secondary">
                <Text className="font-semibold text-text-primary">Fast</Text> (Low Latency)
              </Text>
            </View>
            <View className="rounded-full border border-border-light bg-surface-secondary px-3 py-1">
              <Text className="text-sm text-text-secondary">
                <Text className="font-semibold text-text-primary">Powerful</Text> (Deep Reasoning)
              </Text>
            </View>
          </View>
        </View>

        <View className="h-px bg-border-light" />

        <ScrollView className="max-h-[312px]" showsVerticalScrollIndicator>
          {filteredProviders.map((provider) => (
            <Pressable
              key={provider.id}
              className="flex-row items-center gap-3 px-3 py-2.5"
              testID={`model-provider-${provider.id}`}
            >
              <ProviderIcon id={provider.id} />
              <Text className={`flex-1 text-sm ${provider.locked ? 'text-text-tertiary' : 'text-text-primary'}`}>
                {provider.label}
              </Text>

              {provider.locked && <Lock color="#8b8b90" size={14} strokeWidth={2} />}
              {provider.status === 'ok' && <CircleCheck color="#2f6d4a" size={16} strokeWidth={2} />}
              <ChevronRight color="#595959" size={18} strokeWidth={2} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
