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

export default function AddUserScreen() {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const handleCreateUser = async () => {
    const email = newEmail.trim().toLowerCase();
    const password = newPassword.trim();
    const name = newName.trim();

    if (!email || !password) {
      Alert.alert('Missing Fields', 'Email and password are required.');
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
      Alert.alert('Create User Failed', result.error || 'Please try again.');
      return;
    }

    setNewEmail('');
    setNewPassword('');
    setNewName('');
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
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              editable={!submitting}
            />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor="#6b7280"
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!submitting}
            />
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#6b7280"
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#ffffff',
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
