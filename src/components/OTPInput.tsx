import React, {useEffect, useMemo, useRef} from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from 'react-native';

import {COLORS, FONTS} from '../constants';

type OTPInputProps = {
  length?: number;
  value: string;
  onChange: (nextValue: string) => void;
};

export function OTPInput({length = 4, value, onChange}: OTPInputProps) {
  const inputRefs = useRef<
    Array<{focus: () => void; blur: () => void} | null>
  >([]);

  const chars = useMemo(
    () => value.padEnd(length, ' ').slice(0, length).split(''),
    [length, value],
  );

  useEffect(() => {
    if (value.length === length) {
      inputRefs.current[length - 1]?.blur();
    }
  }, [length, value.length]);

  const focusInput = (index: number) => {
    if (index < 0 || index >= length) {
      return;
    }
    inputRefs.current[index]?.focus();
  };

  const updateAtIndex = (index: number, replacement: string) => {
    const nextArray = value.padEnd(length, ' ').slice(0, length).split('');
    nextArray[index] = replacement;
    onChange(nextArray.join('').replace(/\s/g, ''));
  };

  const handleTextChange = (inputText: string, index: number) => {
    const digits = inputText.replace(/\D/g, '');

    if (!digits) {
      updateAtIndex(index, ' ');
      return;
    }

    if (digits.length > 1) {
      const currentArray = value.padEnd(length, ' ').slice(0, length).split('');
      const available = Math.min(length - index, digits.length);
      for (let offset = 0; offset < available; offset += 1) {
        currentArray[index + offset] = digits[offset];
      }

      onChange(currentArray.join('').replace(/\s/g, ''));
      focusInput(Math.min(index + available, length - 1));
      return;
    }

    updateAtIndex(index, digits[0]);
    focusInput(index + 1);
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key !== 'Backspace') {
      return;
    }

    const isCurrentEmpty = !chars[index].trim();
    if (!isCurrentEmpty) {
      updateAtIndex(index, ' ');
      return;
    }

    if (index > 0) {
      updateAtIndex(index - 1, ' ');
      focusInput(index - 1);
    }
  };

  return (
    <View style={styles.row}>
      {chars.map((char, index) => (
        <TextInput
          key={`otp-${index}`}
          ref={ref => {
            inputRefs.current[index] =
              ref as unknown as {focus: () => void; blur: () => void} | null;
          }}
          style={styles.input}
          value={char.trim()}
          onChangeText={(text: string) => handleTextChange(text, index)}
          onKeyPress={(
            event: NativeSyntheticEvent<TextInputKeyPressEventData>,
          ) => handleKeyPress(event.nativeEvent.key, index)}
          keyboardType="number-pad"
          textContentType={index === 0 ? 'oneTimeCode' : 'none'}
          returnKeyType="done"
          maxLength={length}
          autoCorrect={false}
          autoCapitalize="none"
          textAlign="center"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  input: {
    width: 48,
    borderRadius: 10,
    borderWidth: 1.25,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    fontSize: 20,
    fontFamily: FONTS.medium,
    color: COLORS.textPrimary,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
});
