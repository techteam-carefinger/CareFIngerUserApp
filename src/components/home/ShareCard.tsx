import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {FONTS} from '../../constants';

const THEME = '#1F8A9E';

type ShareCardProps = {
  title?: string;
  description?: string;
  ctaLabel?: string;
  onPress?: () => void;
};

export function ShareCard({
  title = 'Share & Earn!',
  description = 'Share your code with friends and earn exciting rewards.',
  ctaLabel = 'Share Now',
  onPress,
}: ShareCardProps) {
  return (
    <View style={styles.shareCard}>
      <View style={styles.shareLeft}>
        <Text style={styles.shareTitle} allowFontScaling={false}>
          {title}
        </Text>
        <Text style={styles.shareDescription} allowFontScaling={false}>
          {description}
        </Text>
        <Pressable style={styles.shareButton} onPress={onPress}>
          <Text style={styles.shareButtonText} allowFontScaling={false}>
            {ctaLabel}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.giftIcon} allowFontScaling={false}>
        🎁
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shareCard: {
    marginTop: 18,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ECF8FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareLeft: {
    flex: 1,
    paddingRight: 12,
  },
  shareTitle: {
    color: THEME,
    fontFamily: FONTS.bold,
    fontSize: 20,
    marginBottom: 4,
  },
  shareDescription: {
    color: '#4B5563',
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  shareButton: {
    backgroundColor: THEME,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontFamily: FONTS.semiBold,
    fontSize: 13,
  },
  giftIcon: {
    fontSize: 56,
  },
});
