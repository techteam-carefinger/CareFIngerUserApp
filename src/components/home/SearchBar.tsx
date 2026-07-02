import React from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import {FONTS} from '../../constants';

type SearchBarProps = {
  placeholder?: string;
  onFocus?: () => void;
  onPress?: () => void;
};

export function SearchBar({placeholder = 'Where are you going?', onFocus, onPress}: SearchBarProps) {
  const inputNode = onPress ? (
    <Pressable style={styles.pressableInput} onPress={onPress}>
      <Text style={styles.placeholderText} allowFontScaling={false}>
        {placeholder}
      </Text>
    </Pressable>
  ) : (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#4B5563"
      style={styles.searchInput}
      allowFontScaling={false}
      onFocus={onFocus}
    />
  );

  return (
    <View style={styles.searchWrap}>
      <View style={styles.iconContainer}>
        <Ionicons name="search-outline" size={22} color="#111827" />
      </View>
      <View style={styles.inputContainer}>
        {inputNode}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    lineHeight: 20,
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  pressableInput: {
    height: '100%',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    lineHeight: 20,
    color: '#4B5563',
  },
});
