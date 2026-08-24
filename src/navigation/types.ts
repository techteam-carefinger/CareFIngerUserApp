export type RootStackParamList = {
  Login: undefined;
  OtpVerification: {
    phoneNumber: string;
  };
  ProfileSetup: {
    phoneNumber: string;
  };
  Home: undefined;
  Offers: undefined;
  Profile: undefined;
  ProfileDetails: undefined;
  MyCareServices: undefined;
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
    planTitle?: string;
    planAmount?: number;
  };
  BookingConfirmed: {
    bookingId: string;
    pickup: {
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
  };
  TermsAndConditions: undefined;
  PrivacyPolicy: undefined;
};
