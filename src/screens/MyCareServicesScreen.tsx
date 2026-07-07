import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {ApiError, bookingService} from '../services';
import {BookingHistoryItem} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'MyCareServices'>;

const getBookingId = (item: BookingHistoryItem) => item.bookingId ?? item._id ?? '';

const getBookingAmount = (item: BookingHistoryItem) =>
  item.amount ?? item.price ?? item.totalAmount ?? 0;

const getBookingDate = (item: BookingHistoryItem) =>
  item.createdAt ?? item.bookingDate ?? item.date ?? '';

const formatLocationTitle = (address?: string) => {
  if (!address?.trim()) {
    return 'Care Service';
  }
  return address.split(',')[0]?.trim() || address;
};

const formatDateTime = (value: string) => {
  if (!value) {
    return 'Date unavailable';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const datePart = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);

  return `${datePart} • ${timePart}`;
};

const formatStatus = (status?: string) => {
  if (!status?.trim()) {
    return 'Unknown';
  }
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatAmount = (amount: number) => `₹${amount.toFixed(1)}`;

export function MyCareServicesScreen({navigation}: Props) {
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const history = await bookingService.getBookingHistory();
      setBookings(history.bookings);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not load your care service history.';
      setErrorMessage(message);
      setBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const renderItem = ({item}: {item: BookingHistoryItem}) => {
    const amount = getBookingAmount(item);
    const status = formatStatus(item.status);

    return (
      <Pressable style={styles.historyRow}>
        <View style={styles.historyIconWrap}>
          <Ionicons name="medkit-outline" size={22} color="#111827" />
        </View>
        <View style={styles.historyContent}>
          <Text style={styles.historyTitle} allowFontScaling={false} numberOfLines={1}>
            {formatLocationTitle(item.address)}
          </Text>
          <Text style={styles.historyMeta} allowFontScaling={false}>
            {formatDateTime(getBookingDate(item))}
          </Text>
          <Text style={styles.historyMeta} allowFontScaling={false}>
            {formatAmount(amount)} • {status}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            My Care Services
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterChip}>
            <Text style={styles.filterChipText} allowFontScaling={false}>
              Care Service
            </Text>
          </View>
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
            <Pressable style={styles.retryButton} onPress={() => void loadHistory()}>
              <Text style={styles.retryText} allowFontScaling={false}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item, index) => getBookingId(item) || `booking-${index}`}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <Text style={styles.emptyText} allowFontScaling={false}>
                  No care services found yet.
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.footerCard}>
                <Ionicons name="help-circle-outline" size={22} color="#111827" />
                <Text style={styles.footerTitle} allowFontScaling={false}>
                  Looking for services older than 90 days?
                </Text>
                <Pressable style={styles.footerButton}>
                  <Text style={styles.footerButtonText} allowFontScaling={false}>
                    Request Service History
                  </Text>
                </Pressable>
              </View>
            }
            contentContainerStyle={[
              styles.listContent,
              bookings.length === 0 && styles.listContentEmpty,
            ]}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#111827',
    marginLeft: 4,
  },
  headerSpacer: {
    width: 36,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#111827',
  },
  listContent: {
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  historyIconWrap: {
    width: 28,
    alignItems: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#111827',
  },
  historyMeta: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 58,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    marginBottom: 12,
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
  footerCard: {
    marginTop: 24,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  footerTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#111827',
  },
  footerButton: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footerButtonText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#111827',
  },
});
