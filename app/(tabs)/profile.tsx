import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  Button,
  IconButton,
  List,
  TextInput,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/supabaseClient';
import { ProfilePhotoService } from '../../src/services/ProfilePhotoService';
import AuthGuard from '../../src/components/AuthGuard';
import { confirmAction } from '../../src/utils/confirmAction';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile: authProfile, refreshProfile, logout } = useAuth();
  const [displayProfile, setDisplayProfile] = React.useState<any>(authProfile);
  const [editMode, setEditMode] = React.useState(false);
  const [photoLoading, setPhotoLoading] = React.useState(false);

  type EditableProfile = {
    name?: string | null;
    email?: string | null;
    bio?: string | null;
    education?: string | null;
    age?: number | string | null;
    address?: string | null;
  };

  const extractEditableFields = (p: any): EditableProfile => ({
    name: (p?.name ?? '') as string,
    email: (p?.email ?? '') as string,
    bio: (p?.bio ?? '') as string,
    education: (p?.education ?? '') as string,
    age: (p?.age ?? '') as number | string,
    address: (p?.address ?? '') as string,
  });

  const [form, setForm] = React.useState(() => ({
    name: '',
    email: '',
    bio: '',
    education: '',
    age: '',
    address: '',
  }));
  const [initialForm, setInitialForm] = React.useState(() => ({
    name: '',
    email: '',
    bio: '',
    education: '',
    age: '',
    address: '',
  }));

  React.useEffect(() => {
    setDisplayProfile(authProfile);
    if (!editMode) {
      const f = extractEditableFields(authProfile);
      setForm({
        name: (f.name ?? '').toString(),
        email: (f.email ?? '').toString(),
        bio: (f.bio ?? '').toString(),
        education: (f.education ?? '').toString(),
        age: f.age === null || f.age === undefined ? '' : f.age.toString(),
        address: (f.address ?? '').toString(),
      });
      setInitialForm({
        name: (f.name ?? '').toString(),
        email: (f.email ?? '').toString(),
        bio: (f.bio ?? '').toString(),
        education: (f.education ?? '').toString(),
        age: f.age === null || f.age === undefined ? '' : f.age.toString(),
        address: (f.address ?? '').toString(),
      });
    }
  }, [authProfile, editMode]);

  const handleEditPress = () => {
    const f = initialForm;
    setForm({ ...f });
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
    const ageValue =
      ageTrimmed.length === 0 ? null : Number(ageTrimmed);

    if (ageTrimmed.length > 0 && !Number.isFinite(ageValue)) {
      Alert.alert('Validation', 'Age must be a valid number');
      return;
    }

    // Only update fields that exist in the basic schema
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
      userId: string,
      updatePayload: any,
    ) => {
      let remainingPayload = { ...updatePayload };
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error } = await supabase
          .from('profiles')
          .update(remainingPayload)
          .eq('id', userId);

        if (!error) {
          return { success: true as const, usedPayload: remainingPayload };
        }

        const message = error?.message || '';
        // PostgREST: Could not find the 'address' column of 'profiles' in the schema cache
        const match = message.match(/Could not find the '([^']+)' column/);
        if (!match?.[1]) {
          return { success: false as const, error };
        }

        const missingColumn = match[1];
        if (!Object.prototype.hasOwnProperty.call(remainingPayload, missingColumn)) {
          return { success: false as const, error };
        }

        // Remove missing column and retry
        const { [missingColumn]: _, ...rest } = remainingPayload;
        remainingPayload = rest;
      }

      return {
        success: false as const,
        error: new Error('Profile update failed - unknown issue'),
      };
    };

    try {
      const userId = user?.id as string | undefined;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const result = await updateWithMissingColumnFallback(userId, payload);
      if (!result.success) {
        const message =
          result.error?.message || 'Failed to save profile';
        console.error('Profile update error:', result.error);
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
        age: usedPayload.age === null ? '' : usedPayload.age?.toString?.() || '',
        address: usedPayload.address ?? '',
      };
      setInitialForm(nextInitialForm);
      setForm({ ...nextInitialForm });
      setDisplayProfile((prev: any) => ({
        ...prev,
        name: usedPayload.name,
        email: usedPayload.email,
        bio: usedPayload.bio,
        education: usedPayload.education,
        age: usedPayload.age,
        address: usedPayload.address,
      }));
    } catch (e) {
      console.error('Profile save exception:', e);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const handleUploadPhoto = async () => {
    if (!user?.id || photoLoading) return;
    setPhotoLoading(true);
    try {
      const result = await ProfilePhotoService.uploadProfilePhoto(
        user.id,
        displayProfile?.profile_photo_url,
      );
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to upload photo');
        return;
      }

      await refreshProfile();
      setDisplayProfile((prev: any) => ({
        ...prev,
        profile_photo_url: result.photoUrl || null,
      }));
      Alert.alert('Success', 'Profile photo updated');
    } catch (e) {
      Alert.alert('Error', 'Failed to upload photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.id || photoLoading) return;
    if (!displayProfile?.profile_photo_url) return;
    setPhotoLoading(true);
    try {
      const result = await ProfilePhotoService.removeProfilePhoto(
        user.id,
        displayProfile?.profile_photo_url,
      );
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to delete photo');
        return;
      }
      await refreshProfile();
      setDisplayProfile((prev: any) => ({
        ...prev,
        profile_photo_url: null,
      }));
      Alert.alert('Success', 'Profile photo removed');
    } catch (e) {
      Alert.alert('Error', 'Failed to delete photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSignOut = async () => {
    // Platform-specific confirmation
    const confirmed = await confirmAction({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
    });

    if (!confirmed) return;

    try {
      await logout();
      router.replace('/login');
    } catch {
      router.replace('/login');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
            {/* Profile Header */}
            <Card style={styles.profileCard}>
              <Card.Content style={styles.profileContent}>
                <View style={styles.profileHeader}>
                  {displayProfile?.profile_photo_url ? (
                    <Image source={{ uri: displayProfile.profile_photo_url }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(displayProfile?.email?.[0] || 'U').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.profileInfo}>
                    <Text style={styles.userName}>
                      {displayProfile?.email?.split('@')[0] || 'User'}
                    </Text>
                    <Text style={styles.userEmail}>{displayProfile?.email}</Text>
                    <Text style={styles.userRole}>
                      Role: {displayProfile?.role || 'Unknown'}
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
                  description={displayProfile?.email || 'Not available'}
                  left={(props) => <List.Icon {...props} icon="email" />}
                />

                <List.Item
                  title="User Role"
                  description={displayProfile?.role || 'Unknown'}
                  left={(props) => <List.Icon {...props} icon="account-badge" />}
                />

                <List.Item
                  title="Member Since"
                  description={
                    displayProfile?.created_at ? formatDate(displayProfile.created_at) : 'Unknown'
                  }
                  left={(props) => <List.Icon {...props} icon="calendar" />}
                />

                <List.Item
                  title="Last Updated"
                  description={
                    displayProfile?.updated_at ? formatDate(displayProfile.updated_at) : 'Unknown'
                  }
                  left={(props) => <List.Icon {...props} icon="update" />}
                />
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
                      {displayProfile?.profile_photo_url ? 'Update Photo' : 'Add Photo'}
                    </Button>
                    {displayProfile?.profile_photo_url ? (
                      <Button
                        mode="text"
                        onPress={handleDeletePhoto}
                        disabled={photoLoading}
                        textColor="#ef4444"
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

                <List.Item
                  title="Settings"
                  description="Manage notifications and preferences"
                  left={(props) => <List.Icon {...props} icon="cog-outline" />}
                  onPress={() => router.push('/settings')}
                />

                <List.Item
                  title="Security"
                  description="Change your password"
                  left={(props) => <List.Icon {...props} icon="shield-lock-outline" />}
                  onPress={() => router.push('/security')}
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
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  editProfileButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editCard: {
    elevation: 1,
    marginTop: 8,
  },
  textInput: {
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  editButton: {
    minWidth: 120,
  },
});
