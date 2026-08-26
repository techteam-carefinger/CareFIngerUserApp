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
 * Promotional discount returned by `POST /api/admin_link/discount_get`.
 */
export interface DiscountOffer {
  _id: string;
  name?: string;
  title?: string;
  code?: string;
  description?: string;
  discountType?: string;
  discountValue?: number;
  maxDiscountAmount?: number | null;
  minimumBookingAmount?: number | null;
  audienceType?: string;
  totalUsageLimit?: number | null;
  perUserUsageLimit?: number | null;
  totalClaimLimit?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  claimedCount?: number;
  remainingClaims?: number | null;
  status?: string;
  currentStatus?: string;
}

/**
 * Profile details collected during setup that the backend has no field for.
 * Kept on-device so they can prefill later flows (e.g. booking address).
 */
export interface LocalProfile {
  address?: string;
  emergencyContact?: string;
  gender?: string;
  dateOfBirth?: string;
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

export interface CreateBookingData {
  bookingId: string;
  otp: number;
  status: string;
  nearbyProviders: number;
  remainingMinutes: number;
  isFree?: boolean;
  isPaid?: boolean;
  freeService?: boolean;
  serviceType?: string;
  fareType?: string;
  chargeType?: string;
  billingType?: string;
  ratePerMinute?: number;
  pricePerMinute?: number;
  perMinuteCharge?: number;
}

export interface BookingOffer {
  isFree: boolean;
  ratePerMinute: number;
}

export interface CurrentBooking {
  bookingId: string;
  status: string;
  otp?: number;
  lat?: number;
  lng?: number;
  address?: string;
  providerId?: string | null;
  providerName?: string | null;
  providerRating?: number;
  vehicleNumber?: string;
  vehicleModel?: string;
  providerLat?: number;
  providerLng?: number;
  etaMinutes?: number;
  nearbyProviders?: number;
  remainingMinutes?: number;
  isFree?: boolean;
  isPaid?: boolean;
  freeService?: boolean;
  serviceType?: string;
  fareType?: string;
  ratePerMinute?: number;
  pricePerMinute?: number;
}

export interface ConfirmedBookingParams {
  bookingId: string;
  pickup: {
    address: string;
    latitude: number;
    longitude: number;
  };
  drop?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  otp: number;
  providerName: string;
  providerRating: number;
  vehicleNumber: string;
  vehicleModel: string;
  etaMinutes: number;
  providerLatitude: number;
  providerLongitude: number;
}

export interface CancelBookingData {
  bookingId?: string;
  status?: string;
}

export interface BookingHistoryItem {
  bookingId?: string;
  _id?: string;
  address?: string;
  status?: string;
  createdAt?: string;
  bookingDate?: string;
  date?: string;
  amount?: number;
  price?: number;
  totalAmount?: number;
  serviceType?: string;
}

export interface BookingHistoryData {
  bookings: BookingHistoryItem[];
  total: number;
}
