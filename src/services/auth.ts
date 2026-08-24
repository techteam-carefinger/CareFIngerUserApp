import {
  getAuth,
  onAuthStateChanged,
  signInWithPhoneNumber,
} from '@react-native-firebase/auth';

import {AUTH_CONFIG} from '../config/env';
import {ApiUser, LoginData} from '../types';
import {api, ApiError} from './api';
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

const toLocalPhone = (phone: string): string =>
  phone.replace(/\D/g, '').slice(-10);

const isUserProfileComplete = (user: ApiUser): boolean =>
  Boolean(user.name && user.name.trim().length >= 3);

export type RestoredSession =
  | {route: 'Login'}
  | {route: 'Home'}
  | {route: 'ProfileSetup'; phoneNumber: string};

const firebaseAuthMessage = (error: unknown, fallback: string): Error => {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as {code?: string}).code)
      : '';

  const messages: Record<string, string> = {
    'auth/invalid-phone-number':
      'Enter a valid 10-digit mobile number.',
    'auth/missing-phone-number':
      'Phone number is required.',
    'auth/too-many-requests':
      'Too many OTP requests. Please wait and try again.',
    'auth/quota-exceeded':
      'SMS quota exceeded. Please try again later.',
    'auth/invalid-verification-code':
      'Invalid OTP. Please check the code and try again.',
    'auth/session-expired':
      'OTP expired. Please request a new code.',
    'auth/code-expired':
      'OTP expired. Please request a new code.',
    'auth/missing-verification-code':
      'Enter the 6-digit OTP sent to your phone.',
    'auth/network-request-failed':
      'Network error. Check your connection and try again.',
    'auth/app-not-authorized':
      'This app is not authorized for phone login. Add the debug SHA-1 in Firebase.',
    'auth/missing-client-identifier':
      'This app is not authorized for phone login. Add the debug SHA-1 in Firebase.',
    'auth/captcha-check-failed':
      'Phone verification failed. Please try again.',
    'auth/invalid-app-credential':
      'Firebase Phone Auth is not set up for this app. Check SHA-1 fingerprints.',
  };

  if (messages[code]) {
    return new Error(messages[code]);
  }

  if (error instanceof Error && error.message) {
    return new Error(error.message);
  }

  return new Error(fallback);
};

export const authService = {
  /**
   * Triggers Firebase Phone Auth, sending an SMS OTP to the given number.
   * The backend never receives this code — it only verifies the Firebase ID token.
   */
  async sendOtp(phone: string): Promise<void> {
    awaitingAutoVerification = true;
    await getAuth().signOut().catch(() => undefined);

    try {
      const confirmation = await signInWithPhoneNumber(
        getAuth(),
        toE164(phone),
      );
      pendingConfirmation = confirmation;
    } catch (error) {
      awaitingAutoVerification = false;
      pendingConfirmation = null;
      throw firebaseAuthMessage(
        error,
        'Could not send OTP. Please try again.',
      );
    }
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
          firebaseAuthMessage(
            error,
            'Automatic OTP verification failed. Please enter the code.',
          ),
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

    try {
      await pendingConfirmation.confirm(code);
    } catch (error) {
      throw firebaseAuthMessage(
        error,
        'Invalid or expired OTP. Please try again.',
      );
    }

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
    extra?: {
      name?: string;
      email?: string;
      lat?: number;
      lng?: number;
      keepSignedIn?: boolean;
    },
  ): Promise<LoginData> {
    const {keepSignedIn = true, ...loginFields} = extra ?? {};
    const data = await api.post<LoginData>('/login', {
      body: {idToken, ...loginFields},
    });

    await storage.setToken(data.token);
    await storage.setUser(data.user);
    await storage.setKeepSignedIn(keepSignedIn);

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

  /**
   * Restores the last session so a relaunch can skip Login when the user is
   * still signed in. Invalid tokens send the user back to Login.
   */
  async restoreSession(): Promise<RestoredSession> {
    const token = await storage.getToken();
    if (!token) {
      return {route: 'Login'};
    }

    const keepSignedIn = await storage.getKeepSignedIn();
    if (keepSignedIn === false) {
      await this.logout();
      return {route: 'Login'};
    }

    const cachedUser = await storage.getUser();

    try {
      const user = await this.me();
      if (isUserProfileComplete(user)) {
        return {route: 'Home'};
      }
      return {
        route: 'ProfileSetup',
        phoneNumber: toLocalPhone(user.phoneNumber),
      };
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        await this.logout();
        return {route: 'Login'};
      }

      if (cachedUser && isUserProfileComplete(cachedUser)) {
        return {route: 'Home'};
      }

      if (cachedUser?.phoneNumber) {
        return {
          route: 'ProfileSetup',
          phoneNumber: toLocalPhone(cachedUser.phoneNumber),
        };
      }

      return {route: 'Home'};
    }
  },

  async logout(): Promise<void> {
    awaitingAutoVerification = false;
    pendingConfirmation = null;
    await getAuth().signOut().catch(() => undefined);
    await storage.clear();
  },
};
