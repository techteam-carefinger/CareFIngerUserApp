import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {CustomButton} from '../components/CustomButton';
import {FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Recharge'>;

export function RechargeScreen({navigation, route}: Props) {
  const {planTitle, amount} = route.params;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0E7490" />
          </Pressable>
          <Text style={styles.title} allowFontScaling={false}>
            Recharge
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet-outline" size={36} color="#0E7490" />
          </View>
          <Text style={styles.planTitle} allowFontScaling={false}>
            {planTitle}
          </Text>
          <Text style={styles.amount} allowFontScaling={false}>
            ₹{amount}
          </Text>
          <Text style={styles.description} allowFontScaling={false}>
            Recharge minutes to book care services and continue with your ride.
          </Text>
        </View>

        <View style={styles.footer}>
          <CustomButton title={`Recharge ₹${amount}`} onPress={() => {}} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 24,
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 22,
    color: '#0E7490',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 34,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 4,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  planTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    color: '#111827',
    textAlign: 'center',
  },
  amount: {
    marginTop: 8,
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: '#0E7490',
  },
  description: {
    marginTop: 16,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 16,
  },
});
