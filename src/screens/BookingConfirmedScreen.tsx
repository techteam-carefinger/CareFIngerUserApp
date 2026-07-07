import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  PermissionsAndroid,
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
import {storage} from '../services';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingConfirmed'>;

type LatLng = {latitude: number; longitude: number};

const PICKUP_COLOR = '#1E9E5A';
const CARETAKER_COLOR = '#2563EB';
const PICKUP_NEARBY_THRESHOLD_M = 80;

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceInMeters = (from: LatLng, to: LatLng) => {
  const earthRadiusM = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
};

const regionFromCoords = (points: LatLng[]): Region => {
  const lats = points.map(point => point.latitude);
  const lngs = points.map(point => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 2.2, 0.008),
    longitudeDelta: Math.max((maxLng - minLng) * 2.2, 0.008),
  };
};

const truncateAddress = (address: string, maxLength = 34) => {
  const trimmed = address.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}...`;
};

const formatPinDigits = (otp: number) => {
  const digits = String(Math.max(0, otp)).padStart(4, '0').slice(-4);
  return digits.split('');
};

export function BookingConfirmedScreen({navigation, route}: Props) {
  const {
    pickup,
    otp,
    providerName,
    providerRating,
    vehicleNumber,
    vehicleModel,
    etaMinutes,
    providerLatitude,
    providerLongitude,
  } = route.params;
  const {height: windowHeight} = useWindowDimensions();
  const mapHeight = Math.round(windowHeight * 0.42);
  const [userCoords, setUserCoords] = useState<LatLng | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(Platform.OS !== 'android');

  const pinDigits = useMemo(() => formatPinDigits(otp), [otp]);

  useEffect(() => {
    void (async () => {
      const savedLocation = await storage.getLocation();
      if (savedLocation) {
        setUserCoords({
          latitude: savedLocation.latitude,
          longitude: savedLocation.longitude,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    void (async () => {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted) {
          setHasLocationPermission(true);
          return;
        }

        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'CareFinger needs your location to guide you to the pickup point.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
            buttonNeutral: 'Ask Me Later',
          },
        );
        setHasLocationPermission(result === PermissionsAndroid.RESULTS.GRANTED);
      } catch {
        setHasLocationPermission(false);
      }
    })();
  }, []);

  const handleUserLocationChange = useCallback(
    (event: {nativeEvent: {coordinate?: LatLng}}) => {
      const coordinate = event.nativeEvent.coordinate;
      if (coordinate) {
        setUserCoords(coordinate);
      }
    },
    [],
  );

  const isAwayFromPickup = useMemo(() => {
    if (!userCoords) {
      return true;
    }
    return distanceInMeters(userCoords, pickup) > PICKUP_NEARBY_THRESHOLD_M;
  }, [pickup, userCoords]);

  const routeCoords = useMemo(() => {
    if (isAwayFromPickup && userCoords) {
      return [userCoords, pickup];
    }
    return [
      {latitude: providerLatitude, longitude: providerLongitude},
      pickup,
    ];
  }, [isAwayFromPickup, pickup, providerLatitude, providerLongitude, userCoords]);

  const mapRegion: Region = useMemo(() => {
    const points: LatLng[] = [pickup, {latitude: providerLatitude, longitude: providerLongitude}];
    if (userCoords) {
      points.push(userCoords);
    }
    return regionFromCoords(points);
  }, [pickup, providerLatitude, providerLongitude, userCoords]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.mapHeader}>
          <Pressable style={styles.iconButton} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <View style={styles.mapHeaderRight}>
            <Pressable style={styles.iconButton}>
              <Ionicons name="refresh" size={20} color="#111827" />
            </Pressable>
            <Pressable style={styles.iconButton}>
              <Ionicons name="ellipsis-vertical" size={20} color="#111827" />
            </Pressable>
          </View>
        </View>

        <View style={[styles.mapWrap, {height: mapHeight}]}>
          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={mapRegion}
            mapType="standard"
            showsUserLocation={hasLocationPermission}
            onUserLocationChange={handleUserLocationChange}
            scrollEnabled
            zoomEnabled
            rotateEnabled={false}
            pitchEnabled={false}>
            <Polyline
              coordinates={routeCoords}
              strokeColor="#111827"
              strokeWidth={3}
              lineDashPattern={[8, 8]}
            />

            <Marker coordinate={pickup} anchor={{x: 0.5, y: 0.5}}>
              <View style={styles.pickupMarker}>
                <View style={styles.pickupMarkerInner} />
              </View>
            </Marker>

            {isAwayFromPickup ? null : (
              <Marker
                coordinate={{latitude: providerLatitude, longitude: providerLongitude}}
                anchor={{x: 0.5, y: 0.5}}>
                <View style={styles.caretakerMarker}>
                  <Ionicons name="navigate" size={18} color={COLORS.white} />
                </View>
              </Marker>
            )}
          </MapView>

          <View style={styles.pickupLabel}>
            <Text style={styles.pickupLabelText} allowFontScaling={false}>
              Pickup
            </Text>
            <Ionicons name="pencil" size={14} color="#6B7280" />
          </View>

          <View style={styles.mapActions}>
            <Pressable style={styles.mapActionButton}>
              <Ionicons name="share-social-outline" size={18} color="#111827" />
            </Pressable>
            <Pressable style={styles.safetyButton}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#111827" />
              <Text style={styles.safetyText} allowFontScaling={false}>
                Safety
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sheet}>
          {isAwayFromPickup ? (
            <View style={styles.sheetBanner}>
              <Text style={styles.sheetBannerText} allowFontScaling={false}>
                Walk to your pickup-point
              </Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.etaText} allowFontScaling={false}>
              Pickup in <Text style={styles.etaHighlight}>{etaMinutes} mins</Text>
            </Text>

            <Text style={styles.pinTitle} allowFontScaling={false}>
              Start your order with PIN
            </Text>
            <View style={styles.pinRow}>
              {pinDigits.map((digit, index) => (
                <View key={`${digit}-${index}`} style={styles.pinBox}>
                  <Text style={styles.pinDigit} allowFontScaling={false}>
                    {digit}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.caretakerCard}>
              <View style={styles.caretakerInfo}>
                <Text style={styles.vehicleNumber} allowFontScaling={false}>
                  {vehicleNumber}
                </Text>
                <Text style={styles.vehicleModel} allowFontScaling={false}>
                  {vehicleModel}
                </Text>
                <Text style={styles.providerName} allowFontScaling={false}>
                  {providerName}
                </Text>
              </View>

              <View style={styles.caretakerRight}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText} allowFontScaling={false}>
                    {providerRating.toFixed(1)} ★
                  </Text>
                </View>
              </View>
            </View>

            {!isAwayFromPickup ? (
              <Pressable style={styles.messageRow}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#6B7280" />
                <Text style={styles.messagePlaceholder} allowFontScaling={false}>
                  Message {providerName.split(' ')[0]}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.pickupRow}>
              <View style={styles.pickupTextWrap}>
                <Text style={styles.pickupFromLabel} allowFontScaling={false}>
                  Pickup From
                </Text>
                <Text style={styles.pickupAddress} allowFontScaling={false} numberOfLines={2}>
                  {truncateAddress(pickup.address)}
                </Text>
              </View>
              <Pressable style={styles.tripDetailsButton}>
                <Text style={styles.tripDetailsText} allowFontScaling={false}>
                  Trip Details
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
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
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapHeaderRight: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  mapWrap: {
    backgroundColor: '#E5E7EB',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  pickupMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: PICKUP_COLOR,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PICKUP_COLOR,
  },
  caretakerMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: CARETAKER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  pickupLabel: {
    position: 'absolute',
    top: 18,
    left: '50%',
    transform: [{translateX: -42}],
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  pickupLabelText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#111827',
  },
  mapActions: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    alignItems: 'flex-end',
    gap: 10,
  },
  mapActionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  safetyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 3,
  },
  safetyText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#111827',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  sheetBanner: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sheetBannerText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.white,
  },
  etaText: {
    marginTop: 14,
    marginHorizontal: 16,
    fontFamily: FONTS.regular,
    fontSize: 18,
    color: '#111827',
  },
  etaHighlight: {
    fontFamily: FONTS.bold,
    color: PICKUP_COLOR,
  },
  pinTitle: {
    marginTop: 16,
    marginHorizontal: 16,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  pinRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginHorizontal: 16,
  },
  pinBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  pinDigit: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#111827',
  },
  caretakerCard: {
    marginTop: 18,
    marginHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caretakerInfo: {
    flex: 1,
    marginRight: 12,
  },
  vehicleNumber: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#111827',
  },
  vehicleModel: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  providerName: {
    marginTop: 8,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#111827',
  },
  caretakerRight: {
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  ratingBadge: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ratingText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: '#111827',
  },
  messageRow: {
    marginTop: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messagePlaceholder: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#9CA3AF',
  },
  pickupRow: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  pickupTextWrap: {
    flex: 1,
  },
  pickupFromLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  pickupAddress: {
    marginTop: 4,
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#111827',
  },
  tripDetailsButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tripDetailsText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#111827',
  },
});
