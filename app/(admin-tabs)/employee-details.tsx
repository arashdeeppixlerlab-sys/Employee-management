import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // FIX: Add back button icon
import { useRouter, useLocalSearchParams } from 'expo-router';
import { EmployeeService, Employee } from '../../src/services/EmployeeService';
import { DocumentService } from '../../src/services/documentService';
import { supabase } from '../../src/services/supabase/supabaseClient';

export default function EmployeeDetails() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const resolveEmployeeDocUrl = async (doc: any): Promise<string | null> => {
    const bucket = 'documents';
    const fileUrl: string | undefined = doc?.file_url;

    if (!fileUrl || typeof fileUrl !== 'string') return null;

    const isHttp = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');
    if (isHttp) {
      const publicMarker = `/storage/v1/object/public/${bucket}/`;
      const idx = fileUrl.indexOf(publicMarker);
      if (idx !== -1) {
        const objectPath = fileUrl.substring(idx + publicMarker.length);
        if (objectPath) {
          const { data: signedData, error: signedError } =
            await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);
          if (!signedError && signedData?.signedUrl) return signedData.signedUrl;
        }
      }
      return fileUrl;
    }

    const objectPath =
      fileUrl.startsWith(`${bucket}/`) ? fileUrl.slice(bucket.length + 1) : fileUrl;
    const { data: signedData, error: signedError } =
      await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);
    if (!signedError && signedData?.signedUrl) return signedData.signedUrl;
    return null;
  };

  const handleViewEmployeeDocument = async (doc: any) => {
    try {
      const resolvedUrl = await resolveEmployeeDocUrl(doc);
      if (!resolvedUrl) {
        Alert.alert('Error', 'Document URL not available');
        return;
      }
      await Linking.openURL(resolvedUrl);
    } catch (e) {
      console.log('[VIEW_DEBUG][ADMIN-EMPLOYEE] openURL error:', e);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!id) return;
      
      try {
        const employeeData = await EmployeeService.fetchEmployeeById(id);
        setEmployee(employeeData);
        
        // Fetch documents for this employee
        if (employeeData) {
          await fetchEmployeeDocuments(employeeData.id);
        }
      } catch (error) {
        console.error('Failed to fetch employee:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);
console.log("admin employee id:" ,employee?.id);
  const fetchEmployeeDocuments = async (employeeId: string) => {
    setDocumentsLoading(true);
    try {
      const response = await DocumentService.getDocuments(employeeId);
      if (response.success && response.documents) {
        // DocumentService.getDocuments is global now; keep employee-details scoped to this employee.
        setDocuments(response.documents.filter((doc) => doc.employee_id === employeeId));
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading employee details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>Employee Not Found</Text>
          <Text style={styles.subtitle}>The employee details could not be loaded.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* FIX: Add header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Details</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.container}>
          
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>
                {employee.name || 'Not specified'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{employee.email}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Role</Text>
              <Text style={styles.detailValue}>{employee.role}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Employee ID</Text>
              <Text style={styles.detailValue}>{employee.id}</Text>
            </View>
            
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={styles.detailLabel}>Joined</Text>
              <Text style={styles.detailValue}>
                {new Date(employee.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          
          {/* FIX: Add additional profile fields */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bio</Text>
              <Text style={styles.detailValue}>
                {employee.bio || 'Not provided'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Education</Text>
              <Text style={styles.detailValue}>
                {employee.education || 'Not provided'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age</Text>
              <Text style={styles.detailValue}>
                {employee.age || 'Not provided'}
              </Text>
            </View>
            
            <View style={[styles.detailRow, styles.detailRowLast]}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>
                {employee.address || 'Not provided'}
              </Text>
            </View>
          </View>
          
          {/* Documents Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documents</Text>
            {documentsLoading ? (
              <View style={styles.documentsLoadingContainer}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.documentsLoadingText}>Loading documents...</Text>
              </View>
            ) : documents.length > 0 ? (
              <View style={styles.documentsList}>
                {documents.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.documentItem}
                    onPress={() => handleViewEmployeeDocument(doc)}
                  >
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentName}>{doc.file_name}</Text>
                      <Text style={styles.documentDate}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.documentArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyDocuments}>
                <Text style={styles.emptyText}>No documents found</Text>
              </View>
            )}
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
  // FIX: Add header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
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
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#111111',
    flex: 2,
    textAlign: 'right',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 16,
  },
  documentsList: {
    gap: 8,
  },
  documentItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111111',
    marginBottom: 2,
  },
  documentDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  documentArrow: {
    fontSize: 20,
    color: '#9ca3af',
    fontWeight: '300',
  },
  emptyDocuments: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  documentsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  documentsLoadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
