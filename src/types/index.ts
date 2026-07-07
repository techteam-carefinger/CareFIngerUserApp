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
