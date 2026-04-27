import React from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <WelcomeScreen />
    </SafeAreaProvider>
  );
}

function WelcomeScreen() {
  return (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeTitle}>Welcome to CareFinger</Text>
      <Text style={styles.welcomeSubtitle}>
        Your care and safety companion.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
  },
});

export default App;
