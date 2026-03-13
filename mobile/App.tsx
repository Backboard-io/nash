import './global.css';

import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ChatShellScreen } from './src/screens/ChatShellScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <ChatShellScreen />
    </SafeAreaProvider>
  );
}
