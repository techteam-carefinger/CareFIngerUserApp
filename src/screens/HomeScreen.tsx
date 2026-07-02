import React, {useState} from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {BottomTab} from '../components/home/BottomTab';
import {LocationItem} from '../components/home/LocationItem';
import {SearchBar} from '../components/home/SearchBar';
import {ShareCard} from '../components/home/ShareCard';
import {RootStackParamList} from '../navigation/types';

type Location = {
  icon: 'home-outline' | 'time-outline';
  title: string;
  subtitle: string;
  isFavorite?: boolean;
};

type Tab = {
  icon: 'home-outline' | 'pricetag-outline' | 'person-outline';
  label: string;
};

type Banner = {
  id: string;
  image: any;
};

const LOCATIONS: Location[] = [
  {
    icon: 'home-outline',
    title: 'Home',
    subtitle: 'Central Market, Sector 4, Madangir, New Delhi',
    isFavorite: true,
  },
  {
    icon: 'time-outline',
    title: 'Madangir market',
    subtitle: 'Raja Ram Marg, Block B, Doctor Ambedkar Nagar',
  },
  {
    icon: 'time-outline',
    title: 'A4',
    subtitle: 'Press Enclave Marg, Saket District Centre, Delhi',
  },
];

const TABS: Tab[] = [
  {icon: 'home-outline', label: 'Home'},
  {icon: 'pricetag-outline', label: 'Offers'},
  {icon: 'person-outline', label: 'Profile'},
];

const BANNERS: Banner[] = [
  {
    id: '1',
    image: require('../../assets/image_02-74316f0a-4d16-4a6b-aee8-c8f780c105d4.png'),
  },
  {
    id: '2',
    image: require('../../assets/image_03-ff4d1607-151a-4944-bc56-39b0964c2d7a.png'),
  },
  {
    id: '3',
    image: require('../../assets/image_04-75184bd0-7e9c-44a5-9160-fc6e3a90d012.png'),
  },
  {
    id: '4',
    image: require('../../assets/Image_01-debbe5ef-8467-48ca-858e-b7080e094f34.png'),
  },
  {
    id: '5',
    image: require('../../assets/image_05-1ba0f72c-f4a4-487d-a8a9-4875ffd86fa0.png'),
  },
  {
    id: '6',
    image: require('../../assets/image_06-f0c54cdf-f726-4bd3-bc1f-2074a63de1f5.png'),
  },
];

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const bannerWidth = width - 32;
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const handleBannerScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / bannerWidth);
    setActiveBannerIndex(index);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[styles.contentContainer, {paddingTop: Math.max(insets.top, 8)}]}
          showsVerticalScrollIndicator={false}>
          <SearchBar onPress={() => navigation.navigate('LocationSearch')} />

          <View style={styles.card}>
            {LOCATIONS.map((location, index) => (
              <LocationItem
                key={`${location.title}-${index}`}
                icon={location.icon}
                title={location.title}
                subtitle={location.subtitle}
                isLast={index === LOCATIONS.length - 1}
                isFavorite={location.isFavorite}
              />
            ))}
          </View>

          <View style={styles.bannerCarouselContainer}>
            <View style={styles.bannerWrap}>
              <FlatList
                data={BANNERS}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleBannerScrollEnd}
                renderItem={({item}) => (
                  <Image source={item.image} style={[styles.bannerImage, {width: bannerWidth}]} />
                )}
              />
            </View>
            <View style={styles.dotWrap}>
              {BANNERS.map((banner, index) => (
                <View
                  key={banner.id}
                  style={[styles.dot, activeBannerIndex === index && styles.activeDot]}
                />
              ))}
            </View>
          </View>

          <ShareCard />
        </ScrollView>

        <View style={styles.bottomBar}>
          {TABS.map(tab => (
            <BottomTab key={tab.label} icon={tab.icon} label={tab.label} active={tab.label === 'Home'} />
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
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
  },
  bannerCarouselContainer: {
    marginTop: 16,
  },
  bannerWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  bannerImage: {
    aspectRatio: 4 / 3,
    backgroundColor: '#F8FAFC',
    resizeMode: 'contain',
  },
  dotWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.25)',
    marginHorizontal: 3,
  },
  activeDot: {
    width: 18,
    backgroundColor: '#1F8A9E',
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
