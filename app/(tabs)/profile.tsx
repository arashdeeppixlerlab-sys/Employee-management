import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {
  Card,
  Button,
  IconButton,
  List,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/supabaseClient';
import AuthGuard from '../../src/components/AuthGuard';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const handleSignOut = async () => {
    // Platform-specific confirmation
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('Are you sure you want to sign out?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Sign Out', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      console.log('Signing out...');
      await supabase.auth.signOut();
      console.log('Sign out successful, redirecting to login');
      router.replace('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Still redirect even if there's an error
      router.replace('/login');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            {/* Profile Header */}
            <Card style={styles.profileCard}>
              <Card.Content style={styles.profileContent}>
                <View style={styles.profileHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(profile?.email?.[0] || 'U').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.userName}>
                      {profile?.email?.split('@')[0] || 'User'}
                    </Text>
                    <Text style={styles.userEmail}>{profile?.email}</Text>
                    <Text style={styles.userRole}>
                      Role: {profile?.role || 'Unknown'}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Account Information */}
            <Card style={styles.infoCard}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Account Information</Text>
                
                <List.Item
                  title="Email Address"
                  description={profile?.email || 'Not available'}
                  left={(props) => <List.Icon {...props} icon="email" />}
                />
                
                <List.Item
                  title="User Role"
                  description={profile?.role || 'Unknown'}
                  left={(props) => <List.Icon {...props} icon="account-badge" />}
                />
                
                <List.Item
                  title="Member Since"
                  description={profile?.created_at ? formatDate(profile.created_at) : 'Unknown'}
                  left={(props) => <List.Icon {...props} icon="calendar" />}
                />
                
                <List.Item
                  title="Last Updated"
                  description={profile?.updated_at ? formatDate(profile.updated_at) : 'Unknown'}
                  left={(props) => <List.Icon {...props} icon="update" />}
                />
              </Card.Content>
            </Card>

            {/* Quick Actions */}
            <Card style={styles.actionsCard}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                
                <List.Item
                  title="View Dashboard"
                  description="Go to main dashboard"
                  left={(props) => <List.Icon {...props} icon="view-dashboard" />}
                  onPress={() => router.push('/(tabs)/dashboard')}
                />
                
                <List.Item
                  title="My Documents"
                  description="View and manage documents"
                  left={(props) => <List.Icon {...props} icon="folder" />}
                  onPress={() => router.push('/(tabs)/documents')}
                />
                
                <List.Item
                  title="Upload Document"
                  description="Add a new document"
                  left={(props) => <List.Icon {...props} icon="upload" />}
                  onPress={() => router.push('/documents/upload')}
                />
              </Card.Content>
            </Card>

            {/* Sign Out Button */}
            <Button
              mode="outlined"
              onPress={handleSignOut}
              style={styles.signOutButton}
              textColor="#ef4444"
              icon="logout"
            >
              Sign Out
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    padding: 16,
    gap: 20,
  },
  profileCard: {
    elevation: 2,
  },
  profileContent: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  infoCard: {
    elevation: 1,
  },
  actionsCard: {
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 16,
  },
  signOutButton: {
    borderColor: '#ef4444',
    marginTop: 8,
  },
});
