import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AuthGuard from '../../src/components/AuthGuard';
import { AdminUserManagementService } from '../../src/services/AdminUserManagementService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export default function AddUserScreen() {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    name?: string;
  }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const validateForm = (email: string, password: string, name: string) => {
    const errors: { email?: string; password?: string; name?: string } = {};

    if (!email) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email)) {
      errors.email = 'Enter a valid email address (example@company.com).';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (name && name.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    return errors;
  };

  const handleCreateUser = async () => {
    const email = newEmail.trim().toLowerCase();
    const password = newPassword;
    const name = newName.trim();

    const validationErrors = validateForm(email, password, name);
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      Alert.alert('Please fix the highlighted fields', 'Required details are missing or invalid.');
      return;
    }

    setSubmitting(true);
    const result = await AdminUserManagementService.createUser({
      email,
      password,
      name,
      role: 'employee',
    });
    setSubmitting(false);

    if (!result.success) {
      const errorMessage = result.error || 'Please try again.';
      const normalized = errorMessage.toLowerCase();
      const isDuplicateEmailError =
        normalized.includes('already') ||
        normalized.includes('exists') ||
        normalized.includes('duplicate') ||
        normalized.includes('registered');

      if (isDuplicateEmailError) {
        setFieldErrors((prev) => ({
          ...prev,
          email: 'This email is already registered. Please use a different email.',
        }));
        Alert.alert('Email Already Exists', 'This email is already registered. Please use a different email.');
        return;
      }

      Alert.alert('Create User Failed', errorMessage);
      return;
    }

    setNewEmail('');
    setNewPassword('');
    setNewName('');
    setFieldErrors({});
    Alert.alert('Success', 'Employee account created.');
    router.replace('/(admin-tabs)/employees');
  };

  return (
    <AuthGuard requiredRole="admin">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add User</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.container}>
          <View style={styles.createCard}>
            <Text style={styles.createTitle}>Create Employee Account</Text>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              placeholder="Name (optional)"
              placeholderTextColor="#6b7280"
              style={[styles.input, fieldErrors.name && styles.inputError]}
              value={newName}
              onChangeText={(text) => {
                setNewName(text);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              editable={!submitting}
            />
            {fieldErrors.name ? <Text style={styles.errorText}>{fieldErrors.name}</Text> : null}
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#6b7280"
              style={[styles.input, fieldErrors.email && styles.inputError]}
              value={newEmail}
              onChangeText={(text) => {
                setNewEmail(text);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!submitting}
            />
            {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.passwordContainer, fieldErrors.password && styles.inputError]}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#6b7280"
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                secureTextEntry={!showPassword}
                editable={!submitting}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword((prev) => !prev)}
                disabled={submitting}
              >
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {fieldErrors.password ? <Text style={styles.errorText}>{fieldErrors.password}</Text> : null}
            <TouchableOpacity style={styles.createButton} onPress={handleCreateUser} disabled={submitting}>
              <Text style={styles.createButtonText}>{submitting ? 'Creating...' : 'Create User'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    padding: 24,
  },
  createCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    backgroundColor: '#ffffff',
  },
  createTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111111',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111111',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: -4,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111111',
  },
  passwordToggle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  createButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
