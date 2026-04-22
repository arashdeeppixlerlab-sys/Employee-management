import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../src/services/supabase/supabaseClient';

export default function Reports() {
  const router = useRouter();
  const canGoBack = router.canGoBack();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalDocuments: 0,
    uploads7d: 0,
    uploads30d: 0,
  });
  const [recentDocs, setRecentDocs] = useState<Array<{ id: string; file_name: string; created_at: string }>>([]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = Date.now();
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        employeesRes,
        documentsRes,
        uploads7dRes,
        uploads30dRes,
        recentDocsRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'employee')
          .is('deleted_at', null),
        supabase.from('documents').select('*', { count: 'exact', head: true }),
        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo),
        supabase
          .from('documents')
          .select('id, file_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const firstError =
        employeesRes.error ||
        documentsRes.error ||
        uploads7dRes.error ||
        uploads30dRes.error ||
        recentDocsRes.error;

      if (firstError) {
        throw firstError;
      }

      setStats({
        totalEmployees: employeesRes.count || 0,
        totalDocuments: documentsRes.count || 0,
        uploads7d: uploads7dRes.count || 0,
        uploads30d: uploads30dRes.count || 0,
      });
      setRecentDocs(recentDocsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const uploadsTrend = useMemo(() => {
    if (stats.uploads30d === 0) return 'No uploads in last 30 days';
    const olderPart = Math.max(stats.uploads30d - stats.uploads7d, 0);
    if (olderPart === 0 && stats.uploads7d > 0) return 'All 30-day uploads happened this week';
    return `${stats.uploads7d} this week vs ${olderPart} in prior 23 days`;
  }, [stats.uploads7d, stats.uploads30d]);

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            {canGoBack ? (
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={20} color="#374151" />
              </TouchableOpacity>
            ) : (
              <View style={styles.backSpacer} />
            )}
            <Text style={styles.headerTitle}>Reports</Text>
            <View style={styles.backSpacer} />
          </View>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading reports...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Unable to load reports</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadReports}>
                <Text style={styles.retryLabel}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <View style={styles.item}>
                  <Text style={styles.itemLabel}>Total Employees</Text>
                  <Text style={styles.itemValue}>{stats.totalEmployees}</Text>
                </View>
                <View style={styles.item}>
                  <Text style={styles.itemLabel}>Total Documents</Text>
                  <Text style={styles.itemValue}>{stats.totalDocuments}</Text>
                </View>
                <View style={styles.item}>
                  <Text style={styles.itemLabel}>Uploads (Last 7 Days)</Text>
                  <Text style={styles.itemValue}>{stats.uploads7d}</Text>
                </View>
                <View style={styles.item}>
                  <Text style={styles.itemLabel}>Uploads (Last 30 Days)</Text>
                  <Text style={styles.itemValue}>{stats.uploads30d}</Text>
                </View>
                <View style={[styles.item, styles.itemNoBorder]}>
                  <Text style={styles.itemLabel}>Trend</Text>
                  <Text style={styles.itemValue}>{uploadsTrend}</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Document Activity</Text>
                {recentDocs.length > 0 ? (
                  recentDocs.map((doc) => (
                    <View style={styles.item} key={doc.id}>
                      <Text style={styles.itemLabel} numberOfLines={1}>
                        {doc.file_name}
                      </Text>
                      <Text style={styles.itemValue}>{formatDateTime(doc.created_at)}</Text>
                    </View>
                  ))
                ) : (
                  <View style={[styles.item, styles.itemNoBorder]}>
                    <Text style={styles.itemValue}>No recent activity</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  container: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSpacer: {
    width: 34,
    height: 34,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
  },
  section: {
    marginBottom: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 16,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemNoBorder: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111111',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    borderRadius: 12,
    padding: 14,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#b91c1c',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: '#991b1b',
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryLabel: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
});
