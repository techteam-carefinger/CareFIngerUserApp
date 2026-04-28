import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {COLORS, FONTS} from '../constants';

type CustomCheckboxProps = {
  value: boolean;
  onToggle: () => void;
  label: string;
};

export function CustomCheckbox({value, onToggle, label}: CustomCheckboxProps) {
  return (
    <Pressable style={styles.container} onPress={onToggle} hitSlop={8}>
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkMark: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: FONTS.bold,
    marginTop: -1,
  },
  label: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: 16,
  },
});
