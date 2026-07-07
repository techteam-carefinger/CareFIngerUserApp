/**
 * Shapes returned by the CareFinger backend (`modules/userApp/user`).
 */
export interface ApiUser {
  user_id: string;
  name: string | null;
  phoneNumber: string;
  email: string | null;
  profilePicture: string | null;
  activePlanId: string | null;
  remainingMinutes: number;
  planStartDate: string | null;
  planExpiryDate: string | null;
  totalMinutesUsed: number;
  lat: number | null;
  lng: number | null;
}

export interface LoginData {
  token: string;
  user: ApiUser;
  isProfileComplete: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Legal document (terms & conditions / privacy) served from the admin_link API.
 * `content` is an HTML string authored in the admin panel.
 */
export interface LegalDocument {
  _id: string;
  type: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Profile details collected during setup that the backend has no field for.
 * Kept on-device so they can prefill later flows (e.g. booking address).
 */
export interface LocalProfile {
  address?: string;
  emergencyContact?: string;
}

/**
 * The user's captured device location. Persisted so the pickup point can be
 * restored instantly on the next launch while a fresh fix is acquired.
 */
export interface CapturedLocation {
  latitude: number;
  longitude: number;
  address?: string;
  capturedAt: number;
}

export interface SavedRecentPlace {
  id: string;
  title: string;
  subtitle: string;
  address: string;
  latitude?: number;
  longitude?: number;
  placeId?: string;
  savedAt: number;
}

export interface RideLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface CaretakerMarker {
  id: string;
  latitude: number;
  longitude: number;
}
