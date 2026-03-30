import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Linking,
  Image,
} from 'react-native';
import { Button, Card, ActivityIndicator, Avatar, FAB, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import type { Document as AppDocument } from '../../src/types/document';
import { useDocuments } from '../../src/hooks/useDocuments';
import AuthGuard from '../../src/components/AuthGuard';
import { supabase } from '../../src/services/supabase/supabaseClient';

type ProfileMini = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export default function AdminDocumentsScreen() {
  const {
    documents,
    loading,
    uploading,
    error,
    clearError,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
  } = useDocuments();

  const [refreshing, setRefreshing] = useState(false);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileMini>>({});

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<AppDocument | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadProfiles = async () => {
      try {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email');

        if (profilesError) {
          console.log('AdminDocuments profiles fetch error:', profilesError);
          return;
        }

        if (!isActive) return;

        const next: Record<string, ProfileMini> = {};
        (data || []).forEach((p) => {
          if (p?.id) next[p.id] = p as ProfileMini;
        });

        setProfilesById(next);
      } catch (e) {
        console.log('AdminDocuments profiles fetch exception:', e);
      }
    };

    loadProfiles();
    return () => {
      isActive = false;
    };
  }, []);

  const formatDate = useCallback((dateString?: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  }, []);

  const getFileIcon = useCallback((fileName?: string | null) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'file-pdf-box';
      case 'doc':
      case 'docx':
        return 'file-word';
      case 'xls':
      case 'xlsx':
        return 'file-excel';
      case 'ppt':
      case 'pptx':
        return 'file-powerpoint';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return 'file-image';
      case 'txt':
        return 'file-document';
      default:
        return 'file';
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchDocuments();
    } finally {
      setRefreshing(false);
    }
  }, [fetchDocuments]);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0] as any;
      const fileName = (asset?.name as string | undefined) || 'Document';

      const resp = await uploadDocument(asset, fileName);
      if (!resp?.success) {
        Alert.alert('Error', resp.error || 'Failed to upload document');
      }
    } catch (e) {
      console.log('AdminDocuments picker/upload error:', e);
      Alert.alert('Error', 'Failed to upload document');
    }
  }, [uploadDocument]);

  const resolveDocumentOpenUrl = useCallback(
    async (doc: AppDocument & Record<string, any>): Promise<string | null> => {
      const bucket = 'documents';
      const fileUrl: string | undefined = doc?.file_url;
      const legacyFilePath: string | undefined =
        doc?.file_path || doc?.filePath || doc?.path;

      console.log('[OPEN_DEBUG][ADMIN] Document clicked:', {
        id: doc?.id,
        file_name: doc?.file_name,
        file_url: fileUrl,
        legacyFilePath,
      });

      if (typeof fileUrl === 'string' && fileUrl.length > 0) {
        const isHttp = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');
        if (isHttp) {
          const publicMarker = `/storage/v1/object/public/${bucket}/`;
          const idx = fileUrl.indexOf(publicMarker);
          if (idx !== -1) {
            const objectPath = fileUrl.substring(idx + publicMarker.length);
            if (objectPath) {
              const { data: signedData, error: signedError } =
                await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);

              if (!signedError && signedData?.signedUrl) {
                console.log('[OPEN_DEBUG][ADMIN] Using signedUrl:', signedData.signedUrl);
                return signedData.signedUrl;
              }

              console.log('[OPEN_DEBUG][ADMIN] Signed URL creation failed, fallback:', {
                message: signedError?.message,
              });
            }
          }

          console.log('[OPEN_DEBUG][ADMIN] Opening direct URL:', fileUrl);
          return fileUrl;
        }

        const objectPath =
          fileUrl.startsWith(`${bucket}/`) ? fileUrl.slice(bucket.length + 1) : fileUrl;
        if (objectPath) {
          const { data: signedData, error: signedError } =
            await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);
          if (!signedError && signedData?.signedUrl) {
            console.log('[OPEN_DEBUG][ADMIN] Using signedUrl from objectPath:', signedData.signedUrl);
            return signedData.signedUrl;
          }
          console.log('[OPEN_DEBUG][ADMIN] Signed URL failed from objectPath:', {
            message: signedError?.message,
          });
        }
      }

      if (typeof legacyFilePath === 'string' && legacyFilePath.length > 0) {
        const { data: signedData, error: signedError } =
          await supabase.storage.from(bucket).createSignedUrl(legacyFilePath, 60 * 60);
        if (!signedError && signedData?.signedUrl) {
          console.log('[OPEN_DEBUG][ADMIN] Using signedUrl from legacyFilePath:', signedData.signedUrl);
          return signedData.signedUrl;
        }
        console.log('[OPEN_DEBUG][ADMIN] Signed URL failed from legacyFilePath:', {
          message: signedError?.message,
        });
      }

      return null;
    },
    [],
  );

  const handleViewDocument = useCallback(
    async (doc: AppDocument) => {
      const resolvedUrl = await resolveDocumentOpenUrl(doc as AppDocument & Record<string, any>);
      if (!resolvedUrl) {
        console.log('[VIEW_DEBUG][ADMIN] No resolvable URL for doc:', doc);
        Alert.alert('Error', 'Document URL not available');
        return;
      }

      const fileName = (doc.file_name || '').toLowerCase();

      if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
        setSelectedDocument({ ...doc, file_url: resolvedUrl });
        setImageModalVisible(true);
        return;
      }

      Linking.openURL(resolvedUrl).catch((e) => {
        console.log('[VIEW_DEBUG][ADMIN] openURL error:', e);
        Alert.alert('Error', 'Failed to open document');
      });
    },
    [resolveDocumentOpenUrl],
  );

  const handleDeleteDocument = useCallback(
    (doc: AppDocument) => {
      Alert.alert(
        'Delete Document',
        `Are you sure you want to delete ${doc.file_name || 'this document'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const result = await deleteDocument(doc.id);
              if (result?.success) {
                await fetchDocuments();
              } else {
                Alert.alert('Error', result?.error || 'Delete failed');
              }
            },
          },
        ],
      );
    },
    [deleteDocument, fetchDocuments],
  );

  const renderDocumentItem = useCallback(
    ({ item }: { item: AppDocument }) => {
      const author = profilesById[item.employee_id]?.name || 'Unknown';

    return (
      <View style={styles.documentCard}>
        <View style={styles.documentHeader}>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            activeOpacity={0.85}
            onPress={() => handleViewDocument(item)}
          >
            <Avatar.Icon
              size={40}
              icon={getFileIcon(item.file_name)}
              style={styles.documentIcon}
            />

            <View style={styles.documentInfo}>
              <Text style={styles.documentName} numberOfLines={1}>
                {item.file_name || 'Untitled'}
              </Text>
              <Text style={styles.documentMeta}>{formatDate(item.created_at)}</Text>
              <Text style={styles.documentAuthor}>Uploaded by {author}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.documentActions}>
            <TouchableOpacity
              style={styles.actionTouchable}
              onPress={() => handleViewDocument(item)}
            >
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionTouchable}
              onPress={() => handleDeleteDocument(item)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
    },
    [formatDate, getFileIcon, handleDeleteDocument, handleViewDocument, profilesById],
  );

  const statsCount = useMemo(() => documents.length, [documents.length]);

  return (
    <AuthGuard requiredRole="admin">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Snackbar
            visible={!!error}
            onDismiss={clearError}
            duration={4000}
            style={styles.snackbar}
          >
            {error}
          </Snackbar>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Documents</Text>
                <Text style={styles.subtitle}>Manage all documents in the system</Text>
              </View>

              <View style={styles.statsContainer}>
                <Card style={styles.statCard}>
                  <View style={styles.statContent}>
                    <Ionicons name="document-text-outline" size={24} color="#2563eb" />
                    <Text style={styles.statNumber}>{statsCount}</Text>
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
            </>
          )}

          <Modal
            visible={imageModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setImageModalVisible(false)}
          >
            <View style={styles.imageModalOverlay}>
              <View style={styles.imageModalContent}>
                <View style={styles.imageModalHeader}>
                  <Text style={styles.imageModalTitle}>
                    {selectedDocument?.file_name || ''}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setImageModalVisible(false)}
                    style={styles.imageCloseButton}
                  >
                    <Ionicons name="close" size={22} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {selectedDocument?.file_url ? (
                  <Image
                    source={{ uri: selectedDocument.file_url }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.imageLoadingContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                  </View>
                )}
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    </AuthGuard>
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
  snackbar: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
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
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTouchable: {
    paddingVertical: 4,
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
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imageModalContent: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2563eb',
  },
  imageModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  imageCloseButton: {
    padding: 6,
  },
  previewImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#f9fafb',
  },
  imageLoadingContainer: {
    padding: 40,
  },
});

