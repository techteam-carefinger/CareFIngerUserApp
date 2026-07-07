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
      }
    | undefined;
  MapPicker: {
    target: 'current' | 'destination';
    initialQuery?: string;
  };
  TermsAndConditions: undefined;
  PrivacyPolicy: undefined;
};
