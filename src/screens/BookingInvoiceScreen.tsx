import React, {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {PAID_RATE_PER_MINUTE, storage} from '../services';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingInvoice'>;

const FIRST_SERVICE_COUPON = 10;
const MEMBERSHIP_DISCOUNT = 5;
const GST_RATE = 0.18;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const formatServiceDate = (value?: string) => {
  if (!value) {
    return 'Date unavailable';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export function BookingInvoiceScreen({navigation, route}: Props) {
  const {minutes, ratePerMinute, serviceDate, serviceType} = route.params;
  const billedMinutes = Math.max(0, Math.round(minutes));
  const isFree = (serviceType ?? '').trim().toLowerCase() === 'free';
  const rate = isFree ? 0 : ratePerMinute > 0 ? ratePerMinute : PAID_RATE_PER_MINUTE;
  const [customerName, setCustomerName] = useState('');
  const [experience, setExperience] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const invoice = useMemo(() => {
    const subtotal = roundMoney(billedMinutes * rate);
    const coupon = subtotal > 0 ? FIRST_SERVICE_COUPON : 0;
    const membership = subtotal > 0 ? MEMBERSHIP_DISCOUNT : 0;
    const gst = roundMoney(subtotal * GST_RATE);
    const total = roundMoney(Math.max(0, subtotal - coupon - membership + gst));
    return {subtotal, coupon, membership, gst, total};
  }, [billedMinutes, rate]);

  useEffect(() => {
    void (async () => {
      const user = await storage.getUser();
      if (user?.name) {
        setCustomerName(user.name);
      }
    })();
  }, []);

  const onSubmitExperience = () => {
    const trimmed = experience.trim();
    if (!trimmed) {
      Alert.alert('Write your experience', 'Please share a short review before submitting.');
      return;
    }
    setIsSubmitted(true);
    Alert.alert('Thank you', 'Your experience has been submitted.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Invoice
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.box}>
            <Text style={styles.thanksText} allowFontScaling={false}>
              Thank you for taking service. Please write your experience
            </Text>
            <TextInput
              value={experience}
              onChangeText={setExperience}
              placeholder="Write your experience"
              placeholderTextColor="#9CA3AF"
              style={styles.experienceInput}
              multiline
              textAlignVertical="top"
              editable={!isSubmitted}
              allowFontScaling={false}
            />
            <Pressable
              style={[styles.submitButton, isSubmitted && styles.submitButtonDisabled]}
              onPress={onSubmitExperience}
              disabled={isSubmitted}>
              <Text style={styles.submitText} allowFontScaling={false}>
                {isSubmitted ? 'Submitted' : 'Submit'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.box}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>
              Invoice Details
            </Text>
            <Text style={styles.line} allowFontScaling={false}>
              Name
            </Text>
            <Text style={styles.value} allowFontScaling={false}>
              {customerName || 'CareFinger user'}
            </Text>
            <Text style={styles.line} allowFontScaling={false}>
              Service Date
            </Text>
            <Text style={styles.value} allowFontScaling={false}>
              {formatServiceDate(serviceDate)}
            </Text>
            <Text style={styles.line} allowFontScaling={false}>
              Calculation {billedMinutes}Min x{rate} Rs. = {invoice.subtotal.toFixed(2)} Rs.
            </Text>
            <Text style={styles.line} allowFontScaling={false}>
              Offer Coupon {invoice.coupon} Rs First Service
            </Text>
            <Text style={styles.line} allowFontScaling={false}>
              Care Membership Discount {invoice.membership} Rs.
            </Text>
            <Text style={styles.line} allowFontScaling={false}>
              GST 18% {invoice.gst.toFixed(2)}
            </Text>
            <Text style={styles.total} allowFontScaling={false}>
              Total {invoice.total.toFixed(2)}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  box: {
    borderWidth: 1,
    borderColor: '#111827',
    padding: 14,
    gap: 8,
  },
  thanksText: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    color: '#111827',
    lineHeight: 26,
  },
  experienceInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#111827',
  },
  submitButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    color: '#111827',
  },
  sectionTitle: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    color: '#111827',
    marginBottom: 4,
  },
  line: {
    fontFamily: FONTS.regular,
    fontSize: 18,
    color: '#111827',
    lineHeight: 26,
  },
  value: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#374151',
    marginTop: -4,
    marginBottom: 4,
  },
  total: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: '#111827',
    marginTop: 4,
  },
});
