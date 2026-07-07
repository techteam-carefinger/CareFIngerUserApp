import AsyncStorage from '@react-native-async-storage/async-storage';

import {ApiUser, CapturedLocation, LocalProfile, SavedRecentPlace} from '../types';

const TOKEN_KEY = '@carefinger/token';
const USER_KEY = '@carefinger/user';
const LOCAL_PROFILE_KEY = '@carefinger/localProfile';
const LOCATION_KEY = '@carefinger/location';
const RECENT_PLACES_KEY = '@carefinger/recentPlaces';
export const MAX_RECENT_DROP_LOCATIONS = 10;
const MAX_RECENT_PLACES = MAX_RECENT_DROP_LOCATIONS;

export const storage = {
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async setUser(user: ApiUser): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<ApiUser | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as ApiUser;
    } catch {
      return null;
    }
  },

  async setLocalProfile(profile: LocalProfile): Promise<void> {
    await AsyncStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
  },

  async getLocalProfile(): Promise<LocalProfile | null> {
    const raw = await AsyncStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as LocalProfile;
    } catch {
      return null;
    }
  },

  async setLocation(location: CapturedLocation): Promise<void> {
    await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(location));
  },

  async getLocation(): Promise<CapturedLocation | null> {
    const raw = await AsyncStorage.getItem(LOCATION_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as CapturedLocation;
    } catch {
      return null;
    }
  },

  async getRecentPlaces(): Promise<SavedRecentPlace[]> {
    const raw = await AsyncStorage.getItem(RECENT_PLACES_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as SavedRecentPlace[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async addRecentPlace(place: Omit<SavedRecentPlace, 'id' | 'savedAt'>): Promise<void> {
    const normalized = place.address.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    const existing = await this.getRecentPlaces();
    const filtered = existing.filter(item => item.address.trim().toLowerCase() !== normalized);
    const next: SavedRecentPlace[] = [
      {
        ...place,
        id: `${Date.now()}`,
        savedAt: Date.now(),
      },
      ...filtered,
    ].slice(0, MAX_RECENT_PLACES);

    await AsyncStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(next));
  },

  async clear(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(LOCAL_PROFILE_KEY),
      AsyncStorage.removeItem(LOCATION_KEY),
      AsyncStorage.removeItem(RECENT_PLACES_KEY),
    ]);
  },
};
