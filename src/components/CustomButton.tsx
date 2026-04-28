import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import {COLORS, FONTS} from '../constants';

type CustomButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function CustomButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
}: CustomButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      style={({pressed}) => [
        styles.button,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}>
      {loading ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 5},
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  title: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: FONTS.semiBold,
  },
});
