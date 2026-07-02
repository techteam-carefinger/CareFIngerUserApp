import React, {useEffect, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationSearch'>;
type AutocompletePrediction = {
  description: string;
  place_id: string;
};

const GOOGLE_MAPS_API_KEY: string = 'AIzaSyBE3GNStuB23c1ZT8j9C2tfFuFFue4NY4U';

type RecentPlace = {
  id: string;
  icon: 'home-outline' | 'briefcase-outline' | 'star-outline';
  title: string;
  subtitle: string;
};

const RECENT_PLACES: RecentPlace[] = [
  {
    id: 'home',
    icon: 'home-outline',
    title: 'Home',
    subtitle: 'Central Market, Sector 4, Madangir, New Delhi',
  },
  {
    id: 'work',
    icon: 'briefcase-outline',
    title: 'Work',
    subtitle: 'Nehru Place, New Delhi',
  },
  {
    id: 'connaught',
    icon: 'star-outline',
    title: 'Connaught Place',
    subtitle: 'Connaught Place, New Delhi',
  },
];

export function LocationSearchScreen({navigation, route}: Props) {
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isLocationAutocompleteLoading, setIsLocationAutocompleteLoading] = useState(false);
  const [destination, setDestination] = useState('');
  const [destinationSuggestions, setDestinationSuggestions] = useState<AutocompletePrediction[]>([]);
  const [isDestinationAutocompleteLoading, setIsDestinationAutocompleteLoading] = useState(false);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destinationFetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextCurrentFetchRef = useRef(false);
  const skipNextDestinationFetchRef = useRef(false);

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
        if (target === 'current') {
          setLocationSuggestions(data.predictions);
        } else {
          setDestinationSuggestions(data.predictions);
        }
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

  const onSelectLocationSuggestion = (prediction: AutocompletePrediction) => {
    skipNextCurrentFetchRef.current = true;
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current);
    }
    setLocationSearch(prediction.description);
    setLocationSuggestions([]);
    setIsLocationAutocompleteLoading(false);
  };

  const onSelectDestinationSuggestion = (prediction: AutocompletePrediction) => {
    skipNextDestinationFetchRef.current = true;
    if (destinationFetchDebounceRef.current) {
      clearTimeout(destinationFetchDebounceRef.current);
    }
    setDestination(prediction.description);
    setDestinationSuggestions([]);
    setIsDestinationAutocompleteLoading(false);
  };

  useEffect(() => {
    const pickedLocation = route.params?.pickedLocation;
    const pickedTarget = route.params?.pickedTarget;

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
    }

    navigation.setParams({
      pickedLocation: undefined,
      pickedTarget: undefined,
    });
  }, [navigation, route.params?.pickedLocation, route.params?.pickedTarget]);

  const openMapLocation = () => {
    navigation.navigate('MapPicker', {
      target: 'destination',
      initialQuery: destination.trim() || locationSearch.trim(),
    });
  };

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
            <View style={[styles.pinCircle, styles.currentPin]}>
              <View style={styles.currentPinInner} />
            </View>
            <View style={styles.rowTextWrap}>
              <Text style={styles.currentLabel} allowFontScaling={false}>
                Your current location
              </Text>
              <TextInput
                value={locationSearch}
                onChangeText={setLocationSearch}
                placeholder="Search location"
                placeholderTextColor="#9CA3AF"
                style={styles.currentLocationInput}
                allowFontScaling={false}
              />
            </View>
          </View>

          <View style={styles.dottedLine} />

          <View style={styles.row}>
            <View style={[styles.pinCircle, styles.destinationPin]}>
              <View style={styles.destinationPinInner} />
            </View>
            <TextInput
              value={destination}
              onChangeText={setDestination}
              placeholder="Where are you going?"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              allowFontScaling={false}
            />
          </View>

          {isLocationAutocompleteLoading ? (
            <Text style={styles.loadingText} allowFontScaling={false}>
              Loading suggestions...
            </Text>
          ) : null}

          {locationSuggestions.length > 0 ? (
            <View style={styles.suggestionsCard}>
              {locationSuggestions.map(suggestion => (
                <Pressable
                  key={suggestion.place_id}
                  style={styles.suggestionRow}
                  onPress={() => onSelectLocationSuggestion(suggestion)}>
                  <Ionicons name="location-outline" size={18} color="#0E7490" />
                  <Text style={styles.suggestionText} allowFontScaling={false} numberOfLines={2}>
                    {suggestion.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {isDestinationAutocompleteLoading ? (
            <Text style={styles.loadingText} allowFontScaling={false}>
              Loading destination suggestions...
            </Text>
          ) : null}

          {destinationSuggestions.length > 0 ? (
            <View style={styles.suggestionsCard}>
              {destinationSuggestions.map(suggestion => (
                <Pressable
                  key={`destination-${suggestion.place_id}`}
                  style={styles.suggestionRow}
                  onPress={() => onSelectDestinationSuggestion(suggestion)}>
                  <Ionicons name="navigate-outline" size={18} color="#EA580C" />
                  <Text style={styles.suggestionText} allowFontScaling={false} numberOfLines={2}>
                    {suggestion.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.pillRow}>
          <Pressable style={styles.pillButton} onPress={openMapLocation}>
            <Ionicons name="location" size={16} color="#0E7490" />
            <Text style={styles.pillText} allowFontScaling={false}>
              Select from map
            </Text>
          </Pressable>
          <Pressable style={styles.pillButton}>
            <Ionicons name="add-circle-outline" size={16} color="#0E7490" />
            <Text style={styles.pillText} allowFontScaling={false}>
              Add stops
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle} allowFontScaling={false}>
          Recent Places
        </Text>

        <View style={styles.recentCard}>
          {RECENT_PLACES.map((place, index) => (
            <View key={place.id} style={[styles.placeRow, index === RECENT_PLACES.length - 1 && styles.lastRow]}>
              <View style={styles.leftWrap}>
                <View style={styles.placeIconWrap}>
                  <Ionicons name={place.icon} size={20} color="#0E7490" />
                </View>
                <View style={styles.placeTextWrap}>
                  <Text style={styles.placeTitle} allowFontScaling={false}>
                    {place.title}
                  </Text>
                  <Text style={styles.placeSubtitle} allowFontScaling={false}>
                    {place.subtitle}
                  </Text>
                </View>
              </View>
              <Ionicons name="arrow-forward" size={22} color="#0E7490" />
            </View>
          ))}
        </View>

        <Text style={styles.footerText} allowFontScaling={false}>
          More recent places
        </Text>

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
  pinCircle: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentPin: {
    backgroundColor: '#0E7490',
  },
  currentPinInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#67E8F9',
  },
  destinationPin: {
    backgroundColor: '#EA580C',
  },
  destinationPinInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#FED7AA',
  },
  rowTextWrap: {
    flex: 1,
    paddingVertical: 4,
  },
  currentLabel: {
    fontFamily: FONTS.medium,
    color: '#111827',
    fontSize: 16,
  },
  currentLocationInput: {
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    fontFamily: FONTS.regular,
    color: '#111827',
    fontSize: 14,
    marginTop: 4,
    paddingVertical: 0,
  },
  dottedLine: {
    height: 30,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#67A6B5',
    marginLeft: 11,
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
    marginTop: 10,
    marginLeft: 36,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  suggestionsCard: {
    marginTop: 10,
    marginLeft: 36,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionText: {
    flex: 1,
    fontFamily: FONTS.regular,
    color: '#111827',
    fontSize: 14,
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  pillButton: {
    width: '48.5%',
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
