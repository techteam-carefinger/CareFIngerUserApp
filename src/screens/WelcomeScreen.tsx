import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {APP_STRINGS} from '../constants';
import {COLORS, SPACING, TYPOGRAPHY} from '../theme';

export function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_STRINGS.welcomeTitle}</Text>
      <Text style={styles.subtitle}>{APP_STRINGS.welcomeSubtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.headingLg,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.bodyMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
