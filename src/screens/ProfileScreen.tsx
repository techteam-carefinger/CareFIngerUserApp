import React, {useCallback, useState} from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';

import {BottomTab} from '../components/home/BottomTab';
import {APP_VERSION, COLORS, FONTS} from '../constants';
import {RootStackParamList} from '../navigation/types';
import {authService, storage} from '../services';
import {ApiUser} from '../types';

type MenuItem = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle?: string;
};

const MENU_ITEMS: MenuItem[] = [
  {id: 'help', icon: 'help-circle-outline', label: 'Help'},
  {id: 'rides', icon: 'time-outline', label: 'My Care Services'},
  {id: 'safety', icon: 'shield-outline', label: 'Safety'},
  {id: 'refer', icon: 'gift-outline', label: 'Refer and Earn', subtitle: 'Get ₹50'},
  {id: 'notifications', icon: 'notifications-outline', label: 'Notifications'},
];

const OTHER_MENU_ITEMS: MenuItem[] = [
  {id: 'about', icon: 'information-circle-outline', label: 'About', subtitle: APP_VERSION},
  {id: 'logout', icon: 'log-out-outline', label: 'Logout'},
  {id: 'delete', icon: 'trash-outline', label: 'Delete Account'},
];

const BOTTOM_TABS = [
  {icon: 'home-outline' as const, label: 'Home'},
  {icon: 'pricetag-outline' as const, label: 'Offers'},
  {icon: 'person-outline' as const, label: 'Profile'},
];

const openWhatsAppReferral = async () => {
  const message = '#Hope hain #Umeed Hain';
  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return;
    }

    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
  } catch {
    Alert.alert('WhatsApp unavailable', 'Could not open WhatsApp on this device.');
  }
};

export function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [user, setUser] = useState<ApiUser | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        const storedUser = await storage.getUser();
        if (!cancelled) {
          setUser(storedUser);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const displayName = user?.name?.trim() || 'User';
  const phoneNumber = user?.phoneNumber ?? '';

  const handleMenuPress = (itemId: string) => {
    if (itemId === 'rides') {
      navigation.navigate('MyCareServices');
      return;
    }

    if (itemId === 'refer') {
      void openWhatsAppReferral();
      return;
    }

    if (itemId === 'about') {
      Alert.alert('About CareFinger', `Version ${APP_VERSION}`);
      return;
    }

    if (itemId === 'logout') {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await authService.logout();
              navigation.reset({
                index: 0,
                routes: [{name: 'Login'}],
              });
            })();
          },
        },
      ]);
    }
  };

  const renderMenuCard = (items: MenuItem[]) => (
    <View style={styles.menuCard}>
      {items.map((item, index) => (
        <Pressable
          key={item.id}
          style={[styles.menuRow, index < items.length - 1 && styles.menuDivider]}
          onPress={() => handleMenuPress(item.id)}>
          <Ionicons
            name={item.icon}
            size={22}
            color={item.id === 'delete' ? '#DC2626' : '#111827'}
          />
          <View style={styles.menuTextWrap}>
            <Text
              style={[styles.menuLabel, item.id === 'delete' && styles.deleteLabel]}
              allowFontScaling={false}>
              {item.label}
            </Text>
            {item.subtitle ? (
              <Text style={styles.menuSubtitle} allowFontScaling={false}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.title} allowFontScaling={false}>
            Profile
          </Text>

          <View style={styles.profileCard}>
            <Pressable
              style={styles.profileTopRow}
              onPress={() => navigation.navigate('ProfileDetails')}>
              <View style={styles.avatarWrap}>
                {user?.profilePicture ? (
                  <Image source={{uri: user.profilePicture}} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person-outline" size={28} color={COLORS.primary} />
                )}
              </View>
              <View style={styles.profileTextWrap}>
                <Text style={styles.profileName} allowFontScaling={false}>
                  {displayName}
                </Text>
                <Text style={styles.profilePhone} allowFontScaling={false}>
                  {phoneNumber}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>

            <View style={styles.profileDivider} />

            <Pressable style={styles.ratingRow}>
              <Ionicons name="star" size={22} color="#FBBF24" />
              <Text style={styles.ratingText} allowFontScaling={false}>
                5.00 My Rating
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </Pressable>
          </View>

          {renderMenuCard(MENU_ITEMS)}

          <Text style={styles.sectionTitle} allowFontScaling={false}>
            OTHERS
          </Text>

          {renderMenuCard(OTHER_MENU_ITEMS)}
        </ScrollView>

        <View style={styles.bottomBar}>
          {BOTTOM_TABS.map(tab => (
            <BottomTab
              key={tab.label}
              icon={tab.icon}
              label={tab.label}
              active={tab.label === 'Profile'}
              onPress={() => {
                if (tab.label === 'Home') {
                  navigation.navigate('Home');
                }
              }}
            />
          ))}
        </View>
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: '#111827',
    marginBottom: 18,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden',
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileTextWrap: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: '#111827',
  },
  profilePhone: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#6B7280',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  ratingText: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#111827',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.primary,
    letterSpacing: 0.6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  menuDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: '#111827',
  },
  deleteLabel: {
    color: '#DC2626',
  },
  menuSubtitle: {
    marginTop: 2,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#6B7280',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: -4},
    elevation: 10,
  },
});
