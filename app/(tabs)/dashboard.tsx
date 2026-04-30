import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  Button,
  IconButton,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useDocuments } from '../../src/hooks/useDocuments';
import AuthGuard from '../../src/components/AuthGuard';
import { supabase } from '../../src/services/supabase/supabaseClient';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();
  const { documents, loading, fetchDocuments } = useDocuments();
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentUploadsCount = documents.filter(
    (doc) => new Date(doc.created_at).getTime() >= oneWeekAgo.getTime()
  ).length;

  useFocusEffect(
    React.useCallback(() => {
      fetchDocuments();
      refreshProfile();
    }, [fetchDocuments, refreshProfile])
  );

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('employee-dashboard-documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `employee_id=eq.${profile.id}`
        },
        () => {
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]); // Add profile dependency for proper filtering

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <AuthGuard requiredRole="employee">
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 96 }]}
        >
          <View style={styles.container}>
            {/* Professional Header */}
            <View style={styles.professionalHeader}>
              <View style={styles.headerLeft}>
                {profile?.profile_photo_url ? (
                  <Image source={{ uri: profile.profile_photo_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLabel}>
                      {(profile?.name?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.headerText}>
                  <Text style={styles.greeting}>Good morning!</Text>
                  <Text style={styles.userName}>
                    {profile?.name?.trim() || profile?.email?.split('@')[0] || 'User'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
              <Card style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                    <Ionicons name="document-text-outline" size={24} color="#2563eb" />
                  </View>
                  <Text style={styles.statNumber}>{documents.length}</Text>
                  <Text style={styles.statLabel}>Total Documents</Text>
                </Card.Content>
              </Card>
              
              <Card style={styles.statCard}>
                <Card.Content style={styles.statContent}>
                  <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
                    <Ionicons name="time-outline" size={24} color="#10b981" />
                  </View>
                  <Text style={styles.statNumber}>
                    {recentUploadsCount}
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
                    onPress={() => router.replace('/(tabs)/documents')}
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
                      onPress={() => router.replace('/(tabs)/documents')}
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
                        onPress={() => router.replace('/(tabs)/documents')}
                        size={20}
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
                  <Ionicons name="folder-open-outline" size={48} color="#9ca3af" />
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
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 6,
    marginTop: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: '#2563eb',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 22,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
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
