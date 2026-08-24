import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StatusBar, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {LoginScreen} from '../screens/LoginScreen';
import {HomeScreen} from '../screens/HomeScreen';
import {LocationSearchScreen} from '../screens/LocationSearchScreen';
import {MapPickerScreen} from '../screens/MapPickerScreen';
import {RideBookingScreen} from '../screens/RideBookingScreen';
import {RechargeScreen} from '../screens/RechargeScreen';
import {PickupConfirmScreen} from '../screens/PickupConfirmScreen';
import {BookingConfirmedScreen} from '../screens/BookingConfirmedScreen';
import {SearchingCaretakerScreen} from '../screens/SearchingCaretakerScreen';
import {OtpVerificationScreen} from '../screens/OtpVerificationScreen';
import {EditProfileFieldScreen} from '../screens/EditProfileFieldScreen';
import {MyCareServicesScreen} from '../screens/MyCareServicesScreen';
import {OffersScreen} from '../screens/OffersScreen';
import {ProfileDetailsScreen} from '../screens/ProfileDetailsScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {ProfileSetupScreen} from '../screens/ProfileSetupScreen';
import {
  PrivacyPolicyScreen,
  TermsAndConditionsScreen,
} from '../screens/TermsAndConditionsScreen';
import {COLORS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService, RestoredSession} from '../services';

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  const [session, setSession] = useState<RestoredSession | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const restored = await authService.restoreSession();
      if (!cancelled) {
        setSession(restored);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <View style={styles.bootScreen}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{headerShown: false}}
          initialRouteName={session.route}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            initialParams={{
              phoneNumber:
                session.route === 'ProfileSetup' ? session.phoneNumber : '',
            }}
          />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Offers" component={OffersScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
          <Stack.Screen name="MyCareServices" component={MyCareServicesScreen} />
          <Stack.Screen name="EditProfileField" component={EditProfileFieldScreen} />
          <Stack.Screen name="LocationSearch" component={LocationSearchScreen} />
          <Stack.Screen name="MapPicker" component={MapPickerScreen} />
          <Stack.Screen name="RideBooking" component={RideBookingScreen} />
          <Stack.Screen name="Recharge" component={RechargeScreen} />
          <Stack.Screen name="PickupConfirm" component={PickupConfirmScreen} />
          <Stack.Screen name="SearchingCaretaker" component={SearchingCaretakerScreen} />
          <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} />
          <Stack.Screen
            name="TermsAndConditions"
            component={TermsAndConditionsScreen}
          />
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});

export default App;
