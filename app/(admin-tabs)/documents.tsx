import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Button,
  Card,
  ActivityIndicator,
  Avatar,
  Divider,
  FAB,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase/supabaseClient';

interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  user_id: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export default function AdminDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      // Fetch documents
      const { data: docs, error: docError } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (docError) {
        console.error('Documents fetch error:', docError);
        return;
      }

      // Fetch user profiles
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, name, email');

      if (userError) {
        console.error('Profiles fetch error:', userError);
        return;
      }

      // Map documents with user names
      const documentsWithUsers = docs.map(doc => ({
        ...doc,
        profiles: users.find(u => u.id === doc.user_id)
      }));

      setDocuments(documentsWithUsers || []);
    } catch (error) {
      console.error('Documents fetch exception:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      await uploadDocument(asset);
    } catch (err) {
      console.error('Document picker error:', err);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadDocument = async (asset: any) => {
    try {
      setUploading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload file to storage
      const fileName = `${Date.now()}_${asset.name}`;
      const filePath = `documents/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, asset, {
          contentType: asset.mimeType || 'application/octet-stream',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          name: asset.name,
          file_type: asset.mimeType || 'application/octet-stream',
          file_size: asset.size || 0,
          file_path: filePath,
          user_id: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      Alert.alert('Success', 'Document uploaded successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'document-text-outline';
    if (fileType.includes('image')) return 'image-outline';
    if (fileType.includes('word') || fileType.includes('document')) return 'document-text-outline';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'grid-outline';
    return 'document-outline';
  };

  const renderDocumentItem = ({ item }: { item: Document }) => (
    <TouchableOpacity style={styles.documentCard}>
      <View style={styles.documentHeader}>
        <Avatar.Icon 
          size={40} 
          icon={getFileIcon(item.file_type)}
          style={styles.documentIcon}
        />
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.documentMeta}>
            {formatFileSize(item.file_size)} • {formatDate(item.created_at)}
          </Text>
          <Text style={styles.documentAuthor}>
            Uploaded by {item.profiles?.name || 'Unknown'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>Manage all documents in the system</Text>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="document-text-outline" size={24} color="#2563eb" />
              <Text style={styles.statNumber}>{documents.length}</Text>
              <Text style={styles.statLabel}>Total Documents</Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Ionicons name="cloud-upload-outline" size={24} color="#10b981" />
              <Text style={styles.statNumber}>--</Text>
              <Text style={styles.statLabel}>Storage Used</Text>
            </View>
          </Card>
        </View>

        <FlatList
          data={documents}
          renderItem={renderDocumentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptySubtitle}>
                Upload your first document to get started
              </Text>
              <Button
                mode="contained"
                onPress={pickDocument}
                loading={uploading}
                disabled={uploading}
                style={styles.uploadButton}
              >
                <Ionicons name="add" size={20} style={{ marginRight: 8 }} />
                Upload Document
              </Button>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />

        {documents.length > 0 && (
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={pickDocument}
            loading={uploading}
            disabled={uploading}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statContent: {
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  documentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentIcon: {
    backgroundColor: '#f3f4f6',
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  documentMeta: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  documentAuthor: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  uploadButton: {
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2563eb',
  },
});
