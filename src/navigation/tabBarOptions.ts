import { Platform } from 'react-native';

export const createTabBarStyle = (bottomInset: number) => ({
  backgroundColor: '#ffffff',
  borderTopWidth: 1,
  borderTopColor: '#e5e7eb',
  height:
    Platform.OS === 'web'
      ? 72
      : Platform.OS === 'ios'
        ? 82 + bottomInset
        : 56 + bottomInset,
  paddingBottom:
    Platform.OS === 'web'
      ? 10
      : Platform.OS === 'ios'
        ? 16 + bottomInset
        : 6 + bottomInset,
  paddingTop: 4,
});

export const defaultTabScreenOptions = (bottomInset: number) => ({
  headerShown: false as const,
  tabBarActiveTintColor: '#2563eb',
  tabBarInactiveTintColor: '#6b7280',
  tabBarStyle: createTabBarStyle(bottomInset),
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});
