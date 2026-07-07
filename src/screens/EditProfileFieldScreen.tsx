import React, {useMemo, useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {CustomButton, CustomInput} from '../components';
import {COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService, storage} from '../services';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfileField'>;

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const FIELD_META = {
  name: {
    title: 'Update Name',
    label: 'Full Name',
    placeholder: 'Enter your full name',
    keyboardType: 'default' as const,
  },
  email: {
    title: 'Update Email',
    label: 'Email',
    placeholder: 'Enter your email address',
    keyboardType: 'email-address' as const,
  },
  emergency: {
    title: 'Emergency Contact',
    label: 'Emergency Contact Number',
    placeholder: 'Enter emergency contact number',
    keyboardType: 'number-pad' as const,
  },
  dateOfBirth: {
    title: 'Date of Birth',
    label: 'Date of Birth',
    placeholder: 'DD/MM/YYYY',
    keyboardType: 'default' as const,
  },
};

export function EditProfileFieldScreen({navigation, route}: Props) {
  const {field, initialValue = ''} = route.params;
  const meta = FIELD_META[field];

  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const trimmedValue = value.trim();

  const error = useMemo(() => {
    if (field === 'name') {
      if (!trimmedValue) {
        return 'Name is required';
      }
      if (trimmedValue.length < 2) {
        return 'Name should be at least 2 characters';
      }
    }
    if (field === 'email' && trimmedValue && !isValidEmail(trimmedValue)) {
      return 'Enter a valid email address';
    }
    if (field === 'emergency') {
      if (!trimmedValue) {
        return 'Emergency contact is required';
      }
      if (!/^\d{10}$/.test(trimmedValue.replace(/\D/g, ''))) {
        return 'Emergency contact must be 10 digits';
      }
    }
    if (field === 'dateOfBirth' && !trimmedValue) {
      return 'Date of birth is required';
    }
    return undefined;
  }, [field, trimmedValue]);

  const isSaveDisabled = Boolean(error) || isSaving;

  const onChangeValue = (next: string) => {
    if (field === 'emergency') {
      setValue(next.replace(/\D/g, '').slice(0, 10));
      return;
    }
    if (field === 'name') {
      setValue(next.replace(/\s{2,}/g, ' '));
      return;
    }
    setValue(next);
  };

  const onSave = async () => {
    if (isSaveDisabled) {
      return;
    }

    setIsSaving(true);
    try {
      if (field === 'name') {
        const normalizedName = trimmedValue
          .split(' ')
          .filter(Boolean)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        await authService.updateProfile({name: normalizedName});
      } else if (field === 'email') {
        await authService.updateProfile({email: trimmedValue});
      } else {
        const existing = (await storage.getLocalProfile()) ?? {};
        await storage.setLocalProfile({
          ...existing,
          ...(field === 'emergency'
            ? {emergencyContact: trimmedValue.replace(/\D/g, '').slice(-10)}
            : {dateOfBirth: trimmedValue}),
        });
      }
      navigation.goBack();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Could not update your profile. Please try again.';
      Alert.alert('Update failed', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            {meta.title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label} allowFontScaling={false}>
            {meta.label}
          </Text>
          <CustomInput
            value={value}
            onChangeText={onChangeValue}
            placeholder={meta.placeholder}
            keyboardType={meta.keyboardType}
            autoCapitalize={field === 'email' ? 'none' : 'words'}
            prefix={field === 'emergency' ? '+91' : undefined}
            error={value.length > 0 ? error : undefined}
          />
        </View>

        <View style={styles.footer}>
          <CustomButton
            title="Save"
            onPress={onSave}
            disabled={isSaveDisabled}
            loading={isSaving}
          />
        </View>
      </KeyboardAvoidingView>
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
    fontSize: 22,
    color: '#111827',
    marginLeft: 4,
  },
  headerSpacer: {
    width: 36,
  },
  form: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  label: {
    marginBottom: 8,
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#111827',
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
