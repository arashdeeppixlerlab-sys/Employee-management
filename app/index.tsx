import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';

export default function Index() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [recoveringProfile, setRecoveringProfile] = useState(false);
  const recoveryAttemptedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || profile || recoveryAttemptedRef.current) return;

    recoveryAttemptedRef.current = true;
    setRecoveringProfile(true);

    const recover = async () => {
      const ok = await refreshProfile();
      if (!ok) {
        router.replace('/login');
      }
      setRecoveringProfile(false);
    };

    recover();
  }, [loading, user, profile, refreshProfile, router]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!profile) {
      if (!recoveryAttemptedRef.current) return;
      if (recoveringProfile) return;
      router.replace('/login');
      return;
    } else if (profile?.role === 'admin') {
      router.replace('/(admin-tabs)/dashboard');
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, profile, loading, router, recoveringProfile]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 10 }}>
        {recoveringProfile ? 'Recovering profile...' : 'Loading...'}
      </Text>
    </View>
  );
}