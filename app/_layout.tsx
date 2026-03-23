import 'react-native-url-polyfill/auto';
import { PaperProvider } from 'react-native-paper';
import { Stack } from 'expo-router';
import React from 'react';

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
    <PaperProvider theme={theme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Employee Management' }} />
        <Stack.Screen name="login/index" options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="employee/index" options={{ title: 'Employee Dashboard' }} />
        <Stack.Screen name="admin/index" options={{ title: 'Admin Dashboard' }} />
        <Stack.Screen name="documents/upload" options={{ title: 'Upload Document' }} />
      </Stack>
    </PaperProvider>
  );
}
