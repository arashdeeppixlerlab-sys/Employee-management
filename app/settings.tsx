import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Button, Card, Divider, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/hooks/useAuth';
import { supabase } from '../src/services/supabase/supabaseClient';
import { getLanguageLabel, LANGUAGE_OPTIONS, normalizeLocale, SupportedLocale, useI18n } from '../src/i18n';

type SettingsForm = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  language: SupportedLocale;
  timezone: string;
};

const DEFAULT_SETTINGS: SettingsForm = {
  emailNotifications: true,
  pushNotifications: true,
  language: 'en-US',
  timezone: 'UTC+05:30',
};

const TIMEZONE_OPTIONS = [
  'UTC+05:30',
  'UTC+00:00',
  'UTC-05:00',
  'UTC+01:00',
  'UTC+08:00',
];

export default function Settings() {
  const router = useRouter();
  const canGoBack = router.canGoBack();
  const { user, profile, refreshProfile } = useAuth();
  const { t, setLocale } = useI18n();
  const [form, setForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [initialForm, setInitialForm] = useState<SettingsForm>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const [timezoneMenuVisible, setTimezoneMenuVisible] = useState(false);

  useEffect(() => {
    const nextForm: SettingsForm = {
      emailNotifications: profile?.email_notifications ?? DEFAULT_SETTINGS.emailNotifications,
      pushNotifications: profile?.push_notifications ?? DEFAULT_SETTINGS.pushNotifications,
      language: normalizeLocale(profile?.language),
      timezone: profile?.timezone ?? DEFAULT_SETTINGS.timezone,
    };
    setForm(nextForm);
    setInitialForm(nextForm);
  }, [profile]);

  useEffect(() => {
    if (profile?.language) {
      setLocale(normalizeLocale(profile.language));
    }
  }, [profile?.language, setLocale]);

  const hasChanges = useMemo(() => {
    return (
      form.emailNotifications !== initialForm.emailNotifications ||
      form.pushNotifications !== initialForm.pushNotifications ||
      form.language !== initialForm.language ||
      form.timezone.trim() !== initialForm.timezone.trim()
    );
  }, [form, initialForm]);

  const handleSave = async () => {
    if (!user?.id) {
      Alert.alert(t('common.error'), t('settings.userNotAuthenticated'));
      return;
    }

    const language = normalizeLocale(form.language);
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
          email_notifications: form.emailNotifications,
          push_notifications: form.pushNotifications,
          language,
          timezone,
        })
        .eq('id', user.id);

      if (error) {
        Alert.alert(t('common.error'), error.message || t('settings.saveFailed'));
        return;
      }

      await setLocale(language);
      await refreshProfile();
      const nextForm = {
        ...form,
        language,
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

  const previewDateTime = useMemo(() => {
    const now = new Date();
    try {
      return new Intl.DateTimeFormat(form.language || 'en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(now);
    } catch {
      return now.toLocaleString();
    }
  }, [form.language]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            {canGoBack ? (
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={20} color="#374151" />
              </TouchableOpacity>
            ) : (
              <View style={styles.backSpacer} />
            )}
            <Text style={styles.headerTitle}>{t('settings.title')}</Text>
            <View style={styles.backSpacer} />
          </View>
          <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>

          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>{t('settings.section.account')}</Text>
              <Text style={styles.profileName}>{profile?.name || 'User'}</Text>
              <Text style={styles.profileMeta}>{profile?.email || t('settings.noEmail')}</Text>
              <Text style={styles.profileMeta}>{t('settings.role')}: {profile?.role || t('settings.unknown')}</Text>
            </Card.Content>
          </Card>

          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>{t('settings.section.notifications')}</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>{t('settings.emailNotifications')}</Text>
                <Switch
                  value={form.emailNotifications}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, emailNotifications: value }))
                  }
                />
              </View>
              <Divider style={styles.divider} />
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

              <Text style={styles.fieldLabel}>{t('settings.language')}</Text>
              <Pressable
                style={styles.selectButton}
                onPress={() => setLanguageMenuVisible(true)}
              >
                <Text style={styles.selectButtonText}>{getLanguageLabel(form.language)}</Text>
              </Pressable>

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
              <Text style={styles.profileMeta}>
                {t('settings.shortcutDescription')}
              </Text>
              <Button mode="outlined" onPress={() => router.push('/security')}>
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

      <Modal
        visible={languageMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageMenuVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLanguageMenuVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
            {LANGUAGE_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                style={styles.modalItem}
                onPress={() => {
                  setForm((prev) => ({ ...prev, language: option.locale }));
                  setLanguageMenuVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

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
  container: {
    padding: 20,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  profileMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
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
