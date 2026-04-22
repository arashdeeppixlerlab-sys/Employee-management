import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Button,
  Card,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DocumentService } from '../../src/services/documentService';
import { supabase } from '../../src/services/supabase/supabaseClient';
import AuthGuard from '../../src/components/AuthGuard';
import { notifyDocumentsChanged } from '../../src/utils/documentsSync';

export default function DocumentUploadScreen() {
  const router = useRouter();
  const canGoBack = router.canGoBack();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileName, setFileName] = useState<string>('');
  const [userRole, setUserRole] = useState<'admin' | 'employee'>('employee');

  const pickDocument = async () => {
    try {
      setError(null);
      setSuccess(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        // User cancelled picker
        return;
      }

      const asset = result.assets[0];
      setSelectedFile(asset);
      setFileName(asset.name || 'Document');

    } catch (err) {
      console.error('Document picker error:', err);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !fileName.trim()) {
      Alert.alert('Error', 'Please select a file and enter a name.');
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('User not authenticated');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const resolvedRole = profileData?.role === 'admin' ? 'admin' : 'employee';
      setUserRole(resolvedRole);

      const response = await DocumentService.uploadDocument(
        selectedFile,
        user.id,
        resolvedRole
      );

      if (response.success) {
        if (resolvedRole === 'admin') {
          notifyDocumentsChanged({ scope: 'admin' });
        } else {
          notifyDocumentsChanged({
            scope: 'employee',
            employeeId: user.id,
          });
        }

        setSuccess('Document uploaded successfully!');
        setSelectedFile(null);
        setFileName('');

        const nextRoute =
          resolvedRole === 'admin'
            ? '/(admin-tabs)/documents-admin'
            : '/(tabs)/documents';

        setTimeout(() => {
          router.replace(nextRoute);
        }, 500);
      } else {
        setError(response.error || 'Upload failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const dismissError = () => {
    setError(null);
  };

  const dismissSuccess = () => {
    setSuccess(null);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <AuthGuard>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <View style={styles.headerRow}>
              {canGoBack ? (
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
                  <Ionicons name="chevron-back" size={20} color="#374151" />
                </TouchableOpacity>
              ) : (
                <View style={styles.backSpacer} />
              )}
              <Text style={styles.headerTitle}>Upload Document</Text>
              <View style={styles.backSpacer} />
            </View>
            <Text style={styles.subtitle}>
              Select a file to upload to your {userRole === 'admin' ? 'organization' : 'personal'} document library
            </Text>

            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.fileInfo}>
                  {selectedFile ? (
                    <View style={styles.selectedFile}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {selectedFile.name}
                      </Text>
                      <Text style={styles.fileDetails}>
                        {formatFileSize(selectedFile.size || 0)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noFileText}>No file selected</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Document Name</Text>
                  <Text style={styles.fileName}>{fileName}</Text>
                </View>

                <View style={styles.buttonContainer}>
                  <Button
                    mode="outlined"
                    onPress={pickDocument}
                    disabled={uploading}
                    style={styles.pickButton}
                  >
                    {uploading ? 'Uploading...' : 'Select File'}
                  </Button>

                  <Button
                    mode="contained"
                    onPress={handleUpload}
                    disabled={!selectedFile || !fileName.trim() || uploading}
                    loading={uploading}
                    style={styles.uploadButton}
                  >
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </View>

                {uploading && (
                  <View style={styles.progressContainer}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.progressText}>Uploading document...</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>
        </ScrollView>

        <Snackbar
          visible={!!error}
          onDismiss={dismissError}
          duration={4000}
          style={styles.snackbar}
        >
          {error}
        </Snackbar>

        <Snackbar
          visible={!!success}
          onDismiss={dismissSuccess}
          duration={2000}
          style={styles.successSnackbar}
        >
          {success}
        </Snackbar>
      </SafeAreaView>
    </AuthGuard>
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
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6b7280',
    lineHeight: 24,
  },
  card: {
    elevation: 1,
    backgroundColor: '#ffffff',
  },
  cardContent: {
    padding: 24,
    gap: 16,
  },
  fileInfo: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedFile: {
    alignItems: 'center',
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
    textAlign: 'center',
  },
  fileDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  noFileText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    color: '#111111',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  pickButton: {
    borderColor: '#2563eb',
  },
  uploadButton: {
    backgroundColor: '#2563eb',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
  },
  snackbar: {
    marginBottom: 16,
  },
  successSnackbar: {
    marginBottom: 80,
    backgroundColor: '#10b981',
  },
});
