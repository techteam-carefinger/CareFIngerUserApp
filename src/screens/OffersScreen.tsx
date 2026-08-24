import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {BottomTab} from '../components/home/BottomTab';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {ApiError, offersService} from '../services';
import {DiscountOffer} from '../types';

const THEME = '#1F8A9E';

const BOTTOM_TABS = [
  {icon: 'home-outline' as const, label: 'Home'},
  {icon: 'pricetag-outline' as const, label: 'Offers'},
  {icon: 'person-outline' as const, label: 'Profile'},
];

const getOfferId = (item: DiscountOffer, index: number) =>
  item._id || item.code || `offer-${index}`;

const getOfferName = (item: DiscountOffer) =>
  item.name?.trim() || item.title?.trim() || 'Special offer';

const getOfferStatus = (item: DiscountOffer) =>
  (item.currentStatus || item.status || 'unknown').toLowerCase();

const isActiveOffer = (item: DiscountOffer) => getOfferStatus(item) === 'active';

const formatDate = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

const formatDateRange = (item: DiscountOffer) => {
  const start = formatDate(item.startDate);
  const end = formatDate(item.endDate);
  if (start && end) {
    return `${start} → ${end}`;
  }
  return start || end || 'Dates unavailable';
};

const formatDiscountValue = (item: DiscountOffer) => {
  const value = item.discountValue ?? 0;
  const type = (item.discountType || '').toLowerCase();
  if (type === 'percentage') {
    return `${value}% OFF`;
  }
  if (type === 'fixed') {
    return `₹${value} OFF`;
  }
  return `${value} OFF`;
};

const formatStatusLabel = (status: string) =>
  status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const formatUsage = (item: DiscountOffer) => {
  const claimed = item.claimedCount ?? 0;
  const limit = item.totalClaimLimit;
  if (limit == null) {
    return item.remainingClaims != null
      ? `${item.remainingClaims} left`
      : null;
  }
  const remaining =
    item.remainingClaims != null ? item.remainingClaims : Math.max(limit - claimed, 0);
  return `${claimed} / ${limit} used · ${remaining} left`;
};

export function OffersScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [offers, setOffers] = useState<DiscountOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadOffers = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage('');

    try {
      const nextOffers = await offersService.getOffers();
      setOffers(nextOffers);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not load offers right now.';
      setErrorMessage(message);
      setOffers([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOffers();
    }, [loadOffers]),
  );

  const sortedOffers = useMemo(
    () =>
      [...offers].sort((a, b) => {
        const activeDiff = Number(isActiveOffer(b)) - Number(isActiveOffer(a));
        if (activeDiff !== 0) {
          return activeDiff;
        }
        return (b.startDate || '').localeCompare(a.startDate || '');
      }),
    [offers],
  );

  const handleCopyCode = (code?: string) => {
    if (!code) {
      return;
    }
    Alert.alert('Discount code', `Use ${code} on your next booking.`);
  };

  const renderItem = ({item}: {item: DiscountOffer}) => {
    const status = getOfferStatus(item);
    const active = status === 'active';
    const usage = formatUsage(item);
    const minBooking = item.minimumBookingAmount
      ? `Min. booking ₹${item.minimumBookingAmount}`
      : null;
    const maxDiscount =
      item.discountType === 'percentage' && item.maxDiscountAmount
        ? `Up to ₹${item.maxDiscountAmount}`
        : null;

    return (
      <View style={[styles.card, !active && styles.cardInactive]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <Ionicons name="pricetag" size={18} color={THEME} />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.offerName} allowFontScaling={false} numberOfLines={1}>
              {getOfferName(item)}
            </Text>
            {item.audienceType ? (
              <Text style={styles.audience} allowFontScaling={false}>
                For {item.audienceType}
              </Text>
            ) : null}
          </View>
          <View style={[styles.statusBadge, active ? styles.statusActive : styles.statusIdle]}>
            <Text
              style={[styles.statusText, active ? styles.statusActiveText : styles.statusIdleText]}
              allowFontScaling={false}>
              {formatStatusLabel(status)}
            </Text>
          </View>
        </View>

        <Text style={styles.discountValue} allowFontScaling={false}>
          {formatDiscountValue(item)}
        </Text>

        {item.description ? (
          <Text style={styles.description} allowFontScaling={false}>
            {item.description}
          </Text>
        ) : null}

        {item.code ? (
          <Pressable style={styles.codeRow} onPress={() => handleCopyCode(item.code)}>
            <Text style={styles.codeLabel} allowFontScaling={false}>
              Code
            </Text>
            <View style={styles.codePill}>
              <Text style={styles.codeText} allowFontScaling={false}>
                {item.code}
              </Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.metaWrap}>
          {maxDiscount ? (
            <Text style={styles.metaText} allowFontScaling={false}>
              {maxDiscount}
            </Text>
          ) : null}
          {minBooking ? (
            <Text style={styles.metaText} allowFontScaling={false}>
              {minBooking}
            </Text>
          ) : null}
          {usage ? (
            <Text style={styles.metaText} allowFontScaling={false}>
              {usage}
            </Text>
          ) : null}
          <Text style={styles.metaText} allowFontScaling={false}>
            {formatDateRange(item)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title} allowFontScaling={false}>
            Offers
          </Text>
          <Text style={styles.subtitle} allowFontScaling={false}>
            Save on your next care booking
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : errorMessage ? (
          <View style={styles.centerState}>
            <Text style={styles.errorText} allowFontScaling={false}>
              {errorMessage}
            </Text>
            <Pressable style={styles.retryButton} onPress={() => void loadOffers()}>
              <Text style={styles.retryText} allowFontScaling={false}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={sortedOffers}
            keyExtractor={(item, index) => getOfferId(item, index)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void loadOffers(true)}
                tintColor={THEME}
              />
            }
            contentContainerStyle={[
              styles.listContent,
              sortedOffers.length === 0 && styles.listContentEmpty,
            ]}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Ionicons name="pricetag-outline" size={36} color="#9CA3AF" />
                <Text style={styles.emptyText} allowFontScaling={false}>
                  No offers available right now.
                </Text>
              </View>
            }
          />
        )}

        <View style={styles.bottomBar}>
          {BOTTOM_TABS.map(tab => (
            <BottomTab
              key={tab.label}
              icon={tab.icon}
              label={tab.label}
              active={tab.label === 'Offers'}
              onPress={() => {
                if (tab.label === 'Home') {
                  navigation.navigate('Home');
                }
                if (tab.label === 'Profile') {
                  navigation.navigate('Profile');
                }
              }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 14,
  },
  cardInactive: {
    opacity: 0.62,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  offerName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#111827',
  },
  audience: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusIdle: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
  },
  statusActiveText: {
    color: '#15803D',
  },
  statusIdleText: {
    color: '#6B7280',
  },
  discountValue: {
    marginTop: 14,
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: THEME,
  },
  description: {
    marginTop: 6,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  codeRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  codeLabel: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#6B7280',
  },
  codePill: {
    backgroundColor: '#EDE9FE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  codeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#6D28D9',
    letterSpacing: 0.4,
  },
  metaWrap: {
    marginTop: 14,
    gap: 4,
  },
  metaText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: -4},
    elevation: 10,
  },
});
