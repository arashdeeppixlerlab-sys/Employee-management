import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Divider, Switch, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/hooks/useAuth';
import { supabase } from '../src/services/supabase/supabaseClient';
import { ProfilePhotoService } from '../src/services/ProfilePhotoService';
import { AuthService } from '../src/services/AuthService';
import { useI18n } from '../src/i18n';
import PageHeader from '../src/components/PageHeader';

type SettingsForm = {
  pushNotifications: boolean;
  timezone: string;
};

const DEFAULT_SETTINGS: SettingsForm = {
  pushNotifications: true,
  timezone: 'UTC+05:30',
};

const TIMEZONE_OPTIONS = [
  'UTC+05:30',
  'UTC+00:00',
  'UTC-05:00',
  'UTC+01:00',
  'UTC+08:00',
];

const parseUtcOffsetMinutes = (timezone: string) => {
  const match = timezone.match(/^UTC([+-])(\d{2}):(\d{2})$/);
  if (!match) return null;
  const sign = match[1] === '+' ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return sign * (hours * 60 + minutes);
};

export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useI18n();
  const [displayProfile, setDisplayProfile] = useState(profile);
  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [initialForm, setInitialForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const passwordSubmitLockRef = useRef(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [timezoneMenuVisible, setTimezoneMenuVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setDisplayProfile(profile);
    const nextForm: SettingsForm = {
      pushNotifications: profile?.push_notifications ?? DEFAULT_SETTINGS.pushNotifications,
      timezone: profile?.timezone ?? DEFAULT_SETTINGS.timezone,
    };
    setForm(nextForm);
    setInitialForm(nextForm);
  }, [profile]);

  const hasChanges = useMemo(() => {
    return (
      form.pushNotifications !== initialForm.pushNotifications ||
      form.timezone.trim() !== initialForm.timezone.trim()
    );
  }, [form, initialForm]);

  const canSubmitPassword = useMemo(() => {
    return Boolean(currentPassword && newPassword && confirmPassword && !passwordSaving);
  }, [currentPassword, newPassword, confirmPassword, passwordSaving]);

  const clearPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess('');
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const validatePasswordForm = (current: string, next: string, confirm: string) => {
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    if (!current) errors.currentPassword = t('security.fillAll');
    if (!next) errors.newPassword = t('security.fillAll');
    if (!confirm) errors.confirmPassword = t('security.fillAll');

    if (next && next.length < 8) {
      errors.newPassword = t('security.minLength');
    }
    if (current && next && current === next) {
      errors.newPassword = t('security.passwordDifferent');
    }
    if (next && confirm && next !== confirm) {
      errors.confirmPassword = t('security.passwordMismatch');
    }

    return errors;
  };

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('settings.userNotAuthenticated'));
      return;
    }

    const timezone = form.timezone.trim();

    if (!timezone) {
      Alert.alert(t('common.validation'), t('settings.validationRequired'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          push_notifications: form.pushNotifications,
          timezone,
        })
        .eq('id', user.id);

      if (error) {
        Alert.alert(t('common.error'), error.message || t('settings.saveFailed'));
        return;
      }

      await refreshProfile();
      const nextForm = {
        ...form,
        timezone,
      };
      setForm(nextForm);
      setInitialForm(nextForm);
      Alert.alert(t('common.success'), t('settings.updatedSuccess'));
    } catch (error) {
      Alert.alert(t('common.error'), t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setForm(initialForm);

  const handleChangePassword = async () => {
    if (passwordSaving || passwordSubmitLockRef.current) return;
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();
    const errors = validatePasswordForm(current, next, confirm);
    setPasswordSuccess('');

    if (errors.currentPassword || errors.newPassword || errors.confirmPassword) {
      setPasswordErrors(errors);
      return;
    }

    passwordSubmitLockRef.current = true;
    setPasswordErrors({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setPasswordSaving(true);
    try {
      const result = await AuthService.changePassword(current, next, user?.email);
      if (!result.success) {
        setPasswordErrors((prev) => ({
          ...prev,
          currentPassword: result.error || t('security.changeFailed'),
        }));
        return;
      }
      clearPasswordForm();
      setPasswordSuccess(t('security.changedSuccess'));
      Alert.alert(t('common.success'), t('security.changedSuccess'));
    } catch {
      setPasswordErrors((prev) => ({
        ...prev,
        currentPassword: t('security.changeFailed'),
      }));
    } finally {
      passwordSubmitLockRef.current = false;
      setPasswordSaving(false);
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
        if (result.error === 'Image selection cancelled') return;
        Alert.alert(t('common.error'), result.error || 'Failed to upload photo');
        return;
      }

      await refreshProfile();
      setDisplayProfile((prev) =>
        prev
          ? {
              ...prev,
              profile_photo_url: result.photoUrl || null,
            }
          : prev,
      );
    } catch {
      Alert.alert(t('common.error'), 'Failed to upload photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.id || photoLoading || !displayProfile?.profile_photo_url) return;
    setPhotoLoading(true);
    try {
      const result = await ProfilePhotoService.removeProfilePhoto(
        user.id,
        displayProfile.profile_photo_url,
      );
      if (!result.success) {
        Alert.alert(t('common.error'), result.error || 'Failed to remove photo');
        return;
      }

      await refreshProfile();
      setDisplayProfile((prev) =>
        prev
          ? {
              ...prev,
              profile_photo_url: null,
            }
          : prev,
      );
    } catch {
      Alert.alert(t('common.error'), 'Failed to remove photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  const previewDateTime = useMemo(() => {
    const offsetMinutes = parseUtcOffsetMinutes(form.timezone.trim());
    const now = new Date();
    try {
      if (offsetMinutes === null) {
        return new Intl.DateTimeFormat('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
        }).format(now);
      }
      const utcTimestamp = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
      const targetTime = new Date(utcTimestamp + offsetMinutes * 60 * 1000);
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(targetTime);
    } catch {
      return now.toLocaleString();
    }
  }, [form.timezone]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 10) }]}>
          <PageHeader title={t('settings.title')} />
          <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>

          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>{t('settings.section.account')}</Text>
              <View style={styles.profileTopRow}>
                <View>
                  {displayProfile?.profile_photo_url ? (
                    <Image source={{ uri: displayProfile.profile_photo_url }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {(displayProfile?.name?.[0] || displayProfile?.email?.[0] || 'U').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={handleUploadPhoto}
                    activeOpacity={0.9}
                    disabled={photoLoading}
                  >
                    <Ionicons name="camera" size={14} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.profileInfoCol}>
                  <Text style={styles.profileName}>{displayProfile?.name || 'User'}</Text>
                  <Text style={styles.profileMeta}>{displayProfile?.email || t('settings.noEmail')}</Text>
                  <Text style={styles.profileMeta}>
                    {t('settings.role')}: {displayProfile?.role || t('settings.unknown')}
                  </Text>
                </View>
              </View>
              {displayProfile?.profile_photo_url ? (
                <TouchableOpacity onPress={handleDeletePhoto} disabled={photoLoading} activeOpacity={0.7}>
                  <Text style={styles.removePhotoText}>Remove Photo</Text>
                </TouchableOpacity>
              ) : null}
            </Card.Content>
          </Card>

          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>{t('settings.section.notifications')}</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{t('settings.pushNotifications')}</Text>
                <Switch
                  value={form.pushNotifications}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, pushNotifications: value }))
                  }
                />
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>{t('settings.section.localization')}</Text>

              <Text style={styles.fieldLabel}>{t('settings.timezone')}</Text>
              <Pressable
                style={styles.selectButton}
                onPress={() => setTimezoneMenuVisible(true)}
              >
                <Text style={styles.selectButtonText}>{form.timezone}</Text>
              </Pressable>

              <View style={styles.previewBox}>
                <Text style={styles.previewLabel}>{t('settings.preview')}</Text>
                <Text style={styles.previewValue}>{previewDateTime}</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>{t('settings.section.securityShortcut')}</Text>
              <TextInput
                label={t('security.currentPassword')}
                value={currentPassword}
                onChangeText={(value) => {
                  setCurrentPassword(value);
                  if (passwordSuccess) setPasswordSuccess('');
                  if (passwordErrors.currentPassword) {
                    setPasswordErrors((prev) => ({ ...prev, currentPassword: '' }));
                  }
                }}
                mode="outlined"
                secureTextEntry={!showCurrentPassword}
                error={Boolean(passwordErrors.currentPassword)}
                right={
                  <TextInput.Icon
                    icon={showCurrentPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowCurrentPassword((prev) => !prev)}
                    forceTextInputFocus={false}
                  />
                }
                style={styles.input}
              />
              {passwordErrors.currentPassword ? (
                <Text style={styles.errorText}>{passwordErrors.currentPassword}</Text>
              ) : null}
              <TextInput
                label={t('security.newPassword')}
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  if (passwordSuccess) setPasswordSuccess('');
                  if (passwordErrors.newPassword) {
                    setPasswordErrors((prev) => ({ ...prev, newPassword: '' }));
                  }
                }}
                mode="outlined"
                secureTextEntry={!showNewPassword}
                error={Boolean(passwordErrors.newPassword)}
                right={
                  <TextInput.Icon
                    icon={showNewPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    forceTextInputFocus={false}
                  />
                }
                style={styles.input}
              />
              {passwordErrors.newPassword ? (
                <Text style={styles.errorText}>{passwordErrors.newPassword}</Text>
              ) : null}
              <TextInput
                label={t('security.confirmNewPassword')}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (passwordSuccess) setPasswordSuccess('');
                  if (passwordErrors.confirmPassword) {
                    setPasswordErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }
                }}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                error={Boolean(passwordErrors.confirmPassword)}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    forceTextInputFocus={false}
                  />
                }
                style={styles.input}
              />
              {passwordErrors.confirmPassword ? (
                <Text style={styles.errorText}>{passwordErrors.confirmPassword}</Text>
              ) : null}
              <Text style={styles.requirementText}>{t('security.requirement')}</Text>
              {passwordSuccess ? <Text style={styles.successText}>{passwordSuccess}</Text> : null}
              <View style={styles.passwordActions}>
                <Button mode="outlined" onPress={clearPasswordForm} disabled={passwordSaving}>
                  {t('common.reset')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleChangePassword}
                  loading={passwordSaving}
                  disabled={!canSubmitPassword}
                >
                  {t('security.changePassword')}
                </Button>
              </View>
              <Button mode="text" onPress={() => router.push('/security')}>
                {t('settings.openSecurity')}
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.actions}>
            <Button mode="outlined" onPress={handleReset} disabled={!hasChanges || saving}>
              {t('common.reset')}
            </Button>
            <Button mode="contained" onPress={handleSave} loading={saving} disabled={!hasChanges || saving}>
              {t('settings.saveSettings')}
            </Button>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={timezoneMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimezoneMenuVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setTimezoneMenuVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.selectTimezone')}</Text>
            {TIMEZONE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={styles.modalItem}
                onPress={() => {
                  setForm((prev) => ({ ...prev, timezone: option }));
                  setTimezoneMenuVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
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
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 18,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  profileInfoCol: {
    flex: 1,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#e5dccd',
    backgroundColor: '#f2efe9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 32,
    color: '#1f2937',
    fontWeight: '500',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#e5dccd',
  },
  photoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    top: -2,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  removePhotoText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  switchLabel: {
    fontSize: 15,
    color: '#111111',
    fontWeight: '500',
  },
  divider: {
    marginVertical: 6,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 6,
    marginTop: 2,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  selectButtonText: {
    fontSize: 15,
    color: '#111111',
  },
  previewBox: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
  },
  previewLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  previewValue: {
    fontSize: 14,
    color: '#111111',
    fontWeight: '500',
  },
  input: {
    marginBottom: 10,
  },
  errorText: {
    marginTop: -4,
    marginBottom: 8,
    fontSize: 12,
    color: '#dc2626',
  },
  successText: {
    marginTop: 8,
    fontSize: 12,
    color: '#15803d',
  },
  requirementText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  passwordActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalItemText: {
    fontSize: 15,
    color: '#111111',
  },
});
