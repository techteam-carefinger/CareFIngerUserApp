import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
} from '@react-native-firebase/auth';

import {AUTH_CONFIG} from '../config/env';
import {ApiUser, LoginData} from '../types';
import {api} from './api';
import {storage} from './storage';

type PendingConfirmation = Awaited<ReturnType<typeof signInWithPhoneNumber>>;

/**
 * Firebase's confirmation result is not serialisable, so it cannot be passed
 * through navigation params. We keep it here between the Login and OTP screens.
 */
let pendingConfirmation: PendingConfirmation | null = null;
let awaitingAutoVerification = false;

const toE164 = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (phone.trim().startsWith('+')) {
    return `+${digits}`;
  }
  return `${AUTH_CONFIG.defaultCountryCode}${digits}`;
};

export const authService = {
  /**
   * Triggers Firebase Phone Auth, sending an SMS OTP to the given number.
   */
  async sendOtp(phone: string): Promise<void> {
    awaitingAutoVerification = true;
    await getAuth().signOut().catch(() => undefined);
    const confirmation = await signInWithPhoneNumber(getAuth(), toE164(phone));
    pendingConfirmation = confirmation;
  },

  hasPendingOtp(): boolean {
    return pendingConfirmation != null;
  },

  /**
   * On Android, Firebase can auto-verify the SMS and sign the user in without
   * manual code entry. Listen for that and complete the backend login flow.
   */
  subscribeAutoVerification(
    onVerified: (idToken: string) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const unsubscribe = onAuthStateChanged(getAuth(), async user => {
      if (!awaitingAutoVerification || !pendingConfirmation || !user) {
        return;
      }

      try {
        awaitingAutoVerification = false;
        pendingConfirmation = null;
        const idToken = await user.getIdToken(true);
        onVerified(idToken);
      } catch (error) {
        awaitingAutoVerification = false;
        onError?.(
          error instanceof Error
            ? error
            : new Error('Automatic OTP verification failed. Please enter the code.'),
        );
      }
    });

    return unsubscribe;
  },

  /**
   * Confirms the SMS code with Firebase and returns the fresh Firebase ID token.
   * The backend `/login` endpoint verifies this token via firebase-admin.
   */
  async confirmOtp(code: string): Promise<string> {
    if (!pendingConfirmation) {
      throw new Error('No OTP request in progress. Please resend the code.');
    }

    await pendingConfirmation.confirm(code);
    awaitingAutoVerification = false;
    pendingConfirmation = null;

    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      throw new Error('Firebase sign-in failed. Please try again.');
    }

    return currentUser.getIdToken(true);
  },

  /**
   * Calls the backend login/register endpoint with the Firebase ID token,
   * persists the returned JWT + user, and returns the login payload.
   */
  async login(
    idToken: string,
    extra?: {name?: string; email?: string; lat?: number; lng?: number},
  ): Promise<LoginData> {
    const data = await api.post<LoginData>('/login', {
      body: {idToken, ...extra},
    });

    await storage.setToken(data.token);
    await storage.setUser(data.user);

    return data;
  },

  /**
   * Updates the logged-in user's profile (name/email/profilePicture).
   */
  async updateProfile(fields: {
    name?: string;
    email?: string;
    profilePicture?: string;
  }): Promise<ApiUser> {
    const user = await api.post<ApiUser>('/update', {
      auth: true,
      body: fields,
    });

    await storage.setUser(user);
    return user;
  },

  /**
   * Fetches the current user profile using the stored JWT.
   */
  async me(): Promise<ApiUser> {
    const user = await api.post<ApiUser>('/me', {auth: true});
    await storage.setUser(user);
    return user;
  },

  async logout(): Promise<void> {
    awaitingAutoVerification = false;
    pendingConfirmation = null;
    await getAuth().signOut().catch(() => undefined);
    await storage.clear();
  },
};
