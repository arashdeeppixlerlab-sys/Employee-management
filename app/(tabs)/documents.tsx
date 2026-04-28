import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  IconButton,
  FAB,
  Snackbar,
} from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDocuments } from '../../src/hooks/useDocuments';
import { useAuth } from '../../src/hooks/useAuth';
import AuthGuard from '../../src/components/AuthGuard';
import DocumentViewerModal from '../../src/components/DocumentViewerModal';
import { resolveDocumentOpenUrl } from '../../src/utils/documentOpenUrl';
import { confirmAction } from '../../src/utils/confirmAction';
import { formatDocumentDate, getDocumentFileIcon } from '../../src/utils/documentDisplay';

export default function DocumentsTabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const isEmployee = profile?.role === 'employee';
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'office'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'pdf' | 'image' | 'other'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [typePickerVisible, setTypePickerVisible] = useState(false);
  const [sortPickerVisible, setSortPickerVisible] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [deletingBatch, setDeletingBatch] = useState(false);
  
  const {
    documents,
    loading,
    error,
    deleteDocument,
    fetchDocuments,
  } = useDocuments();

  const visibleDocuments = useMemo(() => {
    if (!isEmployee) return documents;
    if (activeTab === 'office') {
      return documents.filter((doc: any) => doc.uploaded_by === 'admin');
    }
    return documents.filter((doc: any) => doc.uploaded_by !== 'admin');
  }, [documents, isEmployee, activeTab]);

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const next = visibleDocuments.filter((doc: any) => {
      const fileName = (doc.file_name || '').toLowerCase();
      const matchesSearch = query.length === 0 || fileName.includes(query);
      if (!matchesSearch) return false;

      if (fileTypeFilter === 'all') return true;
      if (fileTypeFilter === 'pdf') return fileName.endsWith('.pdf');
      if (fileTypeFilter === 'image') return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
      return !fileName.endsWith('.pdf') && !/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileName);
    });
    return next.sort((a: any, b: any) => {
      if (sortBy === 'az') {
        return (a.file_name || '').localeCompare(b.file_name || '');
      }
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortBy === 'oldest' ? aTime - bTime : bTime - aTime;
    });
  }, [visibleDocuments, searchQuery, fileTypeFilter, sortBy]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
    }, [fetchDocuments])
  );

  const handleViewDocument = async (document: any) => {
    try {
      const documentUrl = await resolveDocumentOpenUrl(document);

      if (!documentUrl) {
        Alert.alert('Error', 'Document URL not available');
        return;
      }

      setLoadingPreview(true);
      setSelectedDocument({ ...document, file_url: documentUrl });

      setImageModalVisible(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to open document');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleMultiSelect = () => {
    setMultiSelectMode(!multiSelectMode);
    setSelectedIds([]);
  };

  useEffect(() => {
    setSelectedIds([]);
    setMultiSelectMode(false);
  }, [activeTab]);

  const toggleSelection = (id: string) => {
    if (multiSelectMode) {
      setSelectedIds(prev => 
        prev.includes(id) 
          ? prev.filter(selectedId => selectedId !== id)
          : [...prev, id]
      );
    }
  };

  const handleMultiSelectDelete = async () => {
  if (selectedIds.length === 0) return;
  if (deletingBatch) return;

  const confirmDelete = async () => {
    try {
      setDeletingBatch(true);
      await Promise.all(selectedIds.map(id => deleteDocument(id)));

      setSelectedIds([]);
      setMultiSelectMode(false);

      await fetchDocuments(); // 🔥 FORCE REFRESH

    } catch (error) {
      Alert.alert('Error', 'Failed to delete documents');
    } finally {
      setDeletingBatch(false);
    }
  };

  const confirmed = await confirmAction({
    title: 'Delete Documents',
    message: `Delete ${selectedIds.length} documents?`,
    confirmText: 'Delete',
  });
  if (confirmed) {
    await confirmDelete();
  }
};

  const handleDeleteDocument = async (document: any) => {
  if (deletingIds.includes(document.id)) return;
  const confirmDelete = async () => {
    setDeletingIds((prev) => [...prev, document.id]);
    const result = await deleteDocument(document.id);

    if (result.success) {
      await fetchDocuments(); // 🔥 FORCE REFRESH HERE
    } else {
      Alert.alert('Error', result.error || 'Delete failed');
    }
    setDeletingIds((prev) => prev.filter((id) => id !== document.id));
  };

  const confirmed = await confirmAction({
    title: 'Delete Document',
    message: `Are you sure you want to delete ${document.file_name}?`,
    confirmText: 'Delete',
  });
  if (confirmed) {
    await confirmDelete();
  }
};

  const renderDocumentCard = ({ item }: { item: any }) => {
    const canDeleteDocument =
      profile?.role === 'admin' || item.uploaded_by !== 'admin';
    const isDeletingItem = deletingIds.includes(item.id);

    return (
      <Card style={styles.documentCard}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.documentRow}>
            <TouchableOpacity
              style={styles.documentMain}
              activeOpacity={0.8}
              onPress={() =>
                multiSelectMode ? toggleSelection(item.id) : handleViewDocument(item)
              }
            >
              {multiSelectMode && (
                <View style={styles.checkboxContainer}>
                  <IconButton
                    icon={selectedIds.includes(item.id) ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={20}
                    iconColor={selectedIds.includes(item.id) ? "#2563eb" : "#6b7280"}
                    onPress={() => toggleSelection(item.id)}
                  />
                </View>
              )}
              
              <View style={styles.fileIconContainer}>
                <IconButton
                  icon={getDocumentFileIcon(item.file_name)}
                  size={32}
                  iconColor="#2563eb"
                  onPress={() => multiSelectMode ? toggleSelection(item.id) : handleViewDocument(item)}
                />
              </View>
              
              <View style={styles.documentDetails}>
                <Text style={styles.fileName} numberOfLines={2}>
                  {item.file_name}
                </Text>
                <Text style={styles.uploadDate}>
                  Uploaded: {formatDocumentDate(item.created_at)}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.actions}>
              {!multiSelectMode && (
                <Button
                  mode="outlined"
                  onPress={() => handleViewDocument(item)}
                  style={styles.viewButton}
                  compact
                >
                  View
                </Button>
              )}
              
              {canDeleteDocument && (
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor="#ef4444"
                  disabled={isDeletingItem || deletingBatch}
                  onPress={() => multiSelectMode ? handleMultiSelectDelete() : handleDeleteDocument(item)}
                />
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

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
    <AuthGuard>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.container}>
          {/* Professional Documents Header */}
          <View style={styles.professionalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.documentsIconContainer}>
                <Ionicons name="document-text-outline" size={24} color="#2563eb" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>My Documents</Text>
                <Text style={styles.subtitle}>{filteredDocuments.length} documents</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              {multiSelectMode && selectedIds.length > 0 && (
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor="#ef4444"
                  onPress={() => handleMultiSelectDelete()}
                  style={styles.actionButton}
                />
              )}
              {(!isEmployee || activeTab === 'my') && (
                <FAB
                  icon="plus"
                  style={styles.fab}
                  onPress={() => router.push('/documents/upload')}
                />
              )}
            </View>
          </View>

          {isEmployee && (
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'my' && styles.tabButtonActive]}
                onPress={() => setActiveTab('my')}
              >
                <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
                  My Uploads
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'office' && styles.tabButtonActive]}
                onPress={() => setActiveTab('office')}
              >
                <Text style={[styles.tabText, activeTab === 'office' && styles.tabTextActive]}>
                  Office Docs
                </Text>
              </TouchableOpacity>
            </View>
          )}

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

          {loading ? (
            <View style={styles.listContainer}>{skeletonCards}</View>
          ) : (
            <FlatList
              data={filteredDocuments}
              renderItem={renderDocumentCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 120 }]}
              showsVerticalScrollIndicator={false}
              onRefresh={fetchDocuments}
              refreshing={loading}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="document-outline" size={64} color="#d1d5db" />
                  <Text style={styles.emptyTitle}>
                    {searchQuery || fileTypeFilter !== 'all'
                      ? 'No matching documents'
                      : isEmployee && activeTab === 'office'
                        ? 'No office documents yet'
                        : 'No documents yet'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery || fileTypeFilter !== 'all'
                      ? 'Try a different search or clear filters.'
                      : isEmployee && activeTab === 'office'
                        ? 'Ask your admin to upload policy and office documents.'
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
                  {(!isEmployee || activeTab === 'my') && (
                    <Button
                      mode="contained"
                      onPress={() => router.push('/documents/upload')}
                      style={styles.emptyUploadButton}
                    >
                      Upload First Document
                    </Button>
                  )}
                </View>
              }
            />
          )}
        </View>

        <Snackbar
          visible={!!error}
          onDismiss={() => {}}
          duration={4000}
          style={styles.snackbar}
        >
          {error}
        </Snackbar>

        <DocumentViewerModal
          visible={imageModalVisible}
          onClose={() => setImageModalVisible(false)}
          fileName={selectedDocument?.file_name}
          fileUrl={selectedDocument?.file_url}
          loading={loadingPreview}
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
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  professionalHeader: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
    marginTop: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  searchContainer: {
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
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  fab: {
    backgroundColor: '#2563eb',
  },
  checkboxContainer: {
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  emptyUploadButton: {
    backgroundColor: '#2563eb',
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
  listContainer: {
    gap: 12,
  },
  documentCard: {
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
  fileIconContainer: {
    marginRight: 12,
  },
  documentDetails: {
    flex: 1,
    minWidth: 100,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  uploadDate: {
    fontSize: 14,
    color: '#6b7280',
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  viewButton: {
    borderColor: '#2563eb',
    marginRight: 4,
  },
  snackbar: {
    marginBottom: 120,
  },
});
