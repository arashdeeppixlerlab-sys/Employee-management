import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';

export default function Settings() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <Text style={styles.title}>Settings</Text>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Email Preferences</Text>
              <Text style={styles.itemValue}>Manage email notifications</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Profile Information</Text>
              <Text style={styles.itemValue}>Update your profile details</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Password</Text>
              <Text style={styles.itemValue}>Change your password</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Push Notifications</Text>
              <Text style={styles.itemValue}>Enabled</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Email Notifications</Text>
              <Text style={styles.itemValue}>Enabled</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Document Updates</Text>
              <Text style={styles.itemValue}>Real-time updates</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Language</Text>
              <Text style={styles.itemValue}>English</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Time Zone</Text>
              <Text style={styles.itemValue}>UTC+05:30</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Data Usage</Text>
              <Text style={styles.itemValue}>Monitor storage usage</Text>
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
