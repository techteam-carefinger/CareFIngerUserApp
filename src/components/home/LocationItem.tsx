import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import {FONTS} from '../../constants';

const THEME = '#1F8A9E';

type LocationItemProps = {
  icon: 'home-outline' | 'time-outline';
  title: string;
  subtitle: string;
  isLast?: boolean;
  isFavorite?: boolean;
  onPress?: () => void;
};

export function LocationItem({
  icon,
  title,
  subtitle,
  isLast,
  isFavorite = false,
  onPress,
}: LocationItemProps) {
  const content = (
    <>
      <View style={styles.locationLeft}>
        <Ionicons name={icon} size={18} color={THEME} style={styles.locationLeftIcon} />
        <View style={styles.locationTextWrap}>
          <Text style={styles.locationTitle} allowFontScaling={false}>
            {title}
          </Text>
          <Text style={styles.locationSubtitle} numberOfLines={2} allowFontScaling={false}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Ionicons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={20}
        color={THEME}
        style={styles.locationHeart}
      />
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.locationRow, !isLast && styles.locationDivider]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.locationRow, !isLast && styles.locationDivider]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  locationDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  locationLeftIcon: {
    width: 22,
  },
  locationTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  locationTitle: {
    fontFamily: FONTS.bold,
    color: THEME,
    fontSize: 16,
    marginBottom: 2,
  },
  locationSubtitle: {
    fontFamily: FONTS.regular,
    color: '#6B7280',
    fontSize: 13,
  },
  locationHeart: {
    marginLeft: 8,
  },
});
