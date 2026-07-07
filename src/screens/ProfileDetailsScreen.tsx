import React, {useCallback, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService, storage} from '../services';
import {ApiUser, LocalProfile} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileDetails'>;

type DetailRow = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  required?: boolean;
  editable?: boolean;
  actionLabel?: string;
  field?: 'name' | 'email' | 'emergency' | 'dateOfBirth';
};

const formatPhoneNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return local ? `+91 ${local}` : phone;
};

const formatMemberSince = (dateValue: string | null | undefined) => {
  if (!dateValue) {
    return new Intl.DateTimeFormat('en-US', {month: 'long', year: 'numeric'}).format(
      new Date(),
    );
  }
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }
  return new Intl.DateTimeFormat('en-US', {month: 'long', year: 'numeric'}).format(parsed);
};

export function ProfileDetailsScreen({navigation}: Props) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [localProfile, setLocalProfile] = useState<LocalProfile | null>(null);

  const loadProfile = useCallback(async () => {
    const [storedUser, storedLocalProfile] = await Promise.all([
      storage.getUser(),
      storage.getLocalProfile(),
    ]);
    setUser(storedUser);
    setLocalProfile(storedLocalProfile);

    try {
      const freshUser = await authService.me();
      setUser(freshUser);
    } catch {
      // Keep cached user when refresh fails offline.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const rows: DetailRow[] = [
    {
      id: 'name',
      icon: 'person-outline',
      label: 'Name',
      value: user?.name?.trim() || undefined,
      editable: true,
      field: 'name',
    },
    {
      id: 'phone',
      icon: 'call-outline',
      label: 'Phone Number',
      value: formatPhoneNumber(user?.phoneNumber ?? ''),
    },
    {
      id: 'email',
      icon: 'mail-outline',
      label: 'Email',
      value: user?.email?.trim() || undefined,
      required: !user?.email?.trim(),
      editable: true,
      field: 'email',
    },
    {
      id: 'gender',
      icon: 'male-female-outline',
      label: 'Gender',
      value: localProfile?.gender || 'Male',
    },
    {
      id: 'dob',
      icon: 'calendar-outline',
      label: 'Date of Birth',
      value: localProfile?.dateOfBirth,
      required: !localProfile?.dateOfBirth,
      editable: true,
      field: 'dateOfBirth',
    },
    {
      id: 'member',
      icon: 'ribbon-outline',
      label: 'Member Since',
      value: formatMemberSince(user?.planStartDate),
    },
    {
      id: 'emergency',
      icon: 'alert-circle-outline',
      label: 'Emergency contact',
      value: localProfile?.emergencyContact,
      required: !localProfile?.emergencyContact,
      editable: true,
      actionLabel: localProfile?.emergencyContact ? undefined : 'Add',
      field: 'emergency',
    },
  ];

  const openEditor = (row: DetailRow) => {
    if (!row.field) {
      return;
    }

    if (row.field === 'emergency') {
      navigation.navigate('EditProfileField', {
        field: 'emergency',
        initialValue: localProfile?.emergencyContact ?? '',
      });
      return;
    }

    if (row.field === 'dateOfBirth') {
      navigation.navigate('EditProfileField', {
        field: 'dateOfBirth',
        initialValue: localProfile?.dateOfBirth ?? '',
      });
      return;
    }

    if (row.field === 'name') {
      navigation.navigate('EditProfileField', {
        field: 'name',
        initialValue: user?.name ?? '',
      });
      return;
    }

    navigation.navigate('EditProfileField', {
      field: 'email',
      initialValue: user?.email ?? '',
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Profile
          </Text>
          <Pressable style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={16} color="#111827" />
            <Text style={styles.helpText} allowFontScaling={false}>
              Help
            </Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {rows.map((row, index) => {
            const showValue = row.value && !row.required;
            const showRequired = row.required && !row.value;
            const isPressable = Boolean(row.editable && row.field);

            return (
              <Pressable
                key={row.id}
                style={[styles.row, index < rows.length - 1 && styles.rowDivider]}
                disabled={!isPressable}
                onPress={() => openEditor(row)}>
                <Ionicons name={row.icon} size={22} color="#111827" />
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel} allowFontScaling={false}>
                    {row.label}
                  </Text>
                  {showValue ? (
                    <Text style={styles.rowValue} allowFontScaling={false}>
                      {row.value}
                    </Text>
                  ) : null}
                  {showRequired ? (
                    <Text style={styles.requiredText} allowFontScaling={false}>
                      Required
                    </Text>
                  ) : null}
                </View>
                {row.actionLabel ? (
                  <Text style={styles.actionText} allowFontScaling={false}>
                    {row.actionLabel}
                  </Text>
                ) : isPressable ? (
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: '#111827',
    marginLeft: 4,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  helpText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#111827',
  },
  rowValue: {
    marginTop: 4,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  requiredText: {
    marginTop: 4,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: '#EA580C',
  },
  actionText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: COLORS.primary,
  },
});
