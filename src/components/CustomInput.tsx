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
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export function CustomInput({
  value,
  onChangeText,
  placeholder,
  prefix,
  leftIcon,
  keyboardType = 'default',
  maxLength,
  error,
  autoCapitalize = 'none',
}: CustomInputProps) {
  const hasPrefix = Boolean(prefix);

  return (
    <View>
      <View style={[styles.inputWrapper, error ? styles.errorBorder : undefined]}>
        {hasPrefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        {hasPrefix ? <View style={styles.divider} /> : null}
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
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
    fontSize: 16,
    lineHeight: 20,
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
