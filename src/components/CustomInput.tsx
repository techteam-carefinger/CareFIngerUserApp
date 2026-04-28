import React from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {COLORS, FONTS} from '../constants';

type CustomInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  prefix?: string;
  leftIcon?: React.ReactNode;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  error?: string;
};

export function CustomInput({
  value,
  onChangeText,
  placeholder,
  prefix = '+91',
  leftIcon,
  keyboardType = 'number-pad',
  maxLength = 10,
  error,
}: CustomInputProps) {
  return (
    <View>
      <View style={[styles.inputWrapper, error ? styles.errorBorder : undefined]}>
        <Text style={styles.prefix}>{prefix}</Text>
        <View style={styles.divider} />
        <View style={styles.leftIcon}>{leftIcon}</View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          keyboardType={keyboardType}
          maxLength={maxLength}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  prefix: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    lineHeight: 18,
    color: COLORS.primary,
    width: 36,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  leftIcon: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: FONTS.regular,
    fontSize: 18,
    lineHeight: 22,
    color: COLORS.textPrimary,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  errorBorder: {
    borderColor: COLORS.error,
  },
  errorText: {
    marginTop: 6,
    color: COLORS.error,
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
});
