import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
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
import {useOtpAutoRead} from '../hooks';
import {RootStackParamList} from '../navigation/types';
import {authService} from '../services';

type OtpVerificationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'OtpVerification'
>;

const OTP_LENGTH = 6;
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const hasAutoVerifiedRef = useRef(false);

  const completeLogin = useCallback(
    async (idToken: string) => {
      const {isProfileComplete} = await authService.login(idToken);

      if (isProfileComplete) {
        navigation.replace('Home');
      } else {
        navigation.replace('ProfileSetup', {phoneNumber});
      }
    },
    [navigation, phoneNumber],
  );

  const {restartListener} = useOtpAutoRead({
    digits: OTP_LENGTH,
    enabled: true,
    onOtpDetected: (detectedOtp: string) => {
      if (detectedOtp.length === OTP_LENGTH) {
        setOtp(detectedOtp);
      }
    },
  });

  useEffect(() => {
    if (!authService.hasPendingOtp()) {
      return;
    }

    const unsubscribe = authService.subscribeAutoVerification(async idToken => {
      if (hasAutoVerifiedRef.current || isVerifying) {
        return;
      }

      hasAutoVerifiedRef.current = true;
      setIsVerifying(true);
      try {
        await completeLogin(idToken);
      } catch (error) {
        hasAutoVerifiedRef.current = false;
        const message =
          error instanceof Error
            ? error.message
            : 'Automatic verification failed. Please enter the OTP manually.';
        Alert.alert('Verification failed', message);
      } finally {
        setIsVerifying(false);
      }
    });

    return unsubscribe;
  }, [completeLogin, isVerifying]);

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

  const onVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH || isVerifying) {
      return;
    }

    setIsVerifying(true);
    try {
      const idToken = await authService.confirmOtp(otp);
      await completeLogin(idToken);
    } catch (error) {
      hasAutoVerifiedRef.current = false;
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid or expired OTP. Please try again.';
      Alert.alert('Verification failed', message);
    } finally {
      setIsVerifying(false);
    }
  }, [completeLogin, isVerifying, otp]);

  useEffect(() => {
    if (otp.length !== OTP_LENGTH || isVerifying || hasAutoVerifiedRef.current) {
      return;
    }

    hasAutoVerifiedRef.current = true;
    void onVerify();
  }, [isVerifying, onVerify, otp]);

  const onResend = async () => {
    if (!canResend || isResending) {
      return;
    }

    setIsResending(true);
    try {
      await authService.sendOtp(phoneNumber);
      setOtp('');
      hasAutoVerifiedRef.current = false;
      restartListener();
      setCountdown(INITIAL_TIMER_SECONDS);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Could not resend OTP. Please try again.';
      Alert.alert('Resend failed', message);
    } finally {
      setIsResending(false);
    }
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
        {Platform.OS === 'android' ? (
          <Text style={styles.autoReadHint} allowFontScaling={false}>
            OTP will be read automatically. Tap the code above the keyboard if prompted.
          </Text>
        ) : (
          <Text style={styles.autoReadHint} allowFontScaling={false}>
            Tap the OTP suggestion above the keyboard to autofill.
          </Text>
        )}

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
            disabled={!isOtpValid || isVerifying}
            loading={isVerifying}
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
  autoReadHint: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
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
