import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

export default function Security() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.title}>Security</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Password</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Change Password</Text>
              <Text style={styles.itemValue}>Update your password regularly</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Password Requirements</Text>
              <Text style={styles.itemValue}>Min 8 characters, 1 uppercase, 1 number</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Last Password Change</Text>
              <Text style={styles.itemValue}>30 days ago</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Two-Factor Authentication</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>2FA Status</Text>
              <Text style={styles.itemValue}>Not Enabled</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Authentication Method</Text>
              <Text style={styles.itemValue}>SMS or Authenticator App</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Backup Codes</Text>
              <Text style={styles.itemValue}>Generate backup recovery codes</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Management</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Active Sessions</Text>
              <Text style={styles.itemValue}>2 devices logged in</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Session Timeout</Text>
              <Text style={styles.itemValue}>30 minutes of inactivity</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Remember Me</Text>
              <Text style={styles.itemValue}>Keep logged in for 7 days</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Login Activity</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Last Login</Text>
              <Text style={styles.itemValue}>Today at 9:30 AM</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Failed Login Attempts</Text>
              <Text style={styles.itemValue}>0 in last 30 days</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Unusual Activity</Text>
              <Text style={styles.itemValue}>No suspicious activity detected</Text>
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
