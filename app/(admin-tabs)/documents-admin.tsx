import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ActivityIndicator, Avatar, FAB, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import type { Document as AppDocument } from '../../src/types/document';
import { useDocuments } from '../../src/hooks/useDocuments';
import { useAuth } from '../../src/hooks/useAuth';
import AuthGuard from '../../src/components/AuthGuard';
import { supabase } from '../../src/services/supabase/supabaseClient';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import DocumentViewerModal from '../../src/components/DocumentViewerModal';

type ProfileMini = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export default function AdminDocumentsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const {
    documents,
    loading,
    error,
    fetchAdminDocuments,
    deleteDocument,
  } = useDocuments();

  const [refreshing, setRefreshing] = useState(false);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileMini>>({});

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<AppDocument | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<AppDocument | null>(null);

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

  // Listen for document changes and refresh document list
  // useEffect(() => {
  //   console.log('[ADMIN DOCUMENTS] Setting up real-time listener');
  //   let channel: any = null;

  //   const setupSubscription = () => {
  //     try {
  //       channel = supabase
  //         .channel('admin-documents-updates', {
  //           config: {
  //             broadcast: { self: true },
  //             presence: { key: profile?.id },
  //           },
  //         })
  //         .on(
  //           'postgres_changes',
  //           {
  //             event: '*',
  //             schema: 'public',
  //             table: 'documents',
  //             filter: 'uploaded_by=eq.admin'
  //           },
  //           (payload) => {
  //             console.log('[ADMIN DOCUMENTS] Document change detected:', payload.eventType, payload);
  //             fetchAdminDocuments();
  //           }
  //         )
  //         .subscribe((status, err) => {
  //           console.log('[ADMIN DOCUMENTS] Real-time subscription status:', status);
  //           if (err) {
  //             console.error('[ADMIN DOCUMENTS] Real-time subscription error:', err);
  //           }
  //           if (status === 'TIMED_OUT' || status === 'CLOSED') {
  //             console.log('[ADMIN DOCUMENTS] Connection lost, attempting to reconnect...');
  //             setTimeout(() => {
  //               if (channel) {
  //                 setupSubscription();
  //               }
  //             }, 3000);
  //           }
  //         });
  //     } catch (error) {
  //       console.error('[ADMIN DOCUMENTS] Failed to setup real-time subscription:', error);
  //     }
  //   };

  //   setupSubscription();

  //   return () => {
  //     console.log('[ADMIN DOCUMENTS] Cleaning up real-time listener');
  //     if (channel) {
  //       supabase.removeChannel(channel).catch(console.error);
  //     }
  //   };
  // }, [profile?.id, fetchAdminDocuments]);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('admin-documents') // simpler name
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: 'uploaded_by=eq.admin',
        },
        (payload) => {
          console.log('[ADMIN] change:', payload.eventType);
          fetchAdminDocuments();
        }
      )
      .subscribe((status) => {
        console.log('[ADMIN] status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]); // 🚨 REMOVE fetchDashboardData

  // Fetch admin documents on initial load
  useEffect(() => {
    if (profile?.id) {
      fetchAdminDocuments();
    }
  }, [profile?.id, fetchAdminDocuments]);

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        fetchAdminDocuments();
      }
    }, [profile?.id, fetchAdminDocuments])
  );

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
      await fetchAdminDocuments();
    } finally {
      setRefreshing(false);
    }
  }, [fetchAdminDocuments]);

  const goToUpload = useCallback(() => {
    router.push('/documents/upload');
  }, [router]);

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

      setSelectedDocument({ ...doc, file_url: resolvedUrl });
      setImageModalVisible(true);
    },
    [resolveDocumentOpenUrl],
  );

  const handleDeleteDocument = useCallback(
    (doc: AppDocument) => {
      setDocumentToDelete(doc);
      setDeleteConfirmVisible(true);
    },
    [],
  );

  const confirmDelete = useCallback(async () => {
    if (!documentToDelete) return;
    
    const result = await deleteDocument(documentToDelete.id);
    if (!result?.success) {
      Alert.alert('Error', result?.error || 'Delete failed');
    }
    setDeleteConfirmVisible(false);
    setDocumentToDelete(null);
  }, [documentToDelete, deleteDocument]);

  const cancelDelete = useCallback(() => {
    setDeleteConfirmVisible(false);
    setDocumentToDelete(null);
  }, []);

  const renderDocumentItem = useCallback(
    ({ item }: { item: AppDocument }) => {
      const author = item.uploaded_by === 'admin' ? 'Admin' : (profilesById[item.employee_id]?.name || 'Unknown');

      return (
        <Card style={styles.documentCard}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.documentRow}>
              <TouchableOpacity
                style={styles.documentMain}
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
          </Card.Content>
        </Card>
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
            onDismiss={() => { }}
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
              <View style={styles.professionalHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.documentsIconContainer}>
                    <Ionicons name="document-text-outline" size={24} color="#2563eb" />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.title}>Documents</Text>
                    <Text style={styles.subtitle}>{documents.length} documents</Text>
                  </View>
                </View>
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
                      onPress={goToUpload}
                      style={styles.uploadButton}
                    >
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
                  onPress={goToUpload}
                />
              )}
            </>
          )}

          <DocumentViewerModal
            visible={imageModalVisible}
            onClose={() => setImageModalVisible(false)}
            fileName={selectedDocument?.file_name}
            fileUrl={selectedDocument?.file_url}
          />

          <Modal
            visible={deleteConfirmVisible}
            transparent
            animationType="fade"
            onRequestClose={cancelDelete}
          >
            <View style={styles.confirmModalOverlay}>
              <View style={styles.confirmModalContent}>
                <View style={styles.confirmModalHeader}>
                  <Text style={styles.confirmModalTitle}>Delete Document</Text>
                  <TouchableOpacity
                    onPress={cancelDelete}
                    style={styles.confirmCloseButton}
                  >
                    <Ionicons name="close" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.confirmModalBody}>
                  <View style={styles.warningIconContainer}>
                    <View style={styles.warningIconCircle}>
                      <Ionicons name="warning-outline" size={32} color="#f59e0b" />
                    </View>
                  </View>
                  
                  <Text style={styles.confirmModalSubtitle}>Are you sure?</Text>
                  
                  <Text style={styles.confirmModalMessage}>
                    This action cannot be undone. The document{' '}
                    <Text style={styles.documentNameHighlight}>
                      "{documentToDelete?.file_name || 'this document'}"
                    </Text>{' '}
                    will be permanently deleted.
                  </Text>
                </View>

                <View style={styles.confirmModalActions}>
                  <TouchableOpacity
                    style={styles.cancelButtonEnhanced}
                    onPress={cancelDelete}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButtonEnhanced}
                    onPress={confirmDelete}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ffffff" style={styles.deleteButtonIcon} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
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
  professionalHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  documentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  documentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentIcon: {
    backgroundColor: '#f3f4f6',
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 100,
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
    gap: 4,
    marginLeft: 8,
  },
  actionTouchable: {
    paddingVertical: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  confirmModalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#2563eb',
    position: 'relative',
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  confirmCloseButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
    borderRadius: 12,
  },
  confirmModalBody: {
    padding: 28,
    paddingTop: 24,
    alignItems: 'center',
  },
  warningIconContainer: {
    marginBottom: 20,
  },
  warningIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  confirmModalSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmModalMessage: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  documentNameHighlight: {
    fontWeight: '600',
    color: '#374151',
  },
  confirmModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 12,
  },
  cancelButtonEnhanced: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  deleteButtonEnhanced: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButtonIcon: {
    marginRight: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});

