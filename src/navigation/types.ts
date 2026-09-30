export type RootStackParamList = {
  Login: undefined;
  OtpVerification: {
    phoneNumber: string;
    keepSignedIn?: boolean;
  };
  ProfileSetup: {
    phoneNumber: string;
  };
  Home: undefined;
  Offers: undefined;
  Profile: undefined;
  ProfileDetails: undefined;
  MyCareServices: undefined;
  BookingInvoice: {
    bookingId: string;
    serviceDate?: string;
    minutes: number;
    ratePerMinute: number;
    serviceType?: string;
  };
  EditProfileField: {
    field: 'name' | 'email' | 'emergency' | 'dateOfBirth';
    initialValue?: string;
  };
  LocationSearch:
    | {
        pickedLocation?: string;
        pickedTarget?: 'current' | 'destination';
        pickedLatitude?: number;
        pickedLongitude?: number;
      }
    | undefined;
  MapPicker: {
    target: 'current' | 'destination';
    initialQuery?: string;
    initialLatitude?: number;
    initialLongitude?: number;
    returnTo?: 'BookingConfirmed';
  };
  RideBooking: {
    pickup: {
      address: string;
      latitude: number;
      longitude: number;
    };
    drop: {
      address: string;
      latitude: number;
      longitude: number;
    };
  };
  Recharge: {
    planTitle: string;
    amount: number;
  };
  PickupConfirm: {
    pickup: {
      address: string;
      latitude: number;
      longitude: number;
    };
    drop: {
      address: string;
      latitude: number;
      longitude: number;
    };
    serviceTitle: string;
    planAmount?: number;
  };
  SearchingCaretaker: {
    latitude: number;
    longitude: number;
    address: string;
    bookingId?: string;
    nearbyProviders?: number;
    otp?: number;
    planTitle?: string;
    planAmount?: number;
    offer?: {
      isFree: boolean;
      ratePerMinute: number;
    };
    remainingMinutes?: number;
    drop?: {
      address: string;
      latitude: number;
      longitude: number;
    };
  };
  BookingConfirmed: {
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
    providerPhone?: string;
    providerImage?: string;
    providerRating?: number;
    serviceLabel?: string;
    serviceType?: string;
    ratePerMinute?: number;
    isFree?: boolean;
    vehicleNumber?: string;
    vehicleModel?: string;
    etaMinutes?: number;
    providerLatitude?: number;
    providerLongitude?: number;
    remainingMinutes?: number;
    status?: string;
    startTime?: string;
    nextStop?: {
      address: string;
      latitude: number;
      longitude: number;
    };
  };
  ServiceComplete: {
    bookingId: string;
    minutes: number;
    ratePerMinute?: number;
    customerName?: string;
  };
  TermsAndConditions: undefined;
  PrivacyPolicy: undefined;
};
