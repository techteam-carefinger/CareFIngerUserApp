import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import MapView, {Marker, PROVIDER_GOOGLE, Region} from 'react-native-maps';
import {SafeAreaView} from 'react-native-safe-area-context';

import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {ApiError, bookingService, getBookingOffer, PAID_RATE_PER_MINUTE, storage} from '../services';
import {CaretakerMarker, CurrentBooking} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchingCaretaker'>;

const POLL_INTERVAL_MS = 3000;
const OFFER_DELAY_MS = 1200;
const DEFAULT_RECHARGE_AMOUNT = 49;

const isNoActivePlanError = (message: string) =>
  message.toLowerCase().includes('no active plan');

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateCaretakerMarkers = (
  center: {latitude: number; longitude: number},
  count: number,
): CaretakerMarker[] =>
  Array.from({length: count}, (_, index) => {
    const angle = seededRandom(index + center.latitude) * Math.PI * 2;
    const distance = 0.002 + seededRandom(index + center.longitude) * 0.008;
    return {
      id: `search-caretaker-${index}`,
      latitude: center.latitude + Math.cos(angle) * distance,
      longitude: center.longitude + Math.sin(angle) * distance,
    };
  });

const toConfirmedParams = (
  booking: CurrentBooking,
  pickup: {address: string; latitude: number; longitude: number},
  fallbackOtp = 0,
  drop?: {address: string; latitude: number; longitude: number},
) => ({
  bookingId: booking.bookingId,
  pickup,
  drop,
  otp: booking.otp ?? fallbackOtp,
  providerName: booking.providerName ?? 'Caretaker',
  providerRating: booking.providerRating ?? 4.7,
  vehicleNumber: booking.vehicleNumber ?? 'CF-SERVICE',
  vehicleModel: booking.vehicleModel ?? 'Caretaker Service',
  etaMinutes: booking.etaMinutes ?? 6,
  providerLatitude: booking.providerLat ?? pickup.latitude + 0.004,
  providerLongitude: booking.providerLng ?? pickup.longitude + 0.004,
  remainingMinutes: booking.remainingMinutes,
});

const formatRate = (rate: number) => {
  const rounded = Math.round(rate * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2);
};

