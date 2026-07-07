import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from '@react-native-vector-icons/ionicons';
import MapView, {PROVIDER_GOOGLE, Region} from 'react-native-maps';

import {BottomTab} from '../components/home/BottomTab';
import {LocationItem} from '../components/home/LocationItem';
import {SearchBar} from '../components/home/SearchBar';
import {ShareCard} from '../components/home/ShareCard';
import {FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {storage} from '../services';
import {CapturedLocation, SavedRecentPlace} from '../types';

type Tab = {
  icon: 'home-outline' | 'pricetag-outline' | 'person-outline';
  label: string;
};

type Banner = {
  id: string;
  image: any;
};

type Coords = {
  latitude: number;
  longitude: number;
};

const GOOGLE_MAPS_API_KEY: string = 'AIzaSyBE3GNStuB23c1ZT8j9C2tfFuFFue4NY4U';
const THEME = '#1F8A9E';

const DEFAULT_REGION: Region = {
  latitude: 23.2599,
  longitude: 77.4126,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const TABS: Tab[] = [
  {icon: 'home-outline', label: 'Home'},
  {icon: 'pricetag-outline', label: 'Offers'},
  {icon: 'person-outline', label: 'Profile'},
];

const BANNERS: Banner[] = [
  {
    id: '1',
    image: require('../../assets/image_02-74316f0a-4d16-4a6b-aee8-c8f780c105d4.png'),
  },
  {
    id: '2',
    image: require('../../assets/image_03-ff4d1607-151a-4944-bc56-39b0964c2d7a.png'),
  },
  {
    id: '3',
    image: require('../../assets/image_04-75184bd0-7e9c-44a5-9160-fc6e3a90d012.png'),
  },
  {
    id: '4',
    image: require('../../assets/Image_01-debbe5ef-8467-48ca-858e-b7080e094f34.png'),
  },
  {
    id: '5',
    image: require('../../assets/image_05-1ba0f72c-f4a4-487d-a8a9-4875ffd86fa0.png'),
  },
  {
    id: '6',
    image: require('../../assets/image_06-f0c54cdf-f726-4bd3-bc1f-2074a63de1f5.png'),
  },
];

export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {width, height} = useWindowDimensions();
  const bannerWidth = width - 32;
  const mapHeight = Math.round(height * 0.4);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const mapRef = useRef<MapView | null>(null);
  const hasCenteredRef = useRef(false);
  const lastUserCoordsRef = useRef<Coords | null>(null);
  const geocodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hasLocationPermission, setHasLocationPermission] = useState(
    Platform.OS === 'ios',
  );
  const [coords, setCoords] = useState<Coords | null>(null);
  const [address, setAddress] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [recentPlaces, setRecentPlaces] = useState<SavedRecentPlace[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        const places = await storage.getRecentPlaces();
        if (!cancelled) {
          setRecentPlaces(places);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    void bootstrapLocation();
    return () => {
      if (geocodeDebounceRef.current) {
        clearTimeout(geocodeDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bootstrapLocation = async () => {
    const cached = await storage.getLocation();
    if (cached) {
      setCoords({latitude: cached.latitude, longitude: cached.longitude});
      if (cached.address) {
        setAddress(cached.address);
      }
    }
    await requestLocationPermission();
  };

  const handleBannerScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / bannerWidth);
    setActiveBannerIndex(index);
  };

  const requestLocationPermission = async () => {
    if (Platform.OS !== 'android') {
      setHasLocationPermission(true);
      return;
    }

    try {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (alreadyGranted) {
        setHasLocationPermission(true);
        return;
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'CareFinger needs your location to set your pickup point and show nearby services.',
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

  const persistLocation = useCallback(
    (next: Coords, resolvedAddress?: string) => {
      const payload: CapturedLocation = {
        latitude: next.latitude,
        longitude: next.longitude,
        address: resolvedAddress,
        capturedAt: Date.now(),
      };
      void storage.setLocation(payload);
    },
    [],
  );

  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number) => {
      const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      if (!GOOGLE_MAPS_API_KEY) {
        setAddress(fallback);
        persistLocation({latitude, longitude}, fallback);
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

        const resolved = data.results?.[0]?.formatted_address;
        const finalAddress =
          data.status === 'OK' && resolved ? resolved : fallback;
        setAddress(finalAddress);
        persistLocation({latitude, longitude}, finalAddress);
      } catch {
        setAddress(fallback);
        persistLocation({latitude, longitude}, fallback);
      } finally {
        setIsResolving(false);
      }
    },
    [persistLocation],
  );

  const handleUserLocationChange = useCallback(
    (event: {nativeEvent: {coordinate?: Coords}}) => {
      const coordinate = event.nativeEvent.coordinate;
      if (!coordinate) {
        return;
      }

      const userCoords: Coords = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      };
      lastUserCoordsRef.current = userCoords;

      // Center on the user's real position only once; after that the pickup
      // point follows the map center so the user can drag to adjust it.
      if (!hasCenteredRef.current) {
        hasCenteredRef.current = true;
        mapRef.current?.animateToRegion(
          {
            ...userCoords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500,
        );
      }
    },
    [],
  );

  // Fires whenever the map settles (initial load, auto-center, or user drag).
  // The pickup point is always the map center, so we capture + geocode it here.
  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      const next: Coords = {
        latitude: region.latitude,
        longitude: region.longitude,
      };
      setCoords(next);

      if (geocodeDebounceRef.current) {
        clearTimeout(geocodeDebounceRef.current);
      }
      geocodeDebounceRef.current = setTimeout(() => {
        void reverseGeocode(next.latitude, next.longitude);
      }, 400);
    },
    [reverseGeocode],
  );

  const recenterOnUser = () => {
    const target = lastUserCoordsRef.current;
    if (!target) {
      return;
    }
    mapRef.current?.animateToRegion(
      {
        ...target,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      400,
    );
  };

  const openRecentPlace = useCallback(
    async (place: SavedRecentPlace) => {
      if (place.latitude == null || place.longitude == null) {
        navigation.navigate('LocationSearch', {
          pickedLocation: place.address,
          pickedTarget: 'destination',
          pickedLatitude: place.latitude,
          pickedLongitude: place.longitude,
        });
        return;
      }

      const pickupFromMap = coords
        ? {
            latitude: coords.latitude,
            longitude: coords.longitude,
            address: address || undefined,
          }
        : null;
      const pickupFromStorage = pickupFromMap ? null : await storage.getLocation();
      const pickup = pickupFromMap ?? pickupFromStorage;

      if (pickup) {
        navigation.navigate('RideBooking', {
          pickup: {
            address:
              pickup.address ||
              address ||
              `${pickup.latitude.toFixed(6)}, ${pickup.longitude.toFixed(6)}`,
            latitude: pickup.latitude,
            longitude: pickup.longitude,
          },
          drop: {
            address: place.address,
            latitude: place.latitude,
            longitude: place.longitude,
          },
        });
        return;
      }

      navigation.navigate('LocationSearch', {
        pickedLocation: place.address,
        pickedTarget: 'destination',
        pickedLatitude: place.latitude,
        pickedLongitude: place.longitude,
      });
    },
    [navigation, coords, address],
  );

  const handleShare = useCallback(async () => {
    const message = '#Umeed Hain #hope hain';
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(
          `https://wa.me/?text=${encodeURIComponent(message)}`,
        );
      }
    } catch (error) {
      // no-op: unable to open WhatsApp
    }
  }, []);

  const addressText = isResolving
    ? 'Fetching your location...'
    : address || 'Locating your pickup point...';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.screen}>
        <View style={[styles.mapContainer, {height: mapHeight}]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={
              coords
                ? {...coords, latitudeDelta: 0.01, longitudeDelta: 0.01}
                : DEFAULT_REGION
            }
            mapType="standard"
            loadingEnabled
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
            onUserLocationChange={handleUserLocationChange}
            onRegionChangeComplete={handleRegionChangeComplete}
          />

          <View pointerEvents="none" style={styles.centerMarker}>
            <View style={styles.pickupPill}>
              <Text style={styles.pickupPillText} allowFontScaling={false}>
                Pickup Point
              </Text>
            </View>
            <Ionicons
              name="location"
              size={38}
              color="#1E9E5A"
              style={styles.centerPin}
            />
          </View>

          <Pressable style={styles.recenterButton} onPress={recenterOnUser}>
            <Ionicons name="locate" size={22} color={THEME} />
          </Pressable>

          <View style={styles.addressCard}>
            <View style={styles.addressDot}>
              <View style={styles.addressDotInner} />
            </View>
            <Text
              style={styles.addressText}
              allowFontScaling={false}
              numberOfLines={1}>
              {addressText}
            </Text>
            {isResolving ? (
              <ActivityIndicator size="small" color={THEME} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}>
          <SearchBar onPress={() => navigation.navigate('LocationSearch')} />

          {recentPlaces.length > 0 ? (
            <View style={styles.card}>
              {recentPlaces.map((place, index) => (
                <LocationItem
                  key={place.id}
                  icon="time-outline"
                  title={place.title}
                  subtitle={place.subtitle}
                  isLast={index === recentPlaces.length - 1}
                  onPress={() => openRecentPlace(place)}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.bannerCarouselContainer}>
            <View style={styles.bannerWrap}>
              <FlatList
                data={BANNERS}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleBannerScrollEnd}
                renderItem={({item}) => (
                  <Image
                    source={item.image}
                    style={[styles.bannerImage, {width: bannerWidth}]}
                  />
                )}
              />
            </View>
            <View style={styles.dotWrap}>
              {BANNERS.map((banner, index) => (
                <View
                  key={banner.id}
                  style={[
                    styles.dot,
                    activeBannerIndex === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          </View>

          <ShareCard onPress={handleShare} />
        </ScrollView>

        <View style={styles.bottomBar}>
          {TABS.map(tab => (
            <BottomTab
              key={tab.label}
              icon={tab.icon}
              label={tab.label}
              active={tab.label === 'Home'}
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
    backgroundColor: '#FFFFFF',
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapContainer: {
    width: '100%',
    backgroundColor: '#E5E7EB',
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
  pickupPill: {
    backgroundColor: '#1E9E5A',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  pickupPillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  centerPin: {
    marginTop: -2,
  },
  recenterButton: {
    position: 'absolute',
    right: 16,
    bottom: 74,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  addressCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 6,
  },
  addressDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1E9E5A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addressDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1E9E5A',
  },
  addressText: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    marginRight: 8,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
  },
  bannerCarouselContainer: {
    marginTop: 16,
  },
  bannerWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  bannerImage: {
    aspectRatio: 4 / 3,
    backgroundColor: '#F8FAFC',
    resizeMode: 'contain',
  },
  dotWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.25)',
    marginHorizontal: 3,
  },
  activeDot: {
    width: 18,
    backgroundColor: '#1F8A9E',
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
