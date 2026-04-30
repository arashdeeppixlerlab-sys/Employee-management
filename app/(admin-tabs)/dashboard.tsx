import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Image,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Card,
  ActivityIndicator,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, G } from 'react-native-svg';
import { supabase } from '../../src/services/supabase/supabaseClient';
import AuthGuard from '../../src/components/AuthGuard';
import { useAuth } from '../../src/hooks/useAuth';
import { AdminUserManagementService } from '../../src/services/AdminUserManagementService';

// Status Distribution Data Type
interface StatusData {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

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
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isCompactStatusLayout = width < 430;
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalDocuments: 0,
    recentUploads: 0,
    activeUsers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [selectedStatusLabel, setSelectedStatusLabel] = useState<string | null>(null);
  const donutSize = 140;
  const donutStrokeWidth = 24;
  const donutRadius = (donutSize - donutStrokeWidth) / 2;
  const donutCircumference = 2 * Math.PI * donutRadius;

  const formatStorageSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch employee count
      const { count: empCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'employee');

      // Fetch total document count
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

      const dashboardStats = await AdminUserManagementService.getDashboardStats();

      // Fetch recent activity
      const { data: recentDocs } = await supabase
        .from('documents')
        .select('file_name, created_at, employee_id')
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
          subtitle: doc.file_name,
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
        activeUsers: dashboardStats.success ? dashboardStats.activeUsers7d : 0,
      });

      setStorageUsedBytes(dashboardStats.success ? dashboardStats.storageBytes : 0);

      setRecentActivity(activity.slice(0, 5));

      // FIX: Calculate Status Distribution for documents
      const { data: allDocs } = await supabase
        .from('documents')
        .select('created_at')
        .order('created_at', { ascending: false });

      const now2 = new Date();
      const thirtyDaysAgo2 = new Date(now2.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo2 = new Date(now2.getTime() - 7 * 24 * 60 * 60 * 1000);

      const newDocsCount = allDocs?.filter(d => new Date(d.created_at) >= sevenDaysAgo2).length || 0;
      const recentDocsCount = allDocs?.filter(d => {
        const date = new Date(d.created_at);
        return date >= thirtyDaysAgo2 && date < sevenDaysAgo2;
      }).length || 0;
      const oldDocsCount = allDocs?.filter(d => new Date(d.created_at) < thirtyDaysAgo2).length || 0;

      const totalDocs = newDocsCount + recentDocsCount + oldDocsCount || 1; // avoid division by zero

      setStatusData([
        { label: 'New', value: newDocsCount, color: '#f97316', percentage: Math.round((newDocsCount / totalDocs) * 100) },
        { label: 'Recent', value: recentDocsCount, color: '#3b82f6', percentage: Math.round((recentDocsCount / totalDocs) * 100) },
        { label: 'Older', value: oldDocsCount, color: '#10b981', percentage: Math.round((oldDocsCount / totalDocs) * 100) },
      ]);
      setSelectedStatusLabel(null);

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refreshProfile();
    }, [refreshProfile])
  );


  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('admin-documents') // simpler name
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]); // 🚨 REMOVE fetchDashboardData

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
      title: 'Add User',
      subtitle: 'Create employee account',
      icon: 'person-add-outline',
      color: '#2563eb',
      onPress: () => router.push('/(admin-tabs)/add-user'),
    },
    {
      title: 'Upload Document',
      subtitle: 'Add new document',
      icon: 'cloud-upload-outline',
      color: '#10b981',
      onPress: () => router.push('/documents/upload'),
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
  const totalStatusValue = statusData.reduce((acc, item) => acc + item.value, 0);
  const selectedStatus =
    statusData.find((item) => item.label === selectedStatusLabel) ?? null;
  let runningValue = 0;
  const donutSegments = statusData
    .filter((item) => item.value > 0)
    .map((item) => {
      const segmentLength = (item.value / totalStatusValue) * donutCircumference;
      const dashOffset = -((runningValue / totalStatusValue) * donutCircumference);
      runningValue += item.value;

      return {
        ...item,
        segmentLength,
        dashOffset,
      };
    });

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
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 124 }}
        >
          {/* Professional Admin Header */}
          <View style={styles.professionalHeader}>
            <View style={styles.headerLeft}>
              {profile?.profile_photo_url ? (
                <Image source={{ uri: profile.profile_photo_url }} style={styles.adminAvatarImage} />
              ) : (
                <View style={styles.adminIconContainer}>
                  <Text style={styles.adminAvatarLabel}>
                    {(profile?.name?.[0] || profile?.email?.[0] || 'A').toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.headerText}>
                <Text style={styles.adminBadge}>Administrator</Text>
                <Text style={styles.welcomeTitle}>
                  Welcome back, {profile?.name?.trim() || 'Admin'}
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  Manage your system efficiently
                </Text>
              </View>
            </View>
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

          {/* Status Distribution - FIX: Added proper padding and button */}
          <View style={[styles.section, styles.statusDistributionSection]}>
            <View style={styles.statusDistributionHeader}>
              <View style={styles.statusDistributionTitleContainer}>
                <Text style={styles.sectionTitle}>Status Distribution</Text>
                <Text style={styles.statusDistributionSubtitle}>Breakdown of document status</Text>
              </View>
            </View>
            <Card style={styles.statusDistributionCard}>
              <View
                style={[
                  styles.statusDistributionContent,
                  isCompactStatusLayout && styles.statusDistributionContentCompact,
                ]}
              >
                {/* Donut Chart */}
                <View style={styles.donutChartContainer}>
                  <View style={styles.donutChart}>
                    {totalStatusValue > 0 ? (
                      <>
                        <Svg width={donutSize} height={donutSize} style={styles.donutSvg}>
                          <G rotation="-90" origin={`${donutSize / 2}, ${donutSize / 2}`}>
                            {donutSegments.map((segment) => (
                              <Circle
                                key={segment.label}
                                cx={donutSize / 2}
                                cy={donutSize / 2}
                                r={donutRadius}
                                fill="transparent"
                                stroke={segment.color}
                                strokeWidth={donutStrokeWidth}
                                strokeLinecap="butt"
                                strokeDasharray={`${segment.segmentLength} ${donutCircumference - segment.segmentLength}`}
                                strokeDashoffset={segment.dashOffset}
                                onPress={() =>
                                  setSelectedStatusLabel((prev) =>
                                    prev === segment.label ? null : segment.label
                                  )
                                }
                                onPressIn={() => setSelectedStatusLabel(segment.label)}
                                opacity={
                                  selectedStatusLabel && selectedStatusLabel !== segment.label ? 0.35 : 1
                                }
                              />
                            ))}
                          </G>
                        </Svg>
                        <View style={styles.donutCenter}>
                          <Text
                            style={[
                              styles.donutTotal,
                              selectedStatus ? { color: selectedStatus.color } : null,
                            ]}
                          >
                            {selectedStatus ? selectedStatus.value : totalStatusValue}
                          </Text>
                          <Text style={styles.donutLabel}>
                            {selectedStatus
                              ? `${selectedStatus.label} (${selectedStatus.percentage}%)`
                              : 'Total'}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.donutCenter}>
                        <Text style={styles.donutTotal}>0</Text>
                        <Text style={styles.donutLabel}>Total</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Status Legend */}
                <View
                  style={[
                    styles.statusLegend,
                    isCompactStatusLayout && styles.statusLegendCompact,
                  ]}
                >
                  {statusData.length > 0 ? (
                    statusData.map((status, index) => (
                      <Pressable
                        key={index}
                        style={[
                          styles.legendItem,
                          selectedStatusLabel === status.label && styles.legendItemActive,
                        ]}
                        onPress={() =>
                          setSelectedStatusLabel((prev) =>
                            prev === status.label ? null : status.label
                          )
                        }
                        onHoverIn={() => setSelectedStatusLabel(status.label)}
                        onHoverOut={() => setSelectedStatusLabel(null)}
                      >
                        <View style={styles.legendLeft}>
                          <View style={[styles.legendDot, { backgroundColor: status.color }]} />
                          <Text style={styles.legendLabel} numberOfLines={1}>
                            {status.label}
                          </Text>
                        </View>
                        <Text style={styles.legendValue} numberOfLines={1}>
                          {status.value} ({status.percentage}%)
                        </Text>
                      </Pressable>
                    ))
                  ) : (
                    <View style={styles.emptyLegend}>
                      <Text style={styles.emptyLegendText}>No documents available</Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>
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
                <Text style={styles.overviewValue}>{formatStorageSize(storageUsedBytes)}</Text>
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
  // FIX: Professional admin header styles with proper spacing
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
    marginBottom: 14,
    marginTop: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  adminAvatarLabel: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  adminBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 28,
  },
  statCard: {
    width: (width - 72) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    padding: 16,
  },
  statContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
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
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  // FIX: Status Distribution Section with proper padding - Increased spacing
  statusDistributionSection: {
    marginTop: 8,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  statusDistributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  statusDistributionTitleContainer: {
    flex: 1,
  },
  statusDistributionSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  statusDistributionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    padding: 28,
    marginHorizontal: 0,
  },
  statusDistributionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 0,
    gap: 32,
  },
  statusDistributionContentCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 20,
  },
  // Donut Chart Styles - Enhanced padding
  donutChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  donutChart: {
    width: 140,
    height: 140,
    borderRadius: 70,
    position: 'relative',
    backgroundColor: '#f3f4f6',
  },
  donutSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  donutCenter: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    bottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  donutTotal: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },
  donutLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  // Legend Styles - Fixed layout with proper spacing
  statusLegend: {
    flex: 1,
    marginLeft: 8,
    gap: 12,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  statusLegendCompact: {
    marginLeft: 0,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fafaf9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  legendItemActive: {
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4b5563',
    flexShrink: 1,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
    marginLeft: 8,
  },
  emptyLegend: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyLegendText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 0,
  },
  actionCard: {
    width: (width - 72) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 4,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    padding: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    padding: 8,
  },
  overviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
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
});
