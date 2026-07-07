import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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

import {FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {storage} from '../services';

type Props = NativeStackScreenProps<RootStackParamList, 'MapPicker'>;

type Coords = {
  latitude: number;
  longitude: number;
};

const GOOGLE_MAPS_API_KEY: string = 'AIzaSyBE3GNStuB23c1ZT8j9C2tfFuFFue4NY4U';
const THEME = '#0F8A9D';
const DROP_COLOR = '#D9642A';
const PICKUP_COLOR = '#1E9E5A';

const DEFAULT_REGION: Region = {
  latitude: 23.2599,
  longitude: 77.4126,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const regionFromCoords = (coords: Coords): Region => ({
  latitude: coords.latitude,
  longitude: coords.longitude,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
});

export function MapPickerScreen({navigation, route}: Props) {
  const {target, initialQuery, initialLatitude, initialLongitude} = route.params;
  const {height: windowHeight} = useWindowDimensions();
  const hasInitialCoords = initialLatitude != null && initialLongitude != null;
  const [region, setRegion] = useState<Region>(() =>
    hasInitialCoords
      ? regionFromCoords({latitude: initialLatitude!, longitude: initialLongitude!})
      : DEFAULT_REGION,
  );
  const [selectedAddress, setSelectedAddress] = useState(initialQuery?.trim() || '');
  const [isResolving, setIsResolving] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(Platform.OS === 'ios');
  const [isMapReady, setIsMapReady] = useState(false);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(false);
  const lastUserCoordsRef = useRef<Coords | null>(null);
  const pendingRegionRef = useRef<Region | null>(null);

  // Explicit height avoids Android MapView rendering blank inside flex stacks.
  const mapHeight = Math.max(Math.round(windowHeight * 0.52), 280);

  const pinColor = target === 'destination' ? DROP_COLOR : PICKUP_COLOR;
  const markerLabel = target === 'destination' ? 'Drop location' : 'Pickup Point';

  useEffect(() => {
    void bootstrapMap();
    return () => {
      if (geocodeDebounceRef.current) {
        clearTimeout(geocodeDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (data.status === 'OK' && address) {
        setSelectedAddress(address);
      } else {
        setSelectedAddress(fallback);
      }
    } catch {
      setSelectedAddress(fallback);
    } finally {
      setIsResolving(false);
    }
  }, []);

  const forwardGeocode = async (
    query: string,
    bias?: Coords | null,
  ): Promise<Coords | null> => {
    if (!GOOGLE_MAPS_API_KEY) {
      return null;
    }

    try {
      let endpoint =
        'https://maps.googleapis.com/maps/api/geocode/json' +
        `?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&components=country:in`;
      if (bias) {
        endpoint += `&location=${bias.latitude},${bias.longitude}&radius=50000`;
      }
      const response = await fetch(endpoint);
      const data = (await response.json()) as {
        status?: string;
        results?: Array<{geometry?: {location?: {lat?: number; lng?: number}}}>;
      };
      const location = data.results?.[0]?.geometry?.location;
      if (data.status === 'OK' && location?.lat != null && location?.lng != null) {
        return {latitude: location.lat, longitude: location.lng};
      }
      return null;
    } catch {
      return null;
    }
  };

  const applyRegion = useCallback((nextRegion: Region, animated = true) => {
    setRegion(nextRegion);
    if (isMapReady && mapRef.current) {
      mapRef.current.animateToRegion(nextRegion, animated ? 400 : 0);
      pendingRegionRef.current = null;
      return;
    }
    pendingRegionRef.current = nextRegion;
  }, [isMapReady]);

  const centerMapOn = (coords: Coords, animated = true) => {
    applyRegion(regionFromCoords(coords), animated);
    void reverseGeocode(coords.latitude, coords.longitude);
  };

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
    if (pendingRegionRef.current && mapRef.current) {
      mapRef.current.animateToRegion(pendingRegionRef.current, 0);
      pendingRegionRef.current = null;
    }
  }, []);

  const bootstrapMap = async () => {
    await requestLocationPermission();

    if (hasInitialCoords) {
      hasCenteredRef.current = true;
      centerMapOn(
        {latitude: initialLatitude!, longitude: initialLongitude!},
        false,
      );
      if (initialQuery?.trim()) {
        setSelectedAddress(initialQuery.trim());
      }
      return;
    }

    const captured = await storage.getLocation();
    const pickupBias = captured
      ? {latitude: captured.latitude, longitude: captured.longitude}
      : null;

    const trimmedQuery = initialQuery?.trim();
    if (trimmedQuery) {
      const coords = await forwardGeocode(trimmedQuery, pickupBias);
      if (coords) {
        hasCenteredRef.current = true;
        centerMapOn(coords, false);
        setSelectedAddress(trimmedQuery);
        return;
      }
    }

    if (captured) {
      hasCenteredRef.current = true;
      centerMapOn(
        {latitude: captured.latitude, longitude: captured.longitude},
        false,
      );
      if (captured.address) {
        setSelectedAddress(captured.address);
      }
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') {
      setHasLocationPermission(true);
      return;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'CareFinger needs your location to show your position on the map.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
          buttonNeutral: 'Ask Me Later',
        },
      );

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      setHasLocationPermission(isGranted);

      if (!isGranted) {
        Alert.alert(
          'Permission required',
          'Enable location permission to use current location on map.',
        );
      }
    } catch {
      setHasLocationPermission(false);
    }
  };

  const handleUserLocationChange = useCallback(
    (event: {nativeEvent: {coordinate?: Coords}}) => {
      const coordinate = event.nativeEvent.coordinate;
      if (!coordinate) {
        return;
      }

      lastUserCoordsRef.current = coordinate;

      if (!hasCenteredRef.current) {
        hasCenteredRef.current = true;
        centerMapOn(coordinate);
      }
    },
    // centerMapOn is stable enough for this screen lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleRegionChangeComplete = useCallback(
    (nextRegion: Region) => {
      setRegion(nextRegion);

      if (geocodeDebounceRef.current) {
        clearTimeout(geocodeDebounceRef.current);
      }
      geocodeDebounceRef.current = setTimeout(() => {
        void reverseGeocode(nextRegion.latitude, nextRegion.longitude);
      }, 400);
    },
    [reverseGeocode],
  );

  const title = useMemo(
    () => (target === 'current' ? 'Select Pickup' : 'Select Drop'),
    [target],
  );

  const onConfirm = () => {
    const location =
      selectedAddress || `${region.latitude.toFixed(6)}, ${region.longitude.toFixed(6)}`;

    navigation.navigate({
      name: 'LocationSearch',
      params: {
        pickedLocation: location,
        pickedTarget: target,
        pickedLatitude: region.latitude,
        pickedLongitude: region.longitude,
      },
      merge: true,
    });
  };

  const moveToCurrentLocation = () => {
    const targetCoords = lastUserCoordsRef.current;
    if (!targetCoords) {
      return;
    }
    centerMapOn(targetCoords);
  };

  const addressText = isResolving
    ? 'Fetching address...'
    : selectedAddress || 'Move map to choose location';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.topSheet}>
          <View style={styles.titleRow}>
            <Text style={styles.title} allowFontScaling={false} numberOfLines={1}>
              {title}
            </Text>
            <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
              <Ionicons name="close" size={26} color={THEME} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={22} color={THEME} />
            <Text style={styles.searchPlaceholder} allowFontScaling={false}>
              Search address
            </Text>
          </View>
        </View>

        <View style={[styles.mapWrap, {height: mapHeight}]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={region}
            mapType="standard"
            loadingEnabled
            onMapReady={handleMapReady}
            onUserLocationChange={handleUserLocationChange}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
          />

          <View pointerEvents="none" style={styles.centerMarker}>
            <View style={[styles.markerPill, {backgroundColor: pinColor}]}>
              <Text style={styles.markerPillText} allowFontScaling={false}>
                {markerLabel}
              </Text>
            </View>
            <Ionicons name="location" size={40} color={pinColor} style={styles.centerPin} />
          </View>

          <Pressable style={styles.myLocationButton} onPress={moveToCurrentLocation}>
            <Ionicons name="locate" size={24} color={THEME} />
          </Pressable>
        </View>

        <View style={styles.bottomCard}>
        <View style={styles.addressRow}>
          <View style={[styles.addressDot, {borderColor: pinColor}]}>
            <View style={[styles.addressDotInner, {backgroundColor: pinColor}]} />
          </View>
          <Text style={styles.selectedAddress} allowFontScaling={false} numberOfLines={2}>
            {addressText}
          </Text>
          {isResolving ? <ActivityIndicator size="small" color={THEME} /> : null}
        </View>
        <View style={styles.addressDivider} />
        <Pressable style={styles.confirmButton} onPress={onConfirm}>
          <Text style={styles.confirmText} allowFontScaling={false}>
            Continue
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
    backgroundColor: '#F3F4F6',
  },
  screen: {
    flex: 1,
  },
  topSheet: {
    backgroundColor: '#F8FAFC',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  titleRow: {
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.semiBold,
    color: '#111827',
    fontSize: 20,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    marginTop: 10,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  searchPlaceholder: {
    fontFamily: FONTS.regular,
    color: '#9CA3AF',
    fontSize: 16,
  },
  mapWrap: {
    width: '100%',
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  markerPill: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  markerPillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  centerPin: {
    marginTop: -2,
  },
  myLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  selectedAddress: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#111827',
  },
  addressDivider: {
    marginTop: 10,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  confirmButton: {
    marginTop: 12,
    backgroundColor: THEME,
    borderRadius: 8,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
});
