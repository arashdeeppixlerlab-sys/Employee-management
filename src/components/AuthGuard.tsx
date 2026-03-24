import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'employee';
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, loading, profile, isAdmin, isEmployee } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Not authenticated - redirect to login
      if (!isAuthenticated || !profile) {
        router.replace('/login');
        return;
      }

      // Check role-based access ONLY if required
      if (requiredRole) {
        if (requiredRole === 'admin' && !isAdmin) {
          router.replace('/(tabs)/dashboard');
          return;
        }
        if (requiredRole === 'employee' && !isEmployee) {
          router.replace('/(tabs)/dashboard');
          return;
        }
      }
    }
  }, [loading, isAuthenticated, profile, isAdmin, isEmployee, requiredRole, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show loading while redirecting
  if (!isAuthenticated || !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check role access
  if (requiredRole) {
    if (requiredRole === 'admin' && !isAdmin) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Redirecting to employee dashboard...</Text>
          </View>
        </SafeAreaView>
      );
    }
    if (requiredRole === 'employee' && !isEmployee) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Redirecting to admin dashboard...</Text>
          </View>
        </SafeAreaView>
      );
    }
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});
