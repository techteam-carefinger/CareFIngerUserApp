import React, {useEffect, useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {CustomButton, OTPInput} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';

type OtpVerificationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'OtpVerification'
>;

const OTP_LENGTH = 4;
const INITIAL_TIMER_SECONDS = 30;

const formatPhoneNumber = (phoneNumber: string) => {
  const numericOnly = phoneNumber.replace(/\D/g, '').slice(-10);
  if (numericOnly.length !== 10) {
    return `+91 ${numericOnly}`;
  }
  return `+91 ${numericOnly.slice(0, 5)} ${numericOnly.slice(5)}`;
};

export function OtpVerificationScreen({
  navigation,
  route,
}: OtpVerificationScreenProps) {
  const {phoneNumber} = route.params;
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(INITIAL_TIMER_SECONDS);

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const timerId = setInterval(() => {
      setCountdown(current => {
        if (current <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [countdown]);

  const formattedPhone = useMemo(() => formatPhoneNumber(phoneNumber), [phoneNumber]);
  const isOtpValid = otp.length === OTP_LENGTH;
  const canResend = countdown === 0;

  const handleOtpChange = (nextOtp: string) => {
    setOtp(nextOtp.replace(/\D/g, '').slice(0, OTP_LENGTH));
  };

  const onVerify = () => {
    if (!isOtpValid) {
      return;
    }
    console.log('OTP Verified', phoneNumber);
  };

  const onResend = () => {
    if (!canResend) {
      return;
    }
    setOtp('');
    setCountdown(INITIAL_TIMER_SECONDS);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={10}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.title}>OTP Verification</Text>
        <Text style={styles.subtitle}>Please enter code we just send to</Text>
        <Text style={styles.phoneText}>{formattedPhone}</Text>

        <View style={styles.otpSection}>
          <OTPInput length={OTP_LENGTH} value={otp} onChange={handleOtpChange} />
        </View>

        <View style={styles.resendRow}>
          <Text style={styles.resendHint}>Didn&apos;t receive OTP?</Text>
          <Pressable disabled={!canResend} onPress={onResend}>
            <Text style={[styles.resendText, !canResend && styles.resendDisabled]}>
              {canResend ? 'Resend code' : `Resend in ${countdown}s`}
            </Text>
          </Pressable>
        </View>

        <View style={styles.verifyButtonWrap}>
          <CustomButton
            title="Verify OTP"
            onPress={onVerify}
            disabled={!isOtpValid}
            style={styles.verifyButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 24,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  backIcon: {
    fontSize: 24,
    lineHeight: 24,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  title: {
    marginTop: 30,
    fontSize: 34,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  subtitle: {
    marginTop: 14,
    fontSize: 18,
    lineHeight: 26,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
  phoneText: {
    marginTop: 8,
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
  },
  otpSection: {
    marginTop: 38,
  },
  resendRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resendHint: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  resendText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.error,
  },
  resendDisabled: {
    color: COLORS.textSecondary,
  },
  verifyButtonWrap: {
    marginTop: 'auto',
    paddingBottom: 8,
  },
  verifyButton: {
    borderRadius: 999,
  },
});
