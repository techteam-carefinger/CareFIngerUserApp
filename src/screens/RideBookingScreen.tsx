import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE, Region} from 'react-native-maps';
import {SafeAreaView} from 'react-native-safe-area-context';

import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {CaretakerMarker} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RideBooking'>;

type LatLng = {latitude: number; longitude: number};

const GOOGLE_MAPS_API_KEY: string = 'AIzaSyBE3GNStuB23c1ZT8j9C2tfFuFFue4NY4U';
const THEME = '#0F8A9D';
const PICKUP_COLOR = '#1E9E5A';
const DROP_COLOR = '#D9642A';

type RideOption = {
  id: string;
  title: string;
  subtitle: string;
  eta: string;
  dropTime: string;
  price: number;
  originalPrice?: number;
  badge?: string;
};

const formatPrice = (price: number) => (price === 0 ? 'Free' : `₹${price}`);

const PAID_OPTION_IDS = new Set(['min-care-service', 'min-care-premium']);

const decodePolyline = (encoded: string): LatLng[] => {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({latitude: lat / 1e5, longitude: lng / 1e5});
  }

  return points;
};

const truncateAddress = (address: string, maxLength = 20) => {
  const trimmed = address.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}...`;
};

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const generateCaretakerBikes = (center: LatLng, count = 7): CaretakerMarker[] =>
  Array.from({length: count}, (_, index) => {
    const angle = seededRandom(index + center.latitude) * Math.PI * 2;
    const distance = 0.002 + seededRandom(index + center.longitude) * 0.006;
    return {
      id: `caretaker-${index}`,
      latitude: center.latitude + Math.cos(angle) * distance,
      longitude: center.longitude + Math.sin(angle) * distance,
    };
  });

const regionFromLocations = (pickup: LatLng, drop: LatLng): Region => {
  const minLat = Math.min(pickup.latitude, drop.latitude);
  const maxLat = Math.max(pickup.latitude, drop.latitude);
  const minLng = Math.min(pickup.longitude, drop.longitude);
  const maxLng = Math.max(pickup.longitude, drop.longitude);
  const latDelta = Math.max((maxLat - minLat) * 1.6, 0.02);
  const lngDelta = Math.max((maxLng - minLng) * 1.6, 0.02);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
};

const formatDropTime = () => {
  const date = new Date(Date.now() + 18 * 60 * 1000);
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export function RideBookingScreen({navigation, route}: Props) {
  const {pickup, drop} = route.params;
  const {height: windowHeight} = useWindowDimensions();
  const mapRef = useRef<MapView | null>(null);
  const mapHeight = Math.round(windowHeight * 0.46);

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [isRouteLoading, setIsRouteLoading] = useState(true);
  const [selectedOptionId, setSelectedOptionId] = useState('caretaker-free');
  const [rechargeOption, setRechargeOption] = useState<RideOption | null>(null);

  const caretakerBikes = useMemo(
    () => generateCaretakerBikes(pickup),
    [pickup.latitude, pickup.longitude],
  );

  const dropTime = useMemo(() => formatDropTime(), []);

  const rideOptions: RideOption[] = useMemo(
    () => [
      {
        id: 'caretaker-free',
        title: 'Caretaker free',
        subtitle: 'Free caretaker rides',
        eta: '3 mins away',
        dropTime: `Drop ${dropTime}`,
        price: 0,
        badge: 'FASTEST',
      },
      {
        id: 'min-care-service',
        title: 'Care service for 30 min',
        subtitle: 'Basic care assistance',
        eta: '5 mins',
        dropTime: `Drop ${dropTime}`,
        price: 49,
      },
      {
        id: 'min-care-premium',
        title: 'Care service for 1 hr',
        subtitle: 'Extended care support',
        eta: '6 mins',
        dropTime: `Drop ${dropTime}`,
        price: 99,
      },
    ],
    [dropTime],
  );

  const selectedOption =
    rideOptions.find(option => option.id === selectedOptionId) ?? rideOptions[0];

  const initialRegion = useMemo(
    () => regionFromLocations(pickup, drop),
    [pickup, drop],
  );

  const fetchRoute = useCallback(async () => {
    if (!GOOGLE_MAPS_API_KEY) {
      setRouteCoords([pickup, drop]);
      setIsRouteLoading(false);
      return;
    }

    try {
      setIsRouteLoading(true);
      const endpoint =
        'https://maps.googleapis.com/maps/api/directions/json' +
        `?origin=${pickup.latitude},${pickup.longitude}` +
        `&destination=${drop.latitude},${drop.longitude}` +
        `&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(endpoint);
      const data = (await response.json()) as {
        status?: string;
        routes?: Array<{overview_polyline?: {points?: string}}>;
      };

      const encoded = data.routes?.[0]?.overview_polyline?.points;
      if (data.status === 'OK' && encoded) {
        setRouteCoords(decodePolyline(encoded));
      } else {
        setRouteCoords([pickup, drop]);
      }
    } catch {
      setRouteCoords([pickup, drop]);
    } finally {
      setIsRouteLoading(false);
    }
  }, [pickup, drop]);

  useEffect(() => {
    void fetchRoute();
  }, [fetchRoute]);

  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates([pickup, drop, ...caretakerBikes], {
        edgePadding: {top: 90, right: 50, bottom: 90, left: 50},
        animated: true,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [pickup, drop, caretakerBikes, routeCoords.length]);

  const renderRideIcon = () => (
    <View style={styles.careIconWrap}>
      <Ionicons name="medkit-outline" size={24} color="#111827" />
    </View>
  );

  const handleOptionPress = (option: RideOption) => {
    if (PAID_OPTION_IDS.has(option.id)) {
      setRechargeOption(option);
      return;
    }
    setSelectedOptionId(option.id);
  };

  const handleBookPress = () => {
    if (PAID_OPTION_IDS.has(selectedOptionId)) {
      setRechargeOption(selectedOption);
      return;
    }

    navigation.navigate('PickupConfirm', {
      pickup,
      drop,
      serviceTitle: selectedOption.title,
      planAmount: selectedOption.price,
    });
  };

  const closeRechargeModal = () => setRechargeOption(null);

  const goToRecharge = () => {
    if (!rechargeOption) {
      return;
    }
    const option = rechargeOption;
    setRechargeOption(null);
    navigation.navigate('Recharge', {
      planTitle: option.title,
      amount: option.price,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={[styles.mapWrap, {height: mapHeight}]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={initialRegion}
            mapType="standard"
            loadingEnabled
            showsUserLocation={false}
            showsMyLocationButton={false}>
            <Marker coordinate={pickup} anchor={{x: 0.5, y: 1}}>
              <View style={styles.pickupMarker}>
                <Ionicons name="location" size={34} color={PICKUP_COLOR} />
              </View>
            </Marker>

            <Marker coordinate={drop} anchor={{x: 0.5, y: 1}}>
              <View style={styles.dropMarker}>
                <Ionicons name="location" size={34} color={DROP_COLOR} />
              </View>
            </Marker>

            {caretakerBikes.map(bike => (
              <Marker
                key={bike.id}
                coordinate={bike}
                anchor={{x: 0.5, y: 0.5}}
                tracksViewChanges={false}>
                <View style={styles.caretakerBikeMarker}>
                  <Ionicons name="medkit-outline" size={16} color="#111827" />
                </View>
              </Marker>
            ))}

            {routeCoords.length > 1 ? (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#111827"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            ) : null}
          </MapView>

          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>

          <View style={styles.pickupAddressPill}>
            <View style={[styles.addressDot, {borderColor: PICKUP_COLOR}]}>
              <View style={[styles.addressDotInner, {backgroundColor: PICKUP_COLOR}]} />
            </View>
            <Text style={styles.addressPillText} numberOfLines={1} allowFontScaling={false}>
              {truncateAddress(pickup.address)}
            </Text>
            <Pressable hitSlop={8} onPress={() => navigation.goBack()}>
              <Ionicons name="pencil" size={16} color="#6B7280" />
            </Pressable>
          </View>

          <View style={styles.dropAddressPill}>
            <View style={[styles.addressDot, {borderColor: DROP_COLOR}]}>
              <View style={[styles.addressDotInner, {backgroundColor: DROP_COLOR}]} />
            </View>
            <Text style={styles.addressPillText} numberOfLines={1} allowFontScaling={false}>
              {truncateAddress(drop.address)}
            </Text>
            <Pressable hitSlop={8} onPress={() => navigation.goBack()}>
              <Ionicons name="pencil" size={16} color="#6B7280" />
            </Pressable>
          </View>

          {isRouteLoading ? (
            <View style={styles.routeLoader}>
              <ActivityIndicator size="small" color={THEME} />
            </View>
          ) : null}
        </View>

        <View style={styles.bottomSheet}>
          <Text style={styles.promoText} allowFontScaling={false}>
            You get ₹20 off & 20 coins cashback!
          </Text>

          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsContent}
            showsVerticalScrollIndicator={false}>
            {rideOptions.map(option => {
              const isSelected = option.id === selectedOptionId;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => handleOptionPress(option)}>
                  <View style={styles.optionLeft}>
                    {renderRideIcon()}
                    <View style={styles.optionTextWrap}>
                      <View style={styles.optionTitleRow}>
                        <Text style={styles.optionTitle} allowFontScaling={false}>
                          {option.title}
                        </Text>
                        {option.badge ? (
                          <View style={styles.fastestBadge}>
                            <Text style={styles.fastestBadgeText} allowFontScaling={false}>
                              {option.badge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.optionSubtitle} allowFontScaling={false}>
                        {option.subtitle}
                      </Text>
                      <Text style={styles.optionEta} allowFontScaling={false}>
                        {option.eta} • {option.dropTime}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.optionPriceWrap}>
                    <Text style={styles.optionPrice} allowFontScaling={false}>
                      {formatPrice(option.price)}
                    </Text>
                    {option.originalPrice ? (
                      <Text style={styles.optionOriginalPrice} allowFontScaling={false}>
                        ₹{option.originalPrice}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={styles.bookButton} onPress={handleBookPress}>
            <Text style={styles.bookButtonText} allowFontScaling={false}>
              Book {selectedOption.title}
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={rechargeOption != null}
        transparent
        animationType="fade"
        onRequestClose={closeRechargeModal}>
        <Pressable style={styles.modalOverlay} onPress={closeRechargeModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="wallet-outline" size={32} color="#0E7490" />
            </View>
            <Text style={styles.modalTitle} allowFontScaling={false}>
              Recharge to proceed
            </Text>
            <Text style={styles.modalMessage} allowFontScaling={false}>
              Please recharge ₹{rechargeOption?.price ?? 0} to book{' '}
              {rechargeOption?.title ?? 'this care service'}.
            </Text>
            <Pressable style={styles.modalRechargeButton} onPress={goToRecharge}>
              <Text style={styles.modalRechargeText} allowFontScaling={false}>
                Recharge Now
              </Text>
            </Pressable>
            <Pressable style={styles.modalCancelButton} onPress={closeRechargeModal}>
              <Text style={styles.modalCancelText} allowFontScaling={false}>
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
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
  mapWrap: {
    width: '100%',
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 4,
  },
  pickupAddressPill: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  dropAddressPill: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  addressDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  addressPillText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#111827',
  },
  pickupMarker: {
    alignItems: 'center',
  },
  dropMarker: {
    alignItems: 'center',
  },
  caretakerBikeMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E0F2FE',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  routeLoader: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  promoText: {
    textAlign: 'center',
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#16A34A',
    marginBottom: 10,
  },
  optionsScroll: {
    flex: 1,
  },
  optionsContent: {
    paddingBottom: 8,
  },
  optionCard: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardSelected: {
    borderColor: '#1E3A8A',
    backgroundColor: '#F8FAFF',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  careIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  optionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#111827',
  },
  fastestBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  fastestBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
    color: '#1D4ED8',
  },
  optionSubtitle: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#6B7280',
  },
  optionEta: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#6B7280',
  },
  optionPriceWrap: {
    alignItems: 'flex-end',
  },
  optionPrice: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#111827',
  },
  optionOriginalPrice: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  bookButton: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: '#111827',
    textAlign: 'center',
  },
  modalMessage: {
    marginTop: 10,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalRechargeButton: {
    marginTop: 24,
    width: '100%',
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRechargeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalCancelButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  modalCancelText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#6B7280',
  },
});
