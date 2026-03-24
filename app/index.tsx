// import React, { useEffect } from 'react';
// import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
// import { Button, Card } from 'react-native-paper';
// import { useRouter } from 'expo-router';
// import { useAuth } from '../src/hooks/useAuth';

// export default function HomeScreen() {
//   const router = useRouter();
//   const { isAuthenticated, loading, profile } = useAuth();

//   useEffect(() => {
//     if (!loading && isAuthenticated && profile) {
//       // Simple redirect based on role
//       if (profile.role === 'admin') {
//         router.replace('/(tabs)/dashboard');
//       } else if (profile.role === 'employee') {
//         router.replace('/(tabs)/dashboard');
//       }
//     }
//   }, [isAuthenticated, loading, profile, router]);

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.safeArea}>
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#2563eb" />
//           <Text style={styles.loadingText}>Loading...</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   // Don't render login screen if already authenticated
//   if (isAuthenticated && profile) {
//     return (
//       <SafeAreaView style={styles.safeArea}>
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="large" color="#2563eb" />
//           <Text style={styles.loadingText}>Redirecting...</Text>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <View style={styles.container}>
//         <Card style={styles.card}>
//           <Card.Content style={styles.cardContent}>
//             <Text style={styles.title}>Employee Management</Text>
//             <Text style={styles.subtitle}>
//               Welcome to the Employee Management System
//             </Text>

//             <View style={styles.buttonContainer}>
//               <Button
//                 mode="contained"
//                 style={styles.button}
//                 onPress={() => router.push('/login')}
//               >
//                 Login
//               </Button>
//             </View>
//           </Card.Content>
//         </Card>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: '#ffffff',
//   },
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     paddingHorizontal: 24,
//   },
//   card: {
//     padding: 16,
//   },
//   cardContent: {
//     gap: 16,
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: '700',
//     textAlign: 'center',
//     color: '#111',
//   },
//   subtitle: {
//     textAlign: 'center',
//     color: '#666',
//   },
//   buttonContainer: {
//     marginTop: 16,
//   },
//   button: {
//     paddingVertical: 6,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 12,
//   },
// });

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';

export default function Index() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
    } else if (profile?.role === 'admin') {
      router.replace('/(admin-tabs)/dashboard');
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, profile, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}