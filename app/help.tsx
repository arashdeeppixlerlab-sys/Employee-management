import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

export default function Help() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.title}>Help & Support</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>How do I add a new employee?</Text>
              <Text style={styles.itemValue}>Navigate to Employees tab and tap the add button</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>How do I upload documents?</Text>
              <Text style={styles.itemValue}>Use the Documents tab to upload and manage files</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>How do I reset my password?</Text>
              <Text style={styles.itemValue}>Go to Security settings to change your password</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Where can I view reports?</Text>
              <Text style={styles.itemValue}>Access reports from the Dashboard quick actions</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Support</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Email Support</Text>
              <Text style={styles.itemValue}>support@employeemanagement.com</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Phone Support</Text>
              <Text style={styles.itemValue}>+1 (555) 123-4567</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Live Chat</Text>
              <Text style={styles.itemValue}>Available Mon-Fri, 9AM-5PM EST</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Response Time</Text>
              <Text style={styles.itemValue}>Within 24 hours for email</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resources</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>User Guide</Text>
              <Text style={styles.itemValue}>Complete documentation for all features</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Video Tutorials</Text>
              <Text style={styles.itemValue}>Step-by-step video guides</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>API Documentation</Text>
              <Text style={styles.itemValue}>Developer resources and integration guides</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Community Forum</Text>
              <Text style={styles.itemValue}>Connect with other users</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Status</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Current Status</Text>
              <Text style={styles.itemValue}>All systems operational</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Uptime</Text>
              <Text style={styles.itemValue}>99.9% this month</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Recent Issues</Text>
              <Text style={styles.itemValue}>No reported issues in last 7 days</Text>
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
