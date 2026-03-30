// import 'react-native-url-polyfill/auto';
// import { PaperProvider } from 'react-native-paper';
// import { Stack } from 'expo-router';
// import React, { useEffect } from 'react';
// import { useRouter } from 'expo-router';
// import { supabase } from '../src/services/supabase/supabaseClient';
// import { AuthService } from '../src/services/AuthService';

// const theme = {
//   colors: {
//     primary: '#2563eb',
//     background: '#ffffff',
//     surface: '#ffffff',
//     text: '#111111',
//     onSurface: '#111111',
//     onBackground: '#111111',
//     outline: '#e5e7eb',
//     disabled: '#9ca3af',
//   },
// };

// export default function RootLayout() {
//   const router = useRouter();

//   // Global auth state listener - ONLY ONCE
//   useEffect(() => {
//     let isSubscribed = true;
    
//     // Check for existing session first
//     const initializeAuth = async () => {
//       try {
//         const { data: { session } } = await supabase.auth.getSession();
        
//         if (isSubscribed) {
//           if (session) {
//             // User is authenticated, get profile to determine role
//             const { profile } = await AuthService.getCurrentUser();
            
//             if (profile?.role === 'admin') {
//               router.replace('/(admin-tabs)/dashboard');
//             } else {
//               router.replace('/(tabs)/dashboard');
//             }
//           } else {
//             // User is not authenticated, redirect to login
//             router.replace('/login');
//           }
//         }
//       } catch (error) {
//         console.error('Session initialization error:', error);
//         if (isSubscribed) {
//           router.replace('/login');
//         }
//       }
//     };

//     initializeAuth();

//     // Listen for auth changes
//     const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
//       if (!isSubscribed) return;
      
//       if (session) {
//         // User is authenticated, get profile to determine role
//         const { profile } = await AuthService.getCurrentUser();
        
//         if (profile?.role === 'admin') {
//           router.replace('/(admin-tabs)/dashboard');
//         } else {
//           router.replace('/(tabs)/dashboard');
//         }
//       } else {
//         // User is not authenticated, redirect to login
//         router.replace('/login');
//       }
//     });

//     return () => {
//       isSubscribed = false;
//       subscription.unsubscribe();
//     };
//   }, [router]);

//   return (
//     <PaperProvider theme={theme}>
//       <Stack>
//         <Stack.Screen name="index" options={{ title: 'Employee Management' }} />
//         <Stack.Screen name="login/index" options={{ title: 'Login', headerShown: false }} />
//         <Stack.Screen name="employee/index" options={{ title: 'Employee Dashboard' }} />
//         <Stack.Screen name="documents/upload" options={{ title: 'Upload Document' }} />
//       </Stack>
//     </PaperProvider>
//   );
// }


import 'react-native-url-polyfill/auto';
import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';

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
  const { loading } = useAuth();

  // ✅ ONLY show loader here
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // NO navigation logic here
  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: 'Employee Management' }} />
        <Stack.Screen name="login/index" options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="employee/index" options={{ title: 'Employee Dashboard' }} />
        <Stack.Screen name="documents/upload" options={{ title: 'Upload Document' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="security" options={{ title: 'Security' }} />
        <Stack.Screen name="help" options={{ title: 'Help & Support' }} />
        <Stack.Screen name="terms" options={{ title: 'Terms & Privacy' }} />
        <Stack.Screen name="reports" options={{ title: 'Reports' }} />
    
      </Stack>
    </PaperProvider>
  );
}