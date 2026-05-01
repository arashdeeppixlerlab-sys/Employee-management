import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, TextInput } from 'react-native-paper';
import { AuthService } from '../src/services/AuthService';
import { useAuth } from '../src/hooks/useAuth';
import { useI18n } from '../src/i18n';
import PageHeader from '../src/components/PageHeader';

export default function Security() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const passwordSubmitLockRef = useRef(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const canSubmit = useMemo(() => {
    return Boolean(currentPassword && newPassword && confirmPassword && !saving);
  }, [currentPassword, newPassword, confirmPassword, saving]);

  const clearForm = () => {
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

  const handleChangePassword = async () => {
    if (saving || passwordSubmitLockRef.current) return;
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
    setSaving(true);
    try {
      const result = await AuthService.changePassword(current, next, user?.email);
      if (!result.success) {
        setPasswordErrors((prev) => ({
          ...prev,
          currentPassword: result.error || t('security.changeFailed'),
        }));
        return;
      }
      clearForm();
      setPasswordSuccess(t('security.changedSuccess'));
      Alert.alert(t('common.success'), t('security.changedSuccess'));
    } catch {
      setPasswordErrors((prev) => ({
        ...prev,
        currentPassword: t('security.changeFailed'),
      }));
    } finally {
      passwordSubmitLockRef.current = false;
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <PageHeader title={t('security.title')} />

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>{t('security.section.changePassword')}</Text>
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
              <Text style={styles.requirementText}>
                {t('security.requirement')}
              </Text>
              {passwordSuccess ? <Text style={styles.successText}>{passwordSuccess}</Text> : null}
              <View style={styles.actions}>
                <Button mode="outlined" onPress={clearForm} disabled={saving}>
                  {t('common.reset')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleChangePassword}
                  loading={saving}
                  disabled={!canSubmit}
                >
                  {t('security.changePassword')}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 120,
  },
  container: {
    padding: 20,
    gap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 16,
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
  actions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
