import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Card,
  Button,
  ActivityIndicator,
  Avatar,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase/supabaseClient';
import AuthGuard from '../../src/components/AuthGuard';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalEmployees: number;
  totalDocuments: number;
  recentUploads: number;
  activeUsers: number;
}

interface RecentActivity {
  id: string;
  type: 'document' | 'employee' | 'user';
  title: string;
  subtitle: string;
  time: string;
  icon: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalDocuments: 0,
    recentUploads: 0,
    activeUsers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch employee count
      const { count: empCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee');

      // Fetch document count
      const { count: docCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });

      // Fetch recent uploads (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Fetch recent activity
      const { data: recentDocs } = await supabase
        .from('documents')
        .select('name, created_at, employee_id')
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: recentEmployees } = await supabase
        .from('profiles')
        .select('name, email, created_at')
        .eq('role', 'employee')
        .order('created_at', { ascending: false })
        .limit(2);

      const activity: RecentActivity[] = [];

      // Add recent document uploads
      recentDocs?.forEach((doc, index) => {
        activity.push({
          id: `doc-${index}`,
          type: 'document',
          title: 'New document uploaded',
          subtitle: doc.name,
          time: formatTime(doc.created_at),
          icon: 'document-text-outline',
        });
      });

      // Add recent employee registrations
      recentEmployees?.forEach((emp, index) => {
        activity.push({
          id: `emp-${index}`,
          type: 'employee',
          title: 'New employee registered',
          subtitle: emp.name || emp.email,
          time: formatTime(emp.created_at),
          icon: 'person-add-outline',
        });
      });

      setStats({
        totalEmployees: empCount || 0,
        totalDocuments: docCount || 0,
        recentUploads: recentCount || 0,
        activeUsers: empCount || 0, // Simplified for now
      });

      setRecentActivity(activity.slice(0, 5));
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const quickActions = [
    {
      title: 'Add Employee',
      subtitle: 'Register new employee',
      icon: 'person-add-outline',
      color: '#2563eb',
      onPress: () => router.push('/(admin-tabs)/employees'),
    },
    {
      title: 'Upload Document',
      subtitle: 'Add new document',
      icon: 'cloud-upload-outline',
      color: '#10b981',
      onPress: () => router.push('/(admin-tabs)/admin-documents'),
    },
    {
      title: 'View Reports',
      subtitle: 'Analytics and insights',
      icon: 'bar-chart-outline',
      color: '#f59e0b',
      onPress: () => router.push('/reports'),
    },
    {
      title: 'System Settings',
      subtitle: 'Configure system',
      icon: 'settings-outline',
      color: '#8b5cf6',
      onPress: () => router.push('/settings'),
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AuthGuard requiredRole="admin">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <Text style={styles.welcomeTitle}>Welcome back, Admin</Text>
          <Text style={styles.welcomeSubtitle}>
            Here's what's happening with your system today
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="people-outline" size={24} color="#2563eb" />
              </View>
              <Text style={styles.statNumber}>{stats.totalEmployees}</Text>
              <Text style={styles.statLabel}>Total Employees</Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
                <Ionicons name="document-text-outline" size={24} color="#10b981" />
              </View>
              <Text style={styles.statNumber}>{stats.totalDocuments}</Text>
              <Text style={styles.statLabel}>Documents</Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="time-outline" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statNumber}>{stats.recentUploads}</Text>
              <Text style={styles.statLabel}>Recent Uploads</Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: '#ede9fe' }]}>
                <Ionicons name="pulse-outline" size={24} color="#8b5cf6" />
              </View>
              <Text style={styles.statNumber}>{stats.activeUsers}</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Card style={styles.activityCard}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <View key={activity.id} style={[
                  styles.activityItem,
                  index === recentActivity.length - 1 ? styles.activityItemLast : null
                ]}>
                  <View style={styles.activityIcon}>
                    <Ionicons 
                      name={activity.icon as any} 
                      size={20} 
                      color="#6b7280" 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
                  </View>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyActivityText}>No recent activity</Text>
              </View>
            )}
          </Card>
        </View>

        {/* System Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <Card style={styles.overviewCard}>
            <View style={styles.overviewItem}>
              <View style={styles.overviewLeft}>
                <Text style={styles.overviewTitle}>Storage Used</Text>
                <Text style={styles.overviewSubtitle}>Document storage utilization</Text>
              </View>
              <Text style={styles.overviewValue}>-- MB</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.overviewItem}>
              <View style={styles.overviewLeft}>
                <Text style={styles.overviewTitle}>System Health</Text>
                <Text style={styles.overviewSubtitle}>All systems operational</Text>
              </View>
              <View style={styles.healthStatus}>
                <View style={styles.healthDot} />
                <Text style={styles.healthText}>Healthy</Text>
              </View>
            </View>
          </Card>
        </View>

          <View style={styles.footer} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  welcomeHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statContent: {
    padding: 20,
    alignItems: 'center',
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
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111111',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyActivity: {
    padding: 40,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  overviewLeft: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111111',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 20,
  },
  healthStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  healthText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10b981',
  },
  footer: {
    height: 32,
  },
});
