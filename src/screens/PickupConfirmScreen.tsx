import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import MapView, {PROVIDER_GOOGLE, Region} from 'react-native-maps';
import {SafeAreaView} from 'react-native-safe-area-context';

import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {storage} from '../services';

type Props = NativeStackScreenProps<RootStackParamList, 'PickupConfirm'>;

type Coords = {latitude: number; longitude: number};

const GOOGLE_MAPS_API_KEY: string = 'AIzaSyBE3GNStuB23c1ZT8j9C2tfFuFFue4NY4U';
const PICKUP_COLOR = '#1E9E5A';

const regionFromCoords = (coords: Coords): Region => ({
  latitude: coords.latitude,
  longitude: coords.longitude,
  latitudeDelta: 0.006,
  longitudeDelta: 0.006,
});

export function PickupConfirmScreen({navigation, route}: Props) {
  const {pickup, drop, serviceTitle} = route.params;
  const {height: windowHeight} = useWindowDimensions();
  const mapHeight = Math.round(windowHeight * 0.58);

  const mapRef = useRef<MapView | null>(null);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserCoordsRef = useRef<Coords | null>(null);

  const [region, setRegion] = useState<Region>(() =>
    regionFromCoords({latitude: pickup.latitude, longitude: pickup.longitude}),
  );
  const [selectedCoords, setSelectedCoords] = useState<Coords>({
    latitude: pickup.latitude,
    longitude: pickup.longitude,
  });
  const [selectedAddress, setSelectedAddress] = useState(pickup.address);
  const [isResolving, setIsResolving] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(Platform.OS === 'ios');

  useEffect(() => {
    void requestLocationPermission();
    return () => {
      if (geocodeDebounceRef.current) {
        clearTimeout(geocodeDebounceRef.current);
      }
    };
  }, []);

  const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    if (!GOOGLE_MAPS_API_KEY) {
      setSelectedAddress(fallback);
      return;
    }

    try {
      setIsResolving(true);
      const endpoint =
        'https://maps.googleapis.com/maps/api/geocode/json' +
        `?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(endpoint);
      const data = (await response.json()) as {
        status?: string;
        results?: Array<{formatted_address?: string}>;
      };

      const address = data.results?.[0]?.formatted_address;
      setSelectedAddress(data.status === 'OK' && address ? address : fallback);
    } catch {
      setSelectedAddress(fallback);
    } finally {
      setIsResolving(false);
    }
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') {
      setHasLocationPermission(true);
      return;
    }

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
          message: 'CareFinger needs your location to confirm your pickup point.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
          buttonNeutral: 'Ask Me Later',
        },
      );
      setHasLocationPermission(result === PermissionsAndroid.RESULTS.GRANTED);
    } catch {
      setHasLocationPermission(false);
    }
  };

  const handleRegionChangeComplete = useCallback(
    (nextRegion: Region) => {
      setRegion(nextRegion);
      const nextCoords = {latitude: nextRegion.latitude, longitude: nextRegion.longitude};
      setSelectedCoords(nextCoords);

      if (geocodeDebounceRef.current) {
        clearTimeout(geocodeDebounceRef.current);
      }
      geocodeDebounceRef.current = setTimeout(() => {
        void reverseGeocode(nextCoords.latitude, nextCoords.longitude);
      }, 400);
    },
    [reverseGeocode],
  );

  const handleUserLocationChange = useCallback(
    (event: {nativeEvent: {coordinate?: Coords}}) => {
      const coordinate = event.nativeEvent.coordinate;
      if (coordinate) {
        lastUserCoordsRef.current = coordinate;
      }
    },
    [],
  );

  const moveToCurrentLocation = () => {
    const target = lastUserCoordsRef.current;
    if (!target) {
      return;
    }
    const nextRegion = regionFromCoords(target);
    setRegion(nextRegion);
    setSelectedCoords(target);
    mapRef.current?.animateToRegion(nextRegion, 400);
    void reverseGeocode(target.latitude, target.longitude);
  };

  const onConfirmPickup = async () => {
    const token = await storage.getToken();
    if (!token) {
      Alert.alert('Login required', 'Please log in to book a caretaker.', [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Login', onPress: () => navigation.navigate('Login')},
      ]);
      return;
    }

    void storage.setLocation({
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
      address: selectedAddress,
      capturedAt: Date.now(),
    });

    navigation.replace('SearchingCaretaker', {
      latitude: selectedCoords.latitude,
      longitude: selectedCoords.longitude,
      address: selectedAddress,
    });
  };

  const addressLineOne = selectedAddress.split(',')[0]?.trim() || selectedAddress;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={[styles.mapWrap, {height: mapHeight}]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={region}
            mapType="standard"
            loadingEnabled
            onRegionChangeComplete={handleRegionChangeComplete}
            onUserLocationChange={handleUserLocationChange}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
          />

          <View pointerEvents="none" style={styles.centerMarker}>
            <View style={styles.pickupPill}>
              <Text style={styles.pickupPillText} allowFontScaling={false}>
                Pickup Point
              </Text>
            </View>
            <Ionicons name="location" size={40} color={PICKUP_COLOR} style={styles.centerPin} />
          </View>

          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>

          <Pressable style={styles.myLocationButton} onPress={moveToCurrentLocation}>
            <Ionicons name="locate" size={22} color="#0F8A9D" />
          </Pressable>
        </View>

        <View style={styles.bottomSheet}>
          <View style={styles.headingRow}>
            <Ionicons name="location" size={22} color={PICKUP_COLOR} />
            <View style={styles.headingTextWrap}>
              <Text style={styles.headingTitle} allowFontScaling={false}>
                Check your pickup point
              </Text>
              <Text style={styles.headingSubtitle} allowFontScaling={false}>
                Select a nearby point for easier pickup
              </Text>
            </View>
          </View>

          <View style={styles.addressBox}>
            <Text style={styles.addressLineOne} allowFontScaling={false} numberOfLines={1}>
              {addressLineOne}
            </Text>
            <Text style={styles.addressLineTwo} allowFontScaling={false} numberOfLines={2}>
              {isResolving ? 'Fetching address...' : selectedAddress}
            </Text>
            {isResolving ? (
              <ActivityIndicator
                size="small"
                color={PICKUP_COLOR}
                style={styles.addressLoader}
              />
            ) : null}
          </View>

          <Pressable
            style={styles.confirmButton}
            onPress={() => void onConfirmPickup()}
            disabled={isResolving}>
            <Text style={styles.confirmButtonText} allowFontScaling={false}>
              Confirm pickup
            </Text>
          </Pressable>

          <Text style={styles.serviceHint} allowFontScaling={false}>
            Booking {serviceTitle} to {drop.address.split(',')[0]?.trim() || 'destination'}
          </Text>
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
    width: '100%',
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  centerMarker: {
    position: 'absolute',
    top: 0,
    bottom: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pickupPill: {
    backgroundColor: PICKUP_COLOR,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  pickupPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  centerPin: {
    marginTop: -2,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 4,
  },
  myLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 4,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  headingTextWrap: {
    flex: 1,
  },
  headingTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#111827',
  },
  headingSubtitle: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  addressBox: {
    borderWidth: 2,
    borderColor: PICKUP_COLOR,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 72,
    justifyContent: 'center',
  },
  addressLineOne: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#111827',
    marginBottom: 4,
  },
  addressLineTwo: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  addressLoader: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  confirmButton: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  serviceHint: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#9CA3AF',
  },
});
