import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageHeader from '../src/components/PageHeader';

export default function Terms() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          <PageHeader title="Terms & Privacy" />
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms and Conditions</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Acceptance of Terms</Text>
              <Text style={styles.itemValue}>By using this service, you agree to our terms</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Service Description</Text>
              <Text style={styles.itemValue}>Employee management and document storage platform</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>User Responsibilities</Text>
              <Text style={styles.itemValue}>Maintain accurate employee and document information</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Prohibited Uses</Text>
              <Text style={styles.itemValue}>No unauthorized data access or system misuse</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Service Availability</Text>
              <Text style={styles.itemValue}>99.9% uptime guarantee with maintenance windows</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy Policy</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Data Collection</Text>
              <Text style={styles.itemValue}>Only necessary business and employee data</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Data Usage</Text>
              <Text style={styles.itemValue}>Used solely for service provision and improvement</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Data Security</Text>
              <Text style={styles.itemValue}>Enterprise-grade encryption and security measures</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Data Retention</Text>
              <Text style={styles.itemValue}>Data retained as long as account remains active</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Third-Party Sharing</Text>
              <Text style={styles.itemValue}>No data sold or shared with third parties</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Terms</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Account Creation</Text>
              <Text style={styles.itemValue}>Valid business email required for registration</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Account Security</Text>
              <Text style={styles.itemValue}>Users responsible for maintaining account security</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Account Termination</Text>
              <Text style={styles.itemValue}>30-day notice for service cancellation</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Refund Policy</Text>
              <Text style={styles.itemValue}>Pro-rated refunds for annual plans</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal Information</Text>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Governing Law</Text>
              <Text style={styles.itemValue}>Terms governed by applicable state laws</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Dispute Resolution</Text>
              <Text style={styles.itemValue}>Arbitration required for legal disputes</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Contact Information</Text>
              <Text style={styles.itemValue}>legal@employeemanagement.com</Text>
            </View>
            <View style={styles.item}>
              <Text style={styles.itemLabel}>Last Updated</Text>
              <Text style={styles.itemValue}>January 1, 2024</Text>
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