export function SearchingCaretakerScreen({navigation, route}: Props) {
  const {latitude, longitude, address, planTitle, planAmount, drop} = route.params;
  const {height: windowHeight} = useWindowDimensions();
  const mapHeight = Math.round(windowHeight * 0.52);

  const [bookingId, setBookingId] = useState(route.params.bookingId ?? '');
  const [nearbyProviders, setNearbyProviders] = useState(route.params.nearbyProviders ?? 5);
  const [userName, setUserName] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [paidOffer, setPaidOffer] = useState<{ratePerMinute: number} | null>(null);
  const isCancellingRef = useRef(false);
  const isRetryingRef = useRef(false);
  const hasAcceptedRef = useRef(false);
  const isCreatingBookingRef = useRef(false);
  const offerHandledRef = useRef(false);
  const bookingIdRef = useRef(route.params.bookingId ?? '');
  const bookingOtpRef = useRef(route.params.otp ?? 0);
  const pendingBookingRef = useRef<CurrentBooking | null>(
    route.params.bookingId
      ? {
          bookingId: route.params.bookingId,
          status: 'searching',
          otp: route.params.otp,
          remainingMinutes: route.params.remainingMinutes,
        }
      : null,
  );

  const pulse = useRef(new Animated.Value(0)).current;

  const caretakerMarkers = useMemo(
    () => generateCaretakerMarkers({latitude, longitude}, Math.max(nearbyProviders, 5)),
    [latitude, longitude, nearbyProviders],
  );

  const initialRegion: Region = {
    latitude,
    longitude,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };

  useEffect(() => {
    void (async () => {
      const user = await storage.getUser();
      if (user?.name) {
        setUserName(user.name);
      }
    })();
  }, []);

  useEffect(() => {
    if (bookingId || isCreatingBookingRef.current) {
      return;
    }

    isCreatingBookingRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const booking = await bookingService.createBooking({
          lat: latitude,
          lng: longitude,
          address,
        });
        if (cancelled) {
          return;
        }
        setBookingId(booking.bookingId);
        bookingIdRef.current = booking.bookingId;
        bookingOtpRef.current = booking.otp;
        setNearbyProviders(Math.max(booking.nearbyProviders ?? 0, 5));
        pendingBookingRef.current = {
          bookingId: booking.bookingId,
          status: booking.status,
          otp: booking.otp,
          nearbyProviders: booking.nearbyProviders,
          remainingMinutes: booking.remainingMinutes,
        };
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof ApiError
            ? error.message
            : 'Could not create booking. Please try again.';
        if (isNoActivePlanError(message)) {
          navigation.replace('Recharge', {
            planTitle: planTitle ?? 'Active care plan',
            amount:
              planAmount && planAmount > 0 ? planAmount : DEFAULT_RECHARGE_AMOUNT,
          });
          return;
        }
        Alert.alert('Booking failed', message, [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } finally {
        isCreatingBookingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, bookingId, latitude, longitude, navigation, planAmount, planTitle]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const goToConfirmed = useCallback(() => {
    if (hasAcceptedRef.current) {
      return;
    }
    hasAcceptedRef.current = true;
    const snapshot = pendingBookingRef.current ?? {
      bookingId: bookingIdRef.current,
      status: 'accepted',
      otp: bookingOtpRef.current,
    };
    navigation.replace(
      'BookingConfirmed',
      toConfirmedParams(
        snapshot,
        {address, latitude, longitude},
        bookingOtpRef.current,
        drop,
      ),
    );
  }, [address, drop, latitude, longitude, navigation]);

  const applyOffer = useCallback(
    (offer: {isFree: boolean; ratePerMinute: number}) => {
      if (hasAcceptedRef.current) {
        return;
      }
      if (offer.isFree) {
        goToConfirmed();
        return;
      }
      setPaidOffer({
        ratePerMinute: offer.ratePerMinute || PAID_RATE_PER_MINUTE,
      });
    },
    [goToConfirmed],
  );

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    const timer = setTimeout(() => {
      if (offerHandledRef.current || hasAcceptedRef.current) {
        return;
      }
      offerHandledRef.current = true;
      applyOffer(
        route.params.offer ?? getBookingOffer(pendingBookingRef.current),
      );
    }, OFFER_DELAY_MS);

    return () => clearTimeout(timer);
  }, [applyOffer, bookingId, route.params.offer]);

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    let cancelled = false;

    const pollBooking = async () => {
      try {
        const booking = await bookingService.getCurrentBooking();
        if (cancelled || !booking) {
          return;
        }
        if (booking.bookingId === bookingIdRef.current) {
          pendingBookingRef.current = booking;
          if (booking.otp) {
            bookingOtpRef.current = booking.otp;
          }
        }
      } catch {
        // Keep polling while the search screen is visible.
      }
    };

    void pollBooking();
    const timer = setInterval(() => {
      void pollBooking();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [bookingId]);

  const resolveBookingIdForCancel = useCallback(async () => {
    if (bookingIdRef.current) {
      return bookingIdRef.current;
    }

    try {
      const current = await bookingService.getCurrentBooking();
      if (current?.bookingId) {
        bookingIdRef.current = current.bookingId;
        setBookingId(current.bookingId);
        return current.bookingId;
      }
    } catch {
      // Fall through if current booking cannot be loaded.
    }

    return null;
  }, []);

  const cancelSearch = useCallback(async () => {
    if (isCancellingRef.current) {
      return;
    }

    const token = await storage.getToken();
    if (!token) {
      Alert.alert('Login required', 'Please log in to cancel your booking.', [
        {text: 'OK', onPress: () => navigation.navigate('Login')},
      ]);
      return;
    }

    try {
      isCancellingRef.current = true;
      setIsCancelling(true);

      const activeBookingId = await resolveBookingIdForCancel();
      if (!activeBookingId) {
        navigation.navigate('Home');
        return;
      }

      await bookingService.cancelBooking(activeBookingId, 'Cancelled by user');
      navigation.navigate('Home');
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not cancel the booking. Please try again.';
      Alert.alert('Cancel failed', message);
    } finally {
      isCancellingRef.current = false;
      setIsCancelling(false);
    }
  }, [navigation, resolveBookingIdForCancel]);

  const confirmCancelBooking = useCallback(() => {
    Alert.alert('Cancel booking?', 'Do you want to cancel this caretaker request?', [
      {text: 'No', style: 'cancel'},
      {text: 'Yes', style: 'destructive', onPress: () => void cancelSearch()},
    ]);
  }, [cancelSearch]);

  const confirmPaidOffer = useCallback(() => {
    setPaidOffer(null);
    goToConfirmed();
  }, [goToConfirmed]);

  const retryForFree = useCallback(async () => {
    if (isRetryingRef.current || isCancellingRef.current) {
      return;
    }

    isRetryingRef.current = true;
    setIsRetrying(true);
    setPaidOffer(null);

    try {
      const activeBookingId = await resolveBookingIdForCancel();
      if (activeBookingId) {
        await bookingService
          .cancelBooking(activeBookingId, 'Retry for free service')
          .catch(() => undefined);
      }

      hasAcceptedRef.current = false;
      offerHandledRef.current = true;

      const booking = await bookingService.createBooking({
        lat: latitude,
        lng: longitude,
        address,
      });

      setBookingId(booking.bookingId);
      bookingIdRef.current = booking.bookingId;
      bookingOtpRef.current = booking.otp;
      pendingBookingRef.current = {
        bookingId: booking.bookingId,
        status: booking.status,
        otp: booking.otp,
        nearbyProviders: booking.nearbyProviders,
        remainingMinutes: booking.remainingMinutes,
      };
      setNearbyProviders(Math.max(booking.nearbyProviders ?? 0, 5));

      await new Promise(resolve => setTimeout(resolve, OFFER_DELAY_MS));
      applyOffer(getBookingOffer(booking));
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not retry for a free ride. Please try again.';
      if (isNoActivePlanError(message)) {
        navigation.replace('Recharge', {
          planTitle: planTitle ?? 'Active care plan',
          amount:
            planAmount && planAmount > 0 ? planAmount : DEFAULT_RECHARGE_AMOUNT,
        });
        return;
      }
      Alert.alert('Retry failed', message);
    } finally {
      isRetryingRef.current = false;
      setIsRetrying(false);
    }
  }, [
    address,
    applyOffer,
    latitude,
    longitude,
    navigation,
    planAmount,
    planTitle,
    resolveBookingIdForCancel,
  ]);

  const ringScale = (index: number) =>
    pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.55 + index * 0.18, 1 + index * 0.22],
    });

  const ringOpacity = (index: number) =>
    pulse.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.45 - index * 0.08, 0.2, 0.05],
    });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={confirmCancelBooking} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Searching for Caretaker
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.statusBlock}>
          <View style={styles.statusIconWrap}>
            <Ionicons name="medkit" size={28} color={COLORS.white} />
          </View>
          <Text style={styles.statusTitle} allowFontScaling={false}>
            {isRetrying ? 'Trying for a free ride...' : 'Searching caretaker...'}
          </Text>
          <Text style={styles.statusSubtitle} allowFontScaling={false}>
            {isRetrying
              ? 'Checking if this one is free...'
              : 'This may take a few seconds...'}
          </Text>
        </View>

        <View style={[styles.mapWrap, {height: mapHeight}]}>
          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={initialRegion}
            mapType="standard"
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}>
            {caretakerMarkers.map(marker => (
              <Marker
                key={marker.id}
                coordinate={marker}
                anchor={{x: 0.5, y: 0.5}}
                tracksViewChanges={false}>
                <View style={styles.markerStack}>
                  <View style={styles.markerPin}>
                    <Ionicons name="person" size={14} color={COLORS.white} />
                  </View>
                  <View style={styles.markerVehicle}>
                    <Ionicons name="medkit-outline" size={16} color="#111827" />
                  </View>
                </View>
              </Marker>
            ))}
          </MapView>

          <View pointerEvents="none" style={styles.radarOverlay}>
            {[0, 1, 2].map(index => (
              <Animated.View
                key={index}
                style={[
                  styles.radarRing,
                  {
                    opacity: ringOpacity(index),
                    transform: [{scale: ringScale(index)}],
                  },
                ]}
              />
            ))}
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText} allowFontScaling={false}>
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]}
          onPress={confirmCancelBooking}
          disabled={isCancelling}>
          {isCancelling ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.cancelButtonText} allowFontScaling={false}>
              Cancel
            </Text>
          )}
        </Pressable>

        <Text style={styles.addressHint} allowFontScaling={false} numberOfLines={1}>
          Pickup: {address}
        </Text>
      </View>

      <Modal
        visible={paidOffer != null}
        transparent
        animationType="fade"
        onRequestClose={confirmPaidOffer}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="pricetag" size={28} color={COLORS.white} />
            </View>
            <Text style={styles.modalTitle} allowFontScaling={false}>
              CareFinger just @ ₹{formatRate(paidOffer?.ratePerMinute ?? PAID_RATE_PER_MINUTE)}/min
            </Text>
            <Text style={styles.modalMessage} allowFontScaling={false}>
              A caretaker is ready. Confirm to continue, or retry for a free ride.
            </Text>
            <Pressable
              style={styles.modalConfirmButton}
              onPress={confirmPaidOffer}
              disabled={isRetrying}>
              <Text style={styles.modalConfirmText} allowFontScaling={false}>
                Confirm
              </Text>
            </Pressable>
            <Pressable
              style={styles.modalRetryButton}
              onPress={() => void retryForFree()}
              disabled={isRetrying}>
              {isRetrying ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.modalRetryText} allowFontScaling={false}>
                  Retry for free
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
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
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: '#111827',
    marginRight: 36,
  },
  headerSpacer: {
    width: 0,
  },
  statusBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  statusIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#111827',
  },
  statusSubtitle: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  mapWrap: {
    marginHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  radarOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userAvatarText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.white,
  },
  markerStack: {
    alignItems: 'center',
  },
  markerPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerVehicle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cancelButton: {
    marginTop: 18,
    marginHorizontal: 16,
    height: 54,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.7,
  },
  cancelButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  addressHint: {
    marginTop: 10,
    marginHorizontal: 16,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#111827',
    textAlign: 'center',
    lineHeight: 28,
  },
  modalMessage: {
    marginTop: 10,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalConfirmButton: {
    marginTop: 24,
    width: '100%',
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalRetryButton: {
    marginTop: 12,
    width: '100%',
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRetryText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.primary,
  },
});
