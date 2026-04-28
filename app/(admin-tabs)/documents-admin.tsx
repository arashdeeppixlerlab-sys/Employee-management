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
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Avatar, FAB, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import type { Document as AppDocument } from '../../src/types/document';
import { useDocuments } from '../../src/hooks/useDocuments';
import { useAuth } from '../../src/hooks/useAuth';
import AuthGuard from '../../src/components/AuthGuard';
import { supabase } from '../../src/services/supabase/supabaseClient';
import { useFocusEffect } from 'expo-router';
import { useRouter } from 'expo-router';
import DocumentViewerModal from '../../src/components/DocumentViewerModal';
import { resolveDocumentOpenUrl } from '../../src/utils/documentOpenUrl';
import { formatDocumentDate, getDocumentFileIcon } from '../../src/utils/documentDisplay';
import { AdminUserManagementService } from '../../src/services/AdminUserManagementService';

type ProfileMini = {
  id: string;
  name?: string | null;
  email?: string | null;
};

export default function AdminDocumentsScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'pdf' | 'image' | 'other'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [sortPickerVisible, setSortPickerVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleting, setConfirmDeleting] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadProfiles = async () => {
      try {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email');

        if (profilesError) {
          return;
        }

        if (!isActive) return;

        const next: Record<string, ProfileMini> = {};
        (data || []).forEach((p) => {
          if (p?.id) next[p.id] = p as ProfileMini;
        });

        setProfilesById(next);
      } catch (e) {
        return;
      }
    };

    loadProfiles();
    return () => {
      isActive = false;
    };
  }, []);


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
          fetchAdminDocuments();
        }
      )
      .subscribe();

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

  useEffect(() => {
    let isMounted = true;
    const fetchStorage = async () => {
      const dashboardStats = await AdminUserManagementService.getDashboardStats();
      if (isMounted && dashboardStats.success) {
        setStorageUsedBytes(dashboardStats.storageBytes);
      }
    };
    fetchStorage();
    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        fetchAdminDocuments();
      }
    }, [profile?.id, fetchAdminDocuments])
  );

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

  const handleViewDocument = useCallback(
    async (doc: AppDocument) => {
      const resolvedUrl = await resolveDocumentOpenUrl(doc as AppDocument & Record<string, any>);
      if (!resolvedUrl) {
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
    if (confirmDeleting) return;
    setConfirmDeleting(true);
    setDeletingId(documentToDelete.id);
    try {
      const result = await deleteDocument(documentToDelete.id);
      if (!result?.success) {
        Alert.alert('Error', result?.error || 'Delete failed');
      }
      setDeleteConfirmVisible(false);
      setDocumentToDelete(null);
    } finally {
      setConfirmDeleting(false);
      setDeletingId(null);
    }
  }, [documentToDelete, deleteDocument, confirmDeleting]);

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
                  icon={getDocumentFileIcon(item.file_name)}
                  style={styles.documentIcon}
                />
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {item.file_name || 'Untitled'}
                  </Text>
                  <Text style={styles.documentMeta}>{formatDocumentDate(item.created_at)}</Text>
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
                  disabled={deletingId === item.id}
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
    [handleDeleteDocument, handleViewDocument, profilesById, deletingId],
  );

  const statsCount = useMemo(() => documents.length, [documents.length]);
  const formatStorageSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };
  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const next = documents.filter((doc) => {
      const fileName = (doc.file_name || '').toLowerCase();
      const matchesSearch = query.length === 0 || fileName.includes(query);
      if (!matchesSearch) return false;
      if (fileTypeFilter === 'all') return true;
      if (fileTypeFilter === 'pdf') return fileName.endsWith('.pdf');
      if (fileTypeFilter === 'image') return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
      return !fileName.endsWith('.pdf') && !/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
    });
    return next.sort((a, b) => {
      if (sortBy === 'az') {
        return (a.file_name || '').localeCompare(b.file_name || '');
      }
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortBy === 'oldest' ? aTime - bTime : bTime - aTime;
    });
  }, [documents, searchQuery, fileTypeFilter, sortBy]);

  const skeletonCards = Array.from({ length: 4 }, (_, index) => (
    <Card key={`skeleton-${index}`} style={styles.documentCard}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonTextWrap}>
            <View style={styles.skeletonLineLg} />
            <View style={styles.skeletonLineSm} />
          </View>
        </View>
      </Card.Content>
    </Card>
  ));

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
            <View style={[styles.listContainer, { paddingBottom: insets.bottom + 120 }]}>
              {skeletonCards}
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
                    <Text style={styles.subtitle}>{filteredDocuments.length} documents</Text>
                  </View>
                </View>
              </View>

              <View style={styles.searchContainer}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search documents..."
                  placeholderTextColor="#9ca3af"
                  style={styles.searchInput}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity style={styles.searchClearButton} onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.controlsRow}>
                <TouchableOpacity style={styles.controlButton} onPress={() => setTypePickerVisible(true)}>
                  <Text style={styles.controlLabel}>Type: {fileTypeFilter === 'all' ? 'All' : fileTypeFilter === 'image' ? 'Images' : fileTypeFilter.toUpperCase()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={() => setSortPickerVisible(true)}>
                  <Text style={styles.controlLabel}>Sort: {sortBy === 'az' ? 'A-Z' : sortBy === 'newest' ? 'Newest' : 'Oldest'}</Text>
                </TouchableOpacity>
                {(fileTypeFilter !== 'all' || sortBy !== 'newest') && (
                  <TouchableOpacity
                    style={styles.controlClearButton}
                    onPress={() => {
                      setFileTypeFilter('all');
                      setSortBy('newest');
                    }}
                  >
                    <Text style={styles.controlClearText}>Clear</Text>
                  </TouchableOpacity>
                )}
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
                    <Text style={styles.statNumber}>{formatStorageSize(storageUsedBytes)}</Text>
                    <Text style={styles.statLabel}>Storage Used</Text>
                  </View>
                </Card>
              </View>

              <FlatList
                data={filteredDocuments}
                renderItem={renderDocumentItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 120 }]}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-outline" size={64} color="#d1d5db" />
                    <Text style={styles.emptyTitle}>
                      {searchQuery || fileTypeFilter !== 'all' ? 'No matching documents' : 'No documents yet'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      {searchQuery || fileTypeFilter !== 'all'
                        ? 'Try a different search or clear filters.'
                        : 'Upload your first document to get started.'}
                    </Text>
                    <Text style={styles.refreshHint}>Pull down to refresh.</Text>
                    {(searchQuery || fileTypeFilter !== 'all') && (
                      <Button
                        mode="outlined"
                        onPress={() => {
                          setSearchQuery('');
                          setFileTypeFilter('all');
                        }}
                        style={styles.clearFilterButton}
                      >
                        Clear Filters
                      </Button>
                    )}
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

              {filteredDocuments.length > 0 && (
                <FAB
                  icon="plus"
                  style={[styles.fab, { bottom: insets.bottom + 16 }]}
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

          <Modal visible={typePickerVisible} transparent animationType="fade" onRequestClose={() => setTypePickerVisible(false)}>
            <Pressable style={styles.modalBackdrop} onPress={() => setTypePickerVisible(false)}>
              <View style={styles.modalCard}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'pdf', label: 'PDF' },
                  { key: 'image', label: 'Images' },
                  { key: 'other', label: 'Other' },
                ].map((filter) => (
                  <Pressable
                    key={filter.key}
                    style={styles.modalItem}
                    onPress={() => {
                      setFileTypeFilter(filter.key as 'all' | 'pdf' | 'image' | 'other');
                      setTypePickerVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{filter.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Modal>

          <Modal visible={sortPickerVisible} transparent animationType="fade" onRequestClose={() => setSortPickerVisible(false)}>
            <Pressable style={styles.modalBackdrop} onPress={() => setSortPickerVisible(false)}>
              <View style={styles.modalCard}>
                {[
                  { key: 'newest', label: 'Newest' },
                  { key: 'oldest', label: 'Oldest' },
                  { key: 'az', label: 'A-Z' },
                ].map((sort) => (
                  <Pressable
                    key={sort.key}
                    style={styles.modalItem}
                    onPress={() => {
                      setSortBy(sort.key as 'newest' | 'oldest' | 'az');
                      setSortPickerVisible(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{sort.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Modal>

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
                    disabled={confirmDeleting}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ffffff" style={styles.deleteButtonIcon} />
                    <Text style={styles.deleteButtonText}>{confirmDeleting ? 'Deleting...' : 'Delete'}</Text>
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
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#111111',
    fontSize: 14,
  },
  searchClearButton: {
    position: 'absolute',
    right: 12,
    top: 11,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  controlLabel: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  controlClearButton: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  controlClearText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
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
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },
  skeletonTextWrap: {
    flex: 1,
    gap: 8,
  },
  skeletonLineLg: {
    height: 12,
    width: '70%',
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
  skeletonLineSm: {
    height: 10,
    width: '45%',
    borderRadius: 5,
    backgroundColor: '#f3f4f6',
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
  clearFilterButton: {
    marginBottom: 12,
  },
  refreshHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalItemText: {
    fontSize: 15,
    color: '#111111',
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

