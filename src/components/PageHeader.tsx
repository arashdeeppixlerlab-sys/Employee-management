import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

type PageHeaderProps = {
  title: string;
};

export default function PageHeader({ title }: PageHeaderProps) {
  const router = useRouter();
  const { isAdmin, isAuthenticated } = useAuth();
  const canGoBack = router.canGoBack();
  const fallbackRoute = !isAuthenticated
    ? '/login'
    : isAdmin
      ? '/(admin-tabs)/dashboard'
      : '/(tabs)/dashboard';
  const handleBack = () => {
    if (canGoBack) {
      router.back();
      return;
    }
    router.replace(fallbackRoute as any);
  };

  return (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
        <Ionicons name="chevron-back" size={20} color="#374151" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.backSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: {
    width: 34,
    height: 34,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },
});
