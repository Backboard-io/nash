import './global.css';

import { Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ChatShellScreen } from './src/screens/ChatShellScreen';

let fontDefaultsApplied = false;

function applyFontDefaults() {
  if (fontDefaultsApplied) {
    return;
  }
  fontDefaultsApplied = true;

  Text.defaultProps = Text.defaultProps ?? {};
  TextInput.defaultProps = TextInput.defaultProps ?? {};

  Text.defaultProps.style = [{ fontFamily: 'Inter' }, Text.defaultProps.style].filter(Boolean);
  TextInput.defaultProps.style = [{ fontFamily: 'Inter' }, TextInput.defaultProps.style].filter(
    Boolean,
  );
}

export default function App() {
  // .woff2 assets are web fonts; native builds require .ttf/.otf.
  // Keep Inter defaults on web (where global.css @font-face applies),
  // and avoid native bundling errors from requiring .woff2 files.
  if (Platform.OS === 'web') {
    applyFontDefaults();
  }

  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-presentation" style={{ backgroundColor: '#ffffff' }}>
        <ChatShellScreen />
      </View>
    </SafeAreaProvider>
  );
}
