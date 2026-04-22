import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthService } from '../src/services/AuthService';
import { useI18n } from '../src/i18n';

export default function Security() {
  const { t } = useI18n();
  const router = useRouter();
  const canGoBack = router.canGoBack();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(currentPassword && newPassword && confirmPassword && !saving);
  }, [currentPassword, newPassword, confirmPassword, saving]);

  const clearForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    const current = currentPassword.trim();
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!current || !next || !confirm) {
      Alert.alert(t('common.validation'), t('security.fillAll'));
      return;
    }
    if (next.length < 8) {
      Alert.alert(t('common.validation'), t('security.minLength'));
      return;
    }
    if (next !== confirm) {
      Alert.alert(t('common.validation'), t('security.passwordMismatch'));
      return;
    }
    if (current === next) {
      Alert.alert(t('common.validation'), t('security.passwordDifferent'));
      return;
    }

    setSaving(true);
    try {
      const result = await AuthService.changePassword(current, next);
      if (!result.success) {
        Alert.alert(t('common.error'), result.error || t('security.changeFailed'));
        return;
      }
      clearForm();
      Alert.alert(t('common.success'), t('security.changedSuccess'));
    } finally {
      setSaving(false);
    }
  };

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
            <Text style={styles.headerTitle}>{t('security.title')}</Text>
            <View style={styles.backSpacer} />
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>{t('security.section.changePassword')}</Text>
              <TextInput
                label={t('security.currentPassword')}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                mode="outlined"
                secureTextEntry={!showCurrentPassword}
                right={
                  <TextInput.Icon
                    icon={showCurrentPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowCurrentPassword((prev) => !prev)}
                    forceTextInputFocus={false}
                  />
                }
                style={styles.input}
              />
              <TextInput
                label={t('security.newPassword')}
                value={newPassword}
                onChangeText={setNewPassword}
                mode="outlined"
                secureTextEntry={!showNewPassword}
                right={
                  <TextInput.Icon
                    icon={showNewPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowNewPassword((prev) => !prev)}
                    forceTextInputFocus={false}
                  />
                }
                style={styles.input}
              />
              <TextInput
                label={t('security.confirmNewPassword')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    forceTextInputFocus={false}
                  />
                }
                style={styles.input}
              />
              <Text style={styles.requirementText}>
                {t('security.requirement')}
              </Text>
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
    marginBottom: 6,
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
