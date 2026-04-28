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
  Image,
} from 'react-native';
import { Button, Card, Avatar, Divider, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase/supabaseClient';
import AuthGuard from '../../src/components/AuthGuard';
import { useAuth } from '../../src/hooks/useAuth';
import { ProfilePhotoService } from '../../src/services/ProfilePhotoService';
import { confirmAction } from '../../src/utils/confirmAction';

const { width } = Dimensions.get('window');

export default function AdminProfile() {
  const { refreshProfile } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    id?: string;
    name?: string | null;
    bio?: string | null;
    education?: string | null;
    age?: number | string | null;
    address?: string | null;
    profile_photo_url?: string | null;
    email: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [documentCount, setDocumentCount] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    bio: '',
    education: '',
    age: '',
    address: '',
  });
  const [initialForm, setInitialForm] = useState({
    name: '',
    email: '',
    bio: '',
    education: '',
    age: '',
    address: '',
  });
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;
        setUserId(user.id);

        const { data } = await supabase
          .from('profiles')
          .select('id, name, email, bio, education, age, address, profile_photo_url')
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

  useEffect(() => {
    if (!profile || editMode) return;
    setForm({
      name: (profile?.name ?? '').toString(),
      email: (profile?.email ?? '').toString(),
      bio: (profile?.bio ?? '').toString(),
      education: (profile?.education ?? '').toString(),
      age:
        profile?.age === null || profile?.age === undefined ? '' : profile?.age.toString(),
      address: (profile?.address ?? '').toString(),
    });
    setInitialForm({
      name: (profile?.name ?? '').toString(),
      email: (profile?.email ?? '').toString(),
      bio: (profile?.bio ?? '').toString(),
      education: (profile?.education ?? '').toString(),
      age:
        profile?.age === null || profile?.age === undefined ? '' : profile?.age.toString(),
      address: (profile?.address ?? '').toString(),
    });
  }, [profile, editMode]);

  const handleEditPress = () => {
    setForm({ ...initialForm });
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setForm({ ...initialForm });
    setEditMode(false);
  };

  const handleSaveProfile = async () => {
    const emailTrimmed = (form.email ?? '').trim();
    if (!emailTrimmed) {
      Alert.alert('Validation', 'Email is required');
      return;
    }

    const nameTrimmed = (form.name ?? '').trim();
    if (!nameTrimmed) {
      Alert.alert('Validation', 'Name is required');
      return;
    }

    const ageTrimmed = (form.age ?? '').toString().trim();
    const ageValue = ageTrimmed.length === 0 ? null : Number(ageTrimmed);

    if (ageTrimmed.length > 0 && !Number.isFinite(ageValue)) {
      Alert.alert('Validation', 'Age must be a valid number');
      return;
    }

    const payload = {
      email: emailTrimmed,
      name: nameTrimmed,
      bio: (form.bio ?? '').trim().length === 0 ? null : form.bio.trim(),
      education:
        (form.education ?? '').trim().length === 0 ? null : form.education.trim(),
      age: ageValue,
      address: (form.address ?? '').trim().length === 0 ? null : form.address.trim(),
    };

    const updateWithMissingColumnFallback = async (
      id: string,
      updatePayload: any,
    ) => {
      let remainingPayload = { ...updatePayload };
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error } = await supabase
          .from('profiles')
          .update(remainingPayload)
          .eq('id', id);

        if (!error) return { success: true as const, usedPayload: remainingPayload };

        const message = error?.message || '';
        const match = message.match(/Could not find the '([^']+)' column/);
        if (!match?.[1]) {
          return { success: false as const, error };
        }

        const missingColumn = match[1];
        if (!Object.prototype.hasOwnProperty.call(remainingPayload, missingColumn)) {
          return { success: false as const, error };
        }

        console.log('[PROFILE_SAVE_DEBUG][ADMIN] Removing missing column from payload:', missingColumn);
        const { [missingColumn]: _, ...rest } = remainingPayload;
        remainingPayload = rest;
      }

      return {
        success: false as const,
        error: new Error('Profile update failed - unknown issue'),
      };
    };

    try {
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const result = await updateWithMissingColumnFallback(userId, payload);
      if (!result.success) {
        const message = result.error?.message || 'Failed to save profile';
        console.error('Admin profile FULL error:', JSON.stringify(result.error, null, 2));
        Alert.alert('Error', message);
        return;
      }

      // Refresh global auth profile state so other screens see updated data
      await refreshProfile();

      Alert.alert('Success', 'Profile updated successfully');
      setEditMode(false);
      const usedPayload = result.usedPayload || payload;
      const nextInitialForm = {
        name: usedPayload.name ?? '',
        email: usedPayload.email ?? '',
        bio: usedPayload.bio ?? '',
        education: usedPayload.education ?? '',
        age: usedPayload.age === null || usedPayload.age === undefined ? '' : usedPayload.age.toString(),
        address: usedPayload.address ?? '',
      };
      setInitialForm(nextInitialForm);
      setForm({ ...nextInitialForm });
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          name: usedPayload.name,
          email: usedPayload.email,
          bio: usedPayload.bio,
          education: usedPayload.education,
          age: usedPayload.age,
          address: usedPayload.address,
        };
      });
    } catch (e) {
      console.error('Admin profile save exception:', e);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const handleUploadPhoto = async () => {
    if (!userId || photoLoading) return;
    setPhotoLoading(true);
    try {
      const result = await ProfilePhotoService.uploadProfilePhoto(
        userId,
        profile?.profile_photo_url,
      );
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to upload photo');
        return;
      }
      await refreshProfile();
      setProfile((prev) => {
        if (!prev) return prev;
        return { ...prev, profile_photo_url: result.photoUrl || null };
      });
      Alert.alert('Success', 'Profile photo updated');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!userId || photoLoading || !profile?.profile_photo_url) return;
    setPhotoLoading(true);
    try {
      const result = await ProfilePhotoService.removeProfilePhoto(
        userId,
        profile?.profile_photo_url,
      );
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to delete photo');
        return;
      }
      await refreshProfile();
      setProfile((prev) => {
        if (!prev) return prev;
        return { ...prev, profile_photo_url: null };
      });
      Alert.alert('Success', 'Profile photo removed');
    } finally {
      setPhotoLoading(false);
    }
  };

  // ✅ FIXED LOGOUT
  const handleLogout = async () => {
    const confirmed = await confirmAction({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
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
      <AuthGuard requiredRole="admin">
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text>Loading profile...</Text>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={styles.header}>
            <View style={styles.profileHeader}>
              {profile?.profile_photo_url ? (
                <Image source={{ uri: profile.profile_photo_url }} style={styles.avatarImage} />
              ) : (
                <Avatar.Text
                  size={80}
                  label={profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'A'}
                  style={styles.avatar}
                  labelStyle={styles.avatarLabel}
                />
              )}
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

          {/* Profile Edit */}
          {editMode ? (
            <Card style={styles.editCard}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Edit Profile</Text>

                <TextInput
                  label="Email"
                  value={form.email || ''}
                  onChangeText={(t) => setForm((prev) => ({ ...prev, email: t }))}
                  mode="outlined"
                  style={styles.textInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  label="Name"
                  value={form.name}
                  onChangeText={(t) => setForm((prev) => ({ ...prev, name: t }))}
                  mode="outlined"
                  style={styles.textInput}
                />
                <TextInput
                  label="Bio"
                  value={form.bio}
                  onChangeText={(t) => setForm((prev) => ({ ...prev, bio: t }))}
                  mode="outlined"
                  style={styles.textInput}
                  multiline
                />
                <TextInput
                  label="Education"
                  value={form.education}
                  onChangeText={(t) => setForm((prev) => ({ ...prev, education: t }))}
                  mode="outlined"
                  style={styles.textInput}
                  multiline
                />
                <TextInput
                  label="Age"
                  value={form.age}
                  onChangeText={(t) => setForm((prev) => ({ ...prev, age: t }))}
                  mode="outlined"
                  style={styles.textInput}
                  keyboardType="numeric"
                />
                <TextInput
                  label="Address"
                  value={form.address}
                  onChangeText={(t) => setForm((prev) => ({ ...prev, address: t }))}
                  mode="outlined"
                  style={styles.textInput}
                  multiline
                />

                <View style={styles.photoActions}>
                  <Button
                    mode="outlined"
                    onPress={handleUploadPhoto}
                    loading={photoLoading}
                    disabled={photoLoading}
                  >
                    {profile?.profile_photo_url ? 'Update Photo' : 'Add Photo'}
                  </Button>
                  {profile?.profile_photo_url ? (
                    <Button
                      mode="text"
                      onPress={handleDeletePhoto}
                      textColor="#ef4444"
                      disabled={photoLoading}
                    >
                      Remove Photo
                    </Button>
                  ) : null}
                </View>

                <View style={styles.editActions}>
                  <Button
                    mode="outlined"
                    onPress={handleCancelEdit}
                    style={styles.editButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSaveProfile}
                    style={styles.editButton}
                  >
                    Save
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : (
            <Button
              mode="contained"
              onPress={handleEditPress}
              style={styles.editProfileButton}
            >
              Edit Account
            </Button>
          )}

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
    </AuthGuard>
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  editCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  editProfileButton: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#2563eb',
  },
  textInput: {
    marginBottom: 12,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 4,
  },
  editButton: {
    minWidth: 120,
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
