import React, {useMemo, useState} from 'react';
import {
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {CustomButton, CustomCheckbox, CustomInput} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService} from '../services';

const LOGO = require('../../assets/logo.png');

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({navigation}: LoginScreenProps) {
  const [phone, setPhone] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const isValidPhone = phone.length === 10;
  const showError = phone.length > 0 && phone.length < 10;
  const errorText = showError ? 'Enter valid 10-digit mobile number' : undefined;

  const isSendOtpDisabled = !isValidPhone || isSending;

  const onChangePhone = (text: string) => {
    const numericOnly = text.replace(/\D/g, '').slice(0, 10);
    setPhone(numericOnly);
  };

  const onSendOtp = async () => {
    if (!isValidPhone || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await authService.sendOtp(phone);
      navigation.navigate('OtpVerification', {
        phoneNumber: phone,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not send OTP. Please try again.';
      Alert.alert('OTP failed', message);
    } finally {
      setIsSending(false);
    }
  };

  const legalText = useMemo(
    () => ({
      leading:
        'By continuing, you confirm that you are 18 years of age and agree to the ',
      terms: 'Terms & Conditions',
      middle: ' and ',
      privacy: 'Privacy Policy',
      trailing: '.',
    }),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundCircleTop} />
      <View style={styles.backgroundCircleBottom} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.logoSection}>
          <Image source={LOGO} resizeMode="contain" style={styles.logo} />
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.heading}>WELCOME BACK</Text>
          <Text style={styles.subtitle}>We&apos;re here to care for you</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Phone Number</Text>
          <CustomInput
            value={phone}
            onChangeText={onChangePhone}
            placeholder="Enter your mobile number"
            prefix="+91"
            leftIcon={<Text style={styles.phoneIcon}>📞</Text>}
            keyboardType="number-pad"
            maxLength={10}
            error={errorText}
          />

          <CustomButton
            title="Send OTP"
            onPress={onSendOtp}
            disabled={isSendOtpDisabled}
            loading={isSending}
            style={styles.sendOtpButton}
          />
        </View>

        <View style={styles.bottomRow}>
          <CustomCheckbox
            value={keepSignedIn}
            onToggle={() => setKeepSignedIn(current => !current)}
            label="Keep me signed in"
          />
        </View>

        <Text style={styles.footerText}>
          {legalText.leading}
          <Text
            style={styles.footerLink}
            onPress={() => Linking.openURL('https://example.com/terms')}>
            {legalText.terms}
          </Text>
          {legalText.middle}
          <Text
            style={styles.footerLink}
            onPress={() => Linking.openURL('https://example.com/privacy')}>
            {legalText.privacy}
          </Text>
          {legalText.trailing}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundCircleTop: {
    position: 'absolute',
    top: -170,
    left: -140,
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 1,
    borderColor: '#D9EAF2',
  },
  backgroundCircleBottom: {
    position: 'absolute',
    bottom: -190,
    right: -170,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#E8F2F8',
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
    flexGrow: 1,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 14,
  },
  logo: {
    width: 230,
    height: 230,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: -28,
  },
  heading: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  formSection: {
    marginTop: 38,
  },
  label: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
    marginBottom: 10,
  },
  phoneIcon: {
    fontSize: 16,
    lineHeight: 18,
    color: COLORS.primary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sendOtpButton: {
    marginTop: 18,
  },
  bottomRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    marginTop: 'auto',
    paddingTop: 34,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  footerLink: {
    color: COLORS.link,
    fontFamily: FONTS.medium,
    textDecorationLine: 'underline',
  },
});
