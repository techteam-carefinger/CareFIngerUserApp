import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import {FONTS} from '../../constants';

const THEME = '#1F8A9E';

type BottomTabProps = {
  icon: 'home-outline' | 'share-social-outline' | 'pricetag-outline' | 'person-outline';
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function BottomTab({icon, label, active, onPress}: BottomTabProps) {
  const color = active ? THEME : '#6B7280';

  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <View style={styles.tabIcon}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.tabLabel, active && styles.tabActive]} allowFontScaling={false}>
        {label}
      </Text>
      {active ? <View style={styles.activeIndicator} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#6B7280',
  },
  tabActive: {
    color: THEME,
  },
  activeIndicator: {
    marginTop: 6,
    width: 26,
    height: 3,
    borderRadius: 6,
    backgroundColor: THEME,
  },
});
