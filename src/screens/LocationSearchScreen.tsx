import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';

import {FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {storage} from '../services';
import {SavedRecentPlace} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationSearch'>;
type AutocompletePrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type LatLng = {latitude: number; longitude: number};

type PlaceResult = {
  place_id: string;
  name: string;
  address: string;
  description: string;
  distanceKm: number | null;
  latitude?: number;
  longitude?: number;
};

const GOOGLE_MAPS_API_KEY: string = 'AIzaSyBE3GNStuB23c1ZT8j9C2tfFuFFue4NY4U';

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceInKm = (from: LatLng, to: LatLng) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
};

const formatDistance = (km: number | null) => {
  if (km == null) {
    return '';
  }
  if (km >= 100) {
    return `${Math.round(km)} km`;
  }
  if (km >= 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${km.toFixed(1)} km`;
};

const predictionToResult = (prediction: AutocompletePrediction): PlaceResult => {
  const mainText = prediction.structured_formatting?.main_text;
  const secondaryText = prediction.structured_formatting?.secondary_text;
  return {
    place_id: prediction.place_id,
    name: mainText || prediction.description,
    address: secondaryText || prediction.description,
    description: prediction.description,
    distanceKm: null,
  };
};

const parseAddressParts = (address: string) => {
  const parts = address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  return {
    title: parts[0] || address,
    subtitle: parts.slice(1).join(', ') || address,
  };
};

export function LocationSearchScreen({navigation, route}: Props) {
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<PlaceResult[]>([]);
  const [isLocationAutocompleteLoading, setIsLocationAutocompleteLoading] = useState(false);
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<LatLng | null>(null);
  const [destinationSuggestions, setDestinationSuggestions] = useState<PlaceResult[]>([]);
  const [isDestinationAutocompleteLoading, setIsDestinationAutocompleteLoading] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [recentPlaces, setRecentPlaces] = useState<SavedRecentPlace[]>([]);
  const pickupCoordsRef = useRef<LatLng | null>(null);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationFetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextCurrentFetchRef = useRef(false);
  const skipNextDestinationFetchRef = useRef(false);

  const loadRecentPlaces = useCallback(async () => {
    const places = await storage.getRecentPlaces();
    setRecentPlaces(places);
  }, []);

  const saveRecentDrop = useCallback(
    async (input: {
      address: string;
      title?: string;
      subtitle?: string;
      latitude?: number;
      longitude?: number;
      placeId?: string;
    }) => {
      const address = input.address.trim();
      if (!address) {
        return;
      }

      const parts = parseAddressParts(address);
      await storage.addRecentPlace({
        title: input.title || parts.title,
        subtitle: input.subtitle || parts.subtitle,
        address,
        latitude: input.latitude,
        longitude: input.longitude,
        placeId: input.placeId,
      });
      await loadRecentPlaces();
    },
    [loadRecentPlaces],
  );

  // Seed pickup from captured home location. Also re-runs on focus so pickup
  // survives LocationSearch remounting after returning from MapPicker.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        const [captured, recent] = await Promise.all([
          storage.getLocation(),
          storage.getRecentPlaces(),
        ]);
        if (cancelled) {
          return;
        }

        setRecentPlaces(recent);

        if (!captured) {
          return;
        }

        pickupCoordsRef.current = {
          latitude: captured.latitude,
          longitude: captured.longitude,
        };

        setLocationSearch(current => {
          if (current.trim()) {
            return current;
          }
          skipNextCurrentFetchRef.current = true;
          return (
            captured.address ||
            `${captured.latitude.toFixed(6)}, ${captured.longitude.toFixed(6)}`
          );
        });
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    if (skipNextCurrentFetchRef.current) {
      skipNextCurrentFetchRef.current = false;
      return;
    }

    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }

    const trimmedQuery = locationSearch.trim();
    if (trimmedQuery.length < 2) {
      setLocationSuggestions([]);
      setIsLocationAutocompleteLoading(false);
      return;
    }

    fetchDebounceRef.current = setTimeout(() => {
      void fetchLocationSuggestions(trimmedQuery, 'current');
    }, 350);

    return () => {
      if (fetchDebounceRef.current) {
        clearTimeout(fetchDebounceRef.current);
      }
    };
  }, [locationSearch]);

  useEffect(() => {
    if (skipNextDestinationFetchRef.current) {
      skipNextDestinationFetchRef.current = false;
      return;
    }

    if (destinationFetchDebounceRef.current) {
      clearTimeout(destinationFetchDebounceRef.current);
    }

    const trimmedQuery = destination.trim();
    if (trimmedQuery.length < 2) {
      setDestinationSuggestions([]);
      setIsDestinationAutocompleteLoading(false);
      return;
    }

    destinationFetchDebounceRef.current = setTimeout(() => {
      void fetchLocationSuggestions(trimmedQuery, 'destination');
    }, 350);

    return () => {
      if (destinationFetchDebounceRef.current) {
        clearTimeout(destinationFetchDebounceRef.current);
      }
    };
  }, [destination]);

  const fetchPlaceCoords = async (placeId: string): Promise<LatLng | null> => {
    try {
      const endpoint =
        'https://maps.googleapis.com/maps/api/place/details/json' +
        `?place_id=${encodeURIComponent(placeId)}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(endpoint);
      const data = (await response.json()) as {
        status?: string;
        result?: {geometry?: {location?: {lat?: number; lng?: number}}};
      };
      const location = data.result?.geometry?.location;
      if (data.status === 'OK' && location?.lat != null && location?.lng != null) {
        return {latitude: location.lat, longitude: location.lng};
      }
      return null;
    } catch {
      return null;
    }
  };

  const enrichResultsWithDistance = (results: PlaceResult[], target: 'current' | 'destination') => {
    const origin = pickupCoordsRef.current;
    if (!origin) {
      return;
    }

    results.forEach(result => {
      void (async () => {
        const coords = await fetchPlaceCoords(result.place_id);
        if (!coords) {
          return;
        }
        const km = distanceInKm(origin, coords);
        const applyDistance = (prev: PlaceResult[]) =>
          prev.map(item =>
            item.place_id === result.place_id
              ? {...item, distanceKm: km, latitude: coords.latitude, longitude: coords.longitude}
              : item,
          );
        if (target === 'current') {
          setLocationSuggestions(applyDistance);
        } else {
          setDestinationSuggestions(applyDistance);
        }
      })();
    });
  };

  const fetchLocationSuggestions = async (query: string, target: 'current' | 'destination') => {
    if (!GOOGLE_MAPS_API_KEY) {
      if (target === 'current') {
        setLocationSuggestions([]);
      } else {
        setDestinationSuggestions([]);
      }
      return;
    }

    try {
      if (target === 'current') {
        setIsLocationAutocompleteLoading(true);
      } else {
        setIsDestinationAutocompleteLoading(true);
      }
      const endpoint =
        'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
        `?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&components=country:in`;
      const response = await fetch(endpoint);
      const data = (await response.json()) as {
        status?: string;
        predictions?: AutocompletePrediction[];
      };

      if (data.status === 'OK' && Array.isArray(data.predictions)) {
        const results = data.predictions.map(predictionToResult);
        if (target === 'current') {
          setLocationSuggestions(results);
        } else {
          setDestinationSuggestions(results);
        }
        enrichResultsWithDistance(results, target);
      } else {
        if (target === 'current') {
          setLocationSuggestions([]);
        } else {
          setDestinationSuggestions([]);
        }
      }
    } catch {
      if (target === 'current') {
        setLocationSuggestions([]);
      } else {
        setDestinationSuggestions([]);
      }
    } finally {
      if (target === 'current') {
        setIsLocationAutocompleteLoading(false);
      } else {
        setIsDestinationAutocompleteLoading(false);
      }
    }
  };

  const onSelectLocationSuggestion = (result: PlaceResult) => {
    skipNextCurrentFetchRef.current = true;
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    setLocationSearch(result.description);
    setLocationSuggestions([]);
    setIsLocationAutocompleteLoading(false);
  };

  const onSelectDestinationSuggestion = (result: PlaceResult) => {
    skipNextDestinationFetchRef.current = true;
    if (destinationFetchDebounceRef.current) {
      clearTimeout(destinationFetchDebounceRef.current);
    }
    setDestination(result.description);
    setDestinationSuggestions([]);
    setIsDestinationAutocompleteLoading(false);

    const coords =
      result.latitude != null && result.longitude != null
        ? {latitude: result.latitude, longitude: result.longitude}
        : null;

    if (coords) {
      setDestinationCoords(coords);
    }

    void saveRecentDrop({
      address: result.description,
      title: result.name,
      subtitle: result.address,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      placeId: result.place_id,
    });

    if (coords) {
      return;
    }

    void fetchPlaceCoords(result.place_id).then(resolved => {
      if (resolved) {
        setDestinationCoords(resolved);
      }
    });
  };

  const onSelectRecentPlace = (place: SavedRecentPlace) => {
    skipNextDestinationFetchRef.current = true;
    setDestination(place.address);
    setDestinationSuggestions([]);
    if (place.latitude != null && place.longitude != null) {
      setDestinationCoords({latitude: place.latitude, longitude: place.longitude});
    } else {
      setDestinationCoords(null);
    }
    void saveRecentDrop({
      address: place.address,
      title: place.title,
      subtitle: place.subtitle,
      latitude: place.latitude,
      longitude: place.longitude,
      placeId: place.placeId,
    });
  };

  const toggleFavorite = (placeId: string) => {
    setFavorites(prev => ({...prev, [placeId]: !prev[placeId]}));
  };

  useEffect(() => {
    const pickedLocation = route.params?.pickedLocation;
    const pickedTarget = route.params?.pickedTarget;
    const pickedLatitude = route.params?.pickedLatitude;
    const pickedLongitude = route.params?.pickedLongitude;

    if (!pickedLocation || !pickedTarget) {
      return;
    }

    if (pickedTarget === 'current') {
      skipNextCurrentFetchRef.current = true;
      setLocationSearch(pickedLocation);
      setLocationSuggestions([]);
    } else {
      skipNextDestinationFetchRef.current = true;
      setDestination(pickedLocation);
      setDestinationSuggestions([]);
      if (pickedLatitude != null && pickedLongitude != null) {
        setDestinationCoords({latitude: pickedLatitude, longitude: pickedLongitude});
      }
      void saveRecentDrop({
        address: pickedLocation,
        latitude: pickedLatitude,
        longitude: pickedLongitude,
      });
    }

    navigation.setParams({
      pickedLocation: undefined,
      pickedTarget: undefined,
      pickedLatitude: undefined,
      pickedLongitude: undefined,
    });
  }, [
    navigation,
    route.params?.pickedLocation,
    route.params?.pickedTarget,
    route.params?.pickedLatitude,
    route.params?.pickedLongitude,
    saveRecentDrop,
  ]);

  const forwardGeocodeWithBias = async (
    query: string,
    bias: LatLng | null,
  ): Promise<LatLng | null> => {
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

  const openMapLocation = async () => {
    let latitude = destinationCoords?.latitude;
    let longitude = destinationCoords?.longitude;

    if ((latitude == null || longitude == null) && destination.trim()) {
      const resolved = await forwardGeocodeWithBias(
        destination.trim(),
        pickupCoordsRef.current,
      );
      if (resolved) {
        latitude = resolved.latitude;
        longitude = resolved.longitude;
        setDestinationCoords(resolved);
      }
    }

    navigation.navigate('MapPicker', {
      target: 'destination',
      initialQuery: destination.trim() || undefined,
      initialLatitude: latitude,
      initialLongitude: longitude,
    });
  };

  const renderResultsList = (
    results: PlaceResult[],
    onSelect: (result: PlaceResult) => void,
  ) => (
    <View style={styles.resultsList}>
      {results.map((result, index) => {
        const distanceLabel = formatDistance(result.distanceKm);
        const isLast = index === results.length - 1;
        return (
          <Pressable
            key={result.place_id}
            style={[styles.resultRow, isLast && styles.resultRowLast]}
            onPress={() => onSelect(result)}>
            <View style={styles.resultLeft}>
              <Ionicons name="location-sharp" size={20} color="#334155" />
              {distanceLabel ? (
                <Text style={styles.resultDistance} allowFontScaling={false}>
                  {distanceLabel}
                </Text>
              ) : null}
            </View>
            <View style={styles.resultTextWrap}>
              <Text style={styles.resultName} allowFontScaling={false} numberOfLines={1}>
                {result.name}
              </Text>
              <Text style={styles.resultAddress} allowFontScaling={false} numberOfLines={1}>
                {result.address}
              </Text>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => toggleFavorite(result.place_id)}
              style={styles.favoriteButton}>
              <Ionicons
                name={favorites[result.place_id] ? 'heart' : 'heart-outline'}
                size={22}
                color={favorites[result.place_id] ? '#EF4444' : '#94A3B8'}
              />
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );

  const hasActiveResults =
    locationSuggestions.length > 0 ||
    destinationSuggestions.length > 0 ||
    isLocationAutocompleteLoading ||
    isDestinationAutocompleteLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0E7490" />
          </Pressable>
          <Text style={styles.title} allowFontScaling={false} numberOfLines={1}>
            Where are you going?
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.mainCard}>
          <View style={styles.row}>
            <View style={[styles.pinRing, styles.pickupRing]} />
            <TextInput
              value={locationSearch}
              onChangeText={setLocationSearch}
              placeholder="Pickup location"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              allowFontScaling={false}
            />
          </View>

          <View style={styles.dottedLine} />

          <View style={styles.row}>
            <View style={[styles.pinRing, styles.dropRing]} />
            <TextInput
              value={destination}
              onChangeText={text => {
                setDestination(text);
                setDestinationCoords(null);
              }}
              placeholder="Drop location"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              allowFontScaling={false}
            />
          </View>
        </View>

        <View style={styles.pillRow}>
          <Pressable style={styles.pillButton} onPress={openMapLocation}>
            <Ionicons name="location" size={16} color="#0E7490" />
            <Text style={styles.pillText} allowFontScaling={false}>
              Select from map
            </Text>
          </Pressable>
        </View>

        {isLocationAutocompleteLoading || isDestinationAutocompleteLoading ? (
          <Text style={styles.loadingText} allowFontScaling={false}>
            Searching...
          </Text>
        ) : null}

        {locationSuggestions.length > 0
          ? renderResultsList(locationSuggestions, onSelectLocationSuggestion)
          : null}

        {destinationSuggestions.length > 0
          ? renderResultsList(destinationSuggestions, onSelectDestinationSuggestion)
          : null}

        {hasActiveResults ? null : recentPlaces.length > 0 ? (
          <>
            <Text style={styles.sectionTitle} allowFontScaling={false}>
              Recent Places
            </Text>

            <View style={styles.recentCard}>
              {recentPlaces.map((place, index) => (
                <Pressable
                  key={place.id}
                  style={[
                    styles.placeRow,
                    index === recentPlaces.length - 1 && styles.lastRow,
                  ]}
                  onPress={() => onSelectRecentPlace(place)}>
                  <View style={styles.leftWrap}>
                    <View style={styles.placeIconWrap}>
                      <Ionicons name="time-outline" size={20} color="#0E7490" />
                    </View>
                    <View style={styles.placeTextWrap}>
                      <Text style={styles.placeTitle} allowFontScaling={false} numberOfLines={1}>
                        {place.title}
                      </Text>
                      <Text style={styles.placeSubtitle} allowFontScaling={false} numberOfLines={2}>
                        {place.subtitle}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="arrow-forward" size={22} color="#0E7490" />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.keyboardSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 18,
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 24,
    color: '#0E7490',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 34,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinRing: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
  },
  pickupRing: {
    borderColor: '#1E9E5A',
  },
  dropRing: {
    borderColor: '#D9642A',
  },
  dottedLine: {
    height: 24,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#B8C2CC',
    marginLeft: 8,
    marginVertical: 4,
  },
  input: {
    flex: 1,
    height: 42,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    fontFamily: FONTS.medium,
    color: '#111827',
    fontSize: 15,
    paddingVertical: 0,
  },
  loadingText: {
    marginTop: 14,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  resultsList: {
    marginTop: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  resultRowLast: {
    borderBottomWidth: 0,
  },
  resultLeft: {
    width: 54,
    alignItems: 'center',
    marginRight: 8,
  },
  resultDistance: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#94A3B8',
  },
  resultTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  resultName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#0F172A',
  },
  resultAddress: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#94A3B8',
  },
  favoriteButton: {
    padding: 4,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  pillButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  pillText: {
    fontFamily: FONTS.medium,
    color: '#111827',
    fontSize: 14,
  },
  sectionTitle: {
    marginTop: 24,
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: '#111827',
  },
  recentCard: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 2,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  leftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  placeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeTextWrap: {
    flex: 1,
  },
  placeTitle: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#111827',
  },
  placeSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  footerText: {
    marginTop: 18,
    textAlign: 'center',
    fontFamily: FONTS.medium,
    color: '#0E7490',
    fontSize: 18,
  },
  keyboardSpacer: {
    height: 12,
  },
});
