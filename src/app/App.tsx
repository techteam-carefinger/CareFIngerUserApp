import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {WelcomeScreen} from '../screens/WelcomeScreen';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <WelcomeScreen />
    </SafeAreaProvider>
  );
}

export default App;
