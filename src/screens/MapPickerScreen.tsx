import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Alert, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {CommonActions} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import MapView, {PROVIDER_GOOGLE, Region} from 'react-native-maps';
import {SafeAreaView} from 'react-native-safe-area-context';

import {FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MapPicker'>;

const GOOGLE_MAPS_API_KEY: string = 'AIzaSyBE3GNStuB23c1ZT8j9C2tfFuFFue4NY4U';
const DEFAULT_REGION: Region = {
  latitude: 28.6139,
  longitude: 77.209,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function MapPickerScreen({navigation, route}: Props) {
  const {target, initialQuery} = route.params;
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [selectedAddress, setSelectedAddress] = useState(initialQuery?.trim() || '');
  const [isResolving, setIsResolving] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(Platform.OS === 'ios');
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    void requestLocationPermission();
  }, []);

  useEffect(() => {
    if (geocodeDebounceRef.current) {
      clearTimeout(geocodeDebounceRef.current);
    }

    geocodeDebounceRef.current = setTimeout(() => {
      void reverseGeocode(region.latitude, region.longitude);
    }, 400);

    return () => {
      if (geocodeDebounceRef.current) {
        clearTimeout(geocodeDebounceRef.current);
      }
    };
  }, [region.latitude, region.longitude]);

  const reverseGeocode = async (latitude: number, longitude: number) => {
    if (!GOOGLE_MAPS_API_KEY) {
      setSelectedAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
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
        setSelectedAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch {
      setSelectedAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    } finally {
      setIsResolving(false);
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
        title: 'Location Permission',
        message: 'CareFinger needs your location to show your position on the map.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
        buttonNeutral: 'Ask Me Later',
      });

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      setHasLocationPermission(isGranted);

      if (!isGranted) {
        Alert.alert('Permission required', 'Enable location permission to use current location on map.');
      }
    } catch {
      setHasLocationPermission(false);
    }
  };

  const title = useMemo(() => (target === 'current' ? 'Select Pickup' : 'Select Drop'), [target]);

  const onConfirm = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'LocationSearch',
        params: {
          pickedLocation: selectedAddress || `${region.latitude.toFixed(6)}, ${region.longitude.toFixed(6)}`,
          pickedTarget: target,
        },
        merge: true,
      }),
    );
  };

  const moveToCurrentLocation = () => {
    if (!hasLocationPermission || !mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion(
      {
        ...region,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      250,
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topSheet}>
        <View style={styles.titleRow}>
          <Text style={styles.title} allowFontScaling={false} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
            <Ionicons name="close" size={26} color="#0F8A9D" />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={22} color="#0F8A9D" />
          <Text style={styles.searchPlaceholder} allowFontScaling={false}>
            Search address
          </Text>
        </View>
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={DEFAULT_REGION}
          mapType="standard"
          loadingEnabled
          onRegionChangeComplete={setRegion}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}>
          {/* Marker is fixed at map center to pick location */}
        </MapView>

        <View pointerEvents="none" style={styles.centerPinWrap}>
          <Ionicons name="location" size={40} color="#0F8A9D" />
        </View>

        <Pressable style={styles.myLocationButton} onPress={moveToCurrentLocation}>
          <Ionicons name="locate" size={24} color="#0F8A9D" />
        </Pressable>
      </View>

      <View style={styles.bottomCard}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={20} color="#0F8A9D" />
          <Text style={styles.selectedAddress} allowFontScaling={false} numberOfLines={2}>
            {isResolving ? 'Fetching address...' : selectedAddress || 'Move map to choose location'}
          </Text>
        </View>
        <View style={styles.addressDivider} />
        <Pressable style={styles.confirmButton} onPress={onConfirm}>
          <Text style={styles.confirmText} allowFontScaling={false}>
            Set Address
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centerPinWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    alignItems: 'center',
    marginTop: -36,
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
    backgroundColor: '#0F8A9D',
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
