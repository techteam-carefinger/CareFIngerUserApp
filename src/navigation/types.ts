export type RootStackParamList = {
  Login: undefined;
  OtpVerification: {
    phoneNumber: string;
  };
  ProfileSetup: {
    phoneNumber: string;
  };
  Home: undefined;
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
  TermsAndConditions: undefined;
  PrivacyPolicy: undefined;
};
