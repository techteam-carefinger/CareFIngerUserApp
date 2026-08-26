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

import {CustomButton} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {PAID_RATE_PER_MINUTE, storage} from '../services';

type Props = NativeStackScreenProps<RootStackParamList, 'ServiceComplete'>;

const FIRST_SERVICE_COUPON = 10;
const MEMBERSHIP_DISCOUNT = 5;
const GST_RATE = 0.18;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const formatMoney = (value: number) => `${value.toFixed(2)} Rs.`;

const formatServiceDate = () =>
  new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export function ServiceCompleteScreen({navigation, route}: Props) {
  const {minutes, ratePerMinute = PAID_RATE_PER_MINUTE} = route.params;
  const billedMinutes = Math.max(1, Math.round(minutes));
  const [customerName, setCustomerName] = useState(route.params.customerName ?? '');
  const [experience, setExperience] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const invoice = useMemo(() => {
    const subtotal = roundMoney(billedMinutes * ratePerMinute);
    const coupon = FIRST_SERVICE_COUPON;
    const membership = MEMBERSHIP_DISCOUNT;
    const gst = roundMoney(subtotal * GST_RATE);
    const total = roundMoney(Math.max(0, subtotal - coupon - membership + gst));
    return {subtotal, coupon, membership, gst, total};
  }, [billedMinutes, ratePerMinute]);

  useEffect(() => {
    if (customerName) {
      return;
    }
    void (async () => {
      const user = await storage.getUser();
      if (user?.name) {
        setCustomerName(user.name);
      }
    })();
  }, [customerName]);

  const onSubmitExperience = () => {
    const trimmed = experience.trim();
    if (!trimmed) {
      Alert.alert('Write your experience', 'Please share a short review before submitting.');
      return;
    }
    setIsSubmitted(true);
    Alert.alert('Thank you', 'Your experience has been submitted.');
  };

  const onPayNow = () => {
    Alert.alert(
      'Payment successful',
      `₹${invoice.total.toFixed(2)} has been recorded for this service.`,
      [
        {
          text: 'OK',
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{name: 'Home'}],
            }),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.navigate('Home')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Service complete
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.thanksIcon}>
            <Ionicons name="checkmark-circle" size={42} color={COLORS.white} />
          </View>
          <Text style={styles.thanksTitle} allowFontScaling={false}>
            Thank you for taking service
          </Text>
          <Text style={styles.thanksSubtitle} allowFontScaling={false}>
            Please write your experience
          </Text>

          <TextInput
            value={experience}
            onChangeText={setExperience}
            placeholder="How was your caretaker service?"
            placeholderTextColor="#9CA3AF"
            style={styles.experienceInput}
            multiline
            textAlignVertical="top"
            editable={!isSubmitted}
            allowFontScaling={false}
          />

          <CustomButton
            title={isSubmitted ? 'Submitted' : 'Submit'}
            onPress={onSubmitExperience}
            disabled={isSubmitted}
            style={styles.submitButton}
          />

          <View style={styles.invoiceCard}>
            <Text style={styles.invoiceTitle} allowFontScaling={false}>
              Invoice Details
            </Text>

            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel} allowFontScaling={false}>
                Name
              </Text>
              <Text style={styles.invoiceValue} allowFontScaling={false}>
                {customerName || 'CareFinger user'}
              </Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel} allowFontScaling={false}>
                Service Date
              </Text>
              <Text style={styles.invoiceValue} allowFontScaling={false}>
                {formatServiceDate()}
              </Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.invoiceLabel} allowFontScaling={false}>
              Calculation
            </Text>
            <Text style={styles.calculationText} allowFontScaling={false}>
              {billedMinutes} Min x {ratePerMinute} Rs. = {formatMoney(invoice.subtotal)}
            </Text>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel} allowFontScaling={false}>
                Offer Coupon
              </Text>
              <Text style={styles.discountValue} allowFontScaling={false}>
                - {formatMoney(invoice.coupon)} First Service
              </Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel} allowFontScaling={false}>
                Care Membership Discount
              </Text>
              <Text style={styles.discountValue} allowFontScaling={false}>
                - {formatMoney(invoice.membership)}
              </Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel} allowFontScaling={false}>
                GST 18%
              </Text>
              <Text style={styles.invoiceValue} allowFontScaling={false}>
                {formatMoney(invoice.gst)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.invoiceRow}>
              <Text style={styles.totalLabel} allowFontScaling={false}>
                Total
              </Text>
              <Text style={styles.totalValue} allowFontScaling={false}>
                {formatMoney(invoice.total)}
              </Text>
            </View>
          </View>

          <CustomButton title="Pay Now" onPress={onPayNow} style={styles.payButton} />
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
    marginRight: 40,
  },
  headerSpacer: {
    width: 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  thanksIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  thanksTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#111827',
    textAlign: 'center',
  },
  thanksSubtitle: {
    marginTop: 8,
    marginBottom: 14,
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
  },
  experienceInput: {
    minHeight: 110,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  submitButton: {
    marginTop: 14,
  },
  invoiceCard: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
  },
  invoiceTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#111827',
    marginBottom: 14,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  invoiceLabel: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#6B7280',
  },
  invoiceValue: {
    flex: 1.4,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#111827',
    textAlign: 'right',
  },
  calculationText: {
    marginTop: 4,
    marginBottom: 12,
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#111827',
  },
  discountValue: {
    flex: 1.4,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#16A34A',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  totalLabel: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: '#111827',
  },
  totalValue: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.primary,
  },
  payButton: {
    marginTop: 20,
  },
});
