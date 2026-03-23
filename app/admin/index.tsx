import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Button, Card } from 'react-native-paper';
import AuthGuard from '../../src/components/AuthGuard';
import { useAuth } from '../../src/hooks/useAuth';

export default function AdminDashboard() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <AuthGuard requiredRole="admin">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Admin Portal</Text>
          </View>
          
          <View style={styles.cardContainer}>
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text style={styles.cardTitle}>Employee List</Text>
                <Text style={styles.cardDescription}>Manage all employee records and information</Text>
                <Button 
                  mode="contained" 
                  style={styles.button}
                  onPress={() => console.log('Employee List pressed')}
                >
                  View Employees
                </Button>
              </Card.Content>
            </Card>
            
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text style={styles.cardTitle}>All Documents</Text>
                <Text style={styles.cardDescription}>Access and manage company documents</Text>
                <Button 
                  mode="contained" 
                  style={styles.button}
                  onPress={() => console.log('Documents pressed')}
                >
                  Manage Documents
                </Button>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <Text style={styles.cardTitle}>Logout</Text>
                <Text style={styles.cardDescription}>Sign out of your account</Text>
                <Button 
                  mode="outlined" 
                  style={[styles.button, styles.logoutButton]}
                  onPress={handleLogout}
                >
                  Logout
                </Button>
              </Card.Content>
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuthGuard>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#111111',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 24,
  },
  cardContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    elevation: 1,
    backgroundColor: '#ffffff',
  },
  cardContent: {
    padding: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111111',
    lineHeight: 24,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 16,
    color: '#6b7280',
    lineHeight: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 4,
  },
  logoutButton: {
    borderColor: '#ef4444',
  },
});
