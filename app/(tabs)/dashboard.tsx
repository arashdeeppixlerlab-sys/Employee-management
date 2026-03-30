import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import {
  Card,
  Button,
  IconButton,
  Avatar,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useDocuments } from '../../src/hooks/useDocuments';
import AuthGuard from '../../src/components/AuthGuard';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { documents, loading } = useDocuments();

  const recentDocuments = documents.slice(0, 5);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <AuthGuard requiredRole="employee">
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            {/* Professional Header */}
            <View style={styles.professionalHeader}>
              <View style={styles.headerLeft}>
                <Avatar.Text 
                  size={48} 
                  label={profile?.email?.[0]?.toUpperCase() || 'U'}
                  style={styles.avatar}
                  labelStyle={styles.avatarLabel}
                />
                <View style={styles.headerText}>
                  <Text style={styles.greeting}>Good morning!</Text>
                  <Text style={styles.userName}>
                    {profile?.email?.split('@')[0] || 'User'}
                  </Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <IconButton
                  icon="bell-outline"
                  size={22}
                  iconColor="#6b7280"
                  style={styles.headerButton}
                  onPress={() => {}}
                />
                <IconButton
                  icon="cog-outline"
                  size={22}
                  iconColor="#6b7280"
                  style={styles.headerButton}
                  onPress={() => router.push('/(tabs)/profile')}
                />
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
              <Card style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <Text style={styles.statNumber}>{documents.length}</Text>
                  <Text style={styles.statLabel}>Total Documents</Text>
                </Card.Content>
              </Card>
              
              <Card style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <Text style={styles.statNumber}>
                    {recentDocuments.length}
                  </Text>
                  <Text style={styles.statLabel}>Recent Uploads</Text>
                </Card.Content>
              </Card>
            </View>

            {/* Quick Actions */}
            <Card style={styles.actionsCard}>
              <Card.Content>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                  <Button
                    mode="contained"
                    onPress={() => router.push('/documents/upload')}
                    style={styles.actionButton}
                    icon="upload"
                  >
                    Upload Document
                  </Button>
                  
                  <Button
                    mode="outlined"
                    onPress={() => router.push('/(tabs)/documents')}
                    style={styles.actionButton}
                    icon="folder"
                  >
                    View All Documents
                  </Button>
                </View>
              </Card.Content>
            </Card>

            {/* Recent Documents */}
            {recentDocuments.length > 0 && (
              <Card style={styles.recentCard}>
                <Card.Content>
                  <View style={styles.recentHeader}>
                    <Text style={styles.sectionTitle}>Recent Documents</Text>
                    <Button
                      mode="text"
                      onPress={() => router.push('/(tabs)/documents')}
                      compact
                    >
                      View All
                    </Button>
                  </View>
                  
                  {recentDocuments.map((doc) => (
                    <View key={doc.id} style={styles.recentItem}>
                      <View style={styles.recentItemInfo}>
                        <Text style={styles.recentItemName} numberOfLines={1}>
                          {doc.file_name}
                        </Text>
                        <Text style={styles.recentItemDate}>
                          {formatDate(doc.created_at)}
                        </Text>
                      </View>
                      <IconButton
                        icon="chevron-right"
                        size={20}
                        iconColor="#6b7280"
                        onPress={() => router.push('/(tabs)/documents')}
                      />
                    </View>
                  ))}
                </Card.Content>
              </Card>
            )}

            {/* Empty State */}
            {documents.length === 0 && !loading && (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <IconButton
                    icon="folder-open"
                    size={48}
                    iconColor="#9ca3af"
                  />
                  <Text style={styles.emptyTitle}>No documents yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Upload your first document to get started
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => router.push('/documents/upload')}
                    style={styles.emptyButton}
                  >
                    Upload First Document
                  </Button>
                </Card.Content>
              </Card>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    padding: 16,
    gap: 20,
  },
  // FIX: Professional header styles with proper spacing
  professionalHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 8,
    marginTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: '#2563eb',
    marginRight: 16,
  },
  avatarLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    backgroundColor: '#f3f4f6',
    marginHorizontal: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    elevation: 1,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionsCard: {
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 4,
  },
  recentCard: {
    elevation: 1,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  recentItemInfo: {
    flex: 1,
  },
  recentItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111111',
    marginBottom: 2,
  },
  recentItemDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyCard: {
    elevation: 1,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#2563eb',
  },
});
