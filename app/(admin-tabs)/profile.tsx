import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import { Button, Card, Avatar, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase/supabaseClient';

const { width } = Dimensions.get('window');

export default function AdminProfile() {
  const [profile, setProfile] = useState<{ name?: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const { data } = await supabase
          .from('profiles')
          .select('name, email')
          .eq('id', user.id)
          .maybeSingle();

        setProfile(data);

        const { count: empCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'employee');

        if (empCount !== null) setEmployeeCount(empCount);

        const { count: docCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true });

        if (docCount !== null) setDocumentCount(docCount);

      } catch (error) {
        console.log('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ FIXED LOGOUT
  const handleLogout = async () => {
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
      const { error } = await supabase.auth.signOut();

      if (!error) {
        router.replace('/login'); // ✅ CRITICAL FIX
      } else {
        console.log('Logout error:', error);
      }
    } catch (e) {
      console.log('Logout crash:', e);
      router.replace('/login'); // fallback
    }
  };

  const menuItems = [
    {
      icon: 'settings-outline',
      title: 'Settings',
      subtitle: 'App preferences',
      onPress: () => router.push('/settings'),
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Security',
      subtitle: 'Password & access',
      onPress: () => router.push('/security'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get help',
      onPress: () => router.push('/help'),
    },
    {
      icon: 'document-text-outline',
      title: 'Terms & Privacy',
      subtitle: 'Legal info',
      onPress: () => router.push('/terms'),
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileHeader}>
            <Avatar.Text 
              size={80} 
              label={profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'A'}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.name || 'Admin User'}
              </Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>Administrator</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="people-outline" size={24} color="#2563eb" />
              <Text style={styles.statNumber}>{employeeCount}</Text>
              <Text style={styles.statLabel}>Total Employees</Text>
            </View>
          </Card>
          
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="document-text-outline" size={24} color="#2563eb" />
              <Text style={styles.statNumber}>{documentCount}</Text>
              <Text style={styles.statLabel}>Documents</Text>
            </View>
          </Card>
        </View>

        {/* Account Information */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Account Information</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>
                  {profile?.name || 'Not specified'}
                </Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{profile?.email}</Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Account Type</Text>
                <Text style={styles.infoValue}>Administrator</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons 
                  name={item.icon as any} 
                  size={24} 
                  color="#6b7280" 
                  style={styles.menuIcon}
                />
                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button 
            mode="outlined" 
            onPress={handleLogout}
            style={styles.logoutButton}
            contentStyle={styles.logoutButtonContent}
            textColor="#ef4444"
          >
            <Ionicons name="log-out-outline" size={20} style={{ marginRight: 8 }} />
            Sign Out
          </Button>
        </View>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>Employee Management System</Text>
          <Text style={styles.versionNumber}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#2563eb',
  },
  avatarLabel: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '600',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: -16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statContent: {
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  infoCard: {
    margin: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 16,
  },
  infoRow: {
    paddingVertical: 4,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#111111',
    fontWeight: '500',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#f3f4f6',
  },
  menuContainer: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111111',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 16,
  },
  logoutButton: {
    borderColor: '#ef4444',
    backgroundColor: '#ffffff',
  },
  logoutButtonContent: {
    paddingVertical: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 32,
  },
  versionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  versionNumber: {
    fontSize: 12,
    color: '#9ca3af',
  },
  
});
