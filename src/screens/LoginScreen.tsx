import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Button,
  TextInput,
  Snackbar,
} from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  
  const router = useRouter();
  const { login, loading, error, clearError } = useAuth();

  const showLoginError = (message: string) => {
    setLocalError(message);
    if (Platform.OS === 'web') {
      globalThis.alert?.(message);
      return;
    }
    Alert.alert('Login Failed', message);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showLoginError('Email and password are required.');
      return;
    }

    setLocalError('');
    const result = await login({
      email: email.trim(),
      password: password.trim(),
    });

    if (result.success && result.profile) {
      clearError();
      
      // Role-based redirect
      if (result.profile.role === 'admin') {
        router.replace('/(admin-tabs)/dashboard');
      } else {
        router.replace('/(tabs)/dashboard');
      }
      return;
    }

    if (!result.success) {
      const message = result.error || 'Incorrect email or password.';
      showLoginError(message);
    }
  };

  const dismissError = () => {
    setLocalError('');
    clearError();
  };

  const displayedError = localError || error;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.container}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

            <View style={styles.formContainer}>
              <TextInput
                label="Email"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (localError) setLocalError('');
                }}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                editable={!loading}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (localError) setLocalError('');
                }}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
                editable={!loading}
              />

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading || !email.trim() || !password.trim()}
                style={styles.loginButton}
                contentStyle={styles.loginButtonContent}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
              {displayedError ? (
                <View style={styles.inlineErrorContainer}>
                  <Text style={styles.inlineErrorText}>{displayedError}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS !== 'web' ? (
        <Snackbar
          visible={!!displayedError}
          onDismiss={dismissError}
          duration={4000}
          style={styles.snackbar}
        >
          {displayedError}
        </Snackbar>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#111111',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6b7280',
    lineHeight: 24,
  },
  formContainer: {
    gap: 16,
  },
  input: {
    backgroundColor: '#ffffff',
  },
  loginButton: {
    marginTop: 8,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  snackbar: {
    marginBottom: 16,
  },
  inlineErrorText: {
    color: '#dc2626',
    fontSize: 13,
    lineHeight: 18,
  },
  inlineErrorContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
