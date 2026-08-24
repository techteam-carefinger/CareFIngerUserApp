import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
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

export function RideBookingScreen({navigation, route}: Props) {
  const {pickup, drop} = route.params;
  const mapRef = useRef<MapView | null>(null);

  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [isRouteLoading, setIsRouteLoading] = useState(true);

  const caretakerBikes = useMemo(
    () => generateCaretakerBikes(pickup),
    [pickup.latitude, pickup.longitude],
  );

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

  const handleBookPress = () => {
    navigation.navigate('PickupConfirm', {
      pickup,
      drop,
      serviceTitle: 'Caretaker',
      planAmount: 0,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.mapWrap}>
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

          <Pressable style={styles.bookButton} onPress={handleBookPress}>
            <Text style={styles.bookButtonText} allowFontScaling={false}>
              Book caretaker
            </Text>
          </Pressable>
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
  mapWrap: {
    flex: 1,
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
  bookButton: {
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
});
