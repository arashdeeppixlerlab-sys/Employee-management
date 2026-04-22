import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AuthGuard from '../../src/components/AuthGuard';
import { AdminUserManagementService } from '../../src/services/AdminUserManagementService';

export default function AddUserScreen() {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
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
            <TextInput
              placeholder="Name (optional)"
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              editable={!submitting}
            />
            <TextInput
              placeholder="Email"
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!submitting}
            />
            <TextInput
              placeholder="Password"
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!submitting}
            />
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
