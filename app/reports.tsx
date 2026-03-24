import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

export default function Reports() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.title}>Reports</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Reports</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Employee Overview</Text>
              <Text style={styles.itemValue}>Total employees, new hires, departures</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Document Activity</Text>
              <Text style={styles.itemValue}>Uploads, downloads, storage usage</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>System Performance</Text>
              <Text style={styles.itemValue}>Uptime, response times, errors</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Financial Summary</Text>
              <Text style={styles.itemValue}>Costs, subscriptions, usage metrics</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>User Activity</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Login Statistics</Text>
              <Text style={styles.itemValue}>Daily, weekly, monthly login patterns</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Feature Usage</Text>
              <Text style={styles.itemValue}>Most used features and navigation paths</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Document Access</Text>
              <Text style={styles.itemValue}>Views, downloads, sharing activity</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Time Tracking</Text>
              <Text style={styles.itemValue}>Active usage time per user</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compliance Reports</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Data Privacy</Text>
              <Text style={styles.itemValue}>GDPR compliance and data handling</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Security Audit</Text>
              <Text style={styles.itemValue}>Access logs and security events</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Backup Status</Text>
              <Text style={styles.itemValue}>Backup completion and verification</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Retention Policy</Text>
              <Text style={styles.itemValue}>Data retention and deletion compliance</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Reports</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Department Analytics</Text>
              <Text style={styles.itemValue}>Performance by department</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Productivity Metrics</Text>
              <Text style={styles.itemValue}>Efficiency and output measurements</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Cost Analysis</Text>
              <Text style={styles.itemValue}>Per-employee and operational costs</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Trend Analysis</Text>
              <Text style={styles.itemValue}>Historical data and projections</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Export Options</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>PDF Reports</Text>
              <Text style={styles.itemValue}>Formatted reports for printing</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Excel Spreadsheets</Text>
              <Text style={styles.itemValue}>Raw data for analysis</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>CSV Export</Text>
              <Text style={styles.itemValue}>Comma-separated values</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>API Access</Text>
              <Text style={styles.itemValue}>Programmatic report generation</Text>
            </View>
          </View>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
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
});
