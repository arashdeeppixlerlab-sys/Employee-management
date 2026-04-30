import 'react-native-url-polyfill/auto';
import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { I18nProvider, useI18n } from '../src/i18n';

const theme = {
  colors: {
    primary: '#2563eb',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#111111',
    onSurface: '#111111',
    onBackground: '#111111',
    outline: '#e5e7eb',
    disabled: '#9ca3af',
  },
};

export default function RootLayout() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </I18nProvider>
  );
}

function AppShell() {
  const { t } = useI18n();
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: t('app.title') }} />
        <Stack.Screen name="login/index" options={{ title: t('app.login'), headerShown: false }} />
        <Stack.Screen name="employee/index" options={{ title: t('app.employeeDashboard') }} />
        <Stack.Screen name="documents/upload" options={{ title: t('app.uploadDocument') }} />
        <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
        <Stack.Screen name="security" options={{ title: t('security.title') }} />
        <Stack.Screen name="help" options={{ title: t('app.helpSupport') }} />
        <Stack.Screen name="terms" options={{ title: t('app.termsPrivacy') }} />
        <Stack.Screen name="reports" options={{ title: t('app.reports') }} />
    
      </Stack>
    </PaperProvider>
  );
}