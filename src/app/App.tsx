import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {LoginScreen} from '../screens/LoginScreen';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <LoginScreen />
    </SafeAreaProvider>
  );
}

export default App;
