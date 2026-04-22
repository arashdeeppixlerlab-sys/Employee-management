import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { supabase } from '../../src/services/supabase/supabaseClient';
import DocumentViewerModal from '../../src/components/DocumentViewerModal';

export default function DocumentsTabScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const isEmployee = profile?.role === 'employee';
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'office'>('my');
  
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

  // Fetch documents on component mount
  useEffect(() => {
    console.log('[MOUNT_DEBUG] Component mounted, fetching documents');
    fetchDocuments();
  }, [fetchDocuments]);

  useFocusEffect(
    useCallback(() => {
      fetchDocuments();
    }, [fetchDocuments])
  );

  const resolveDocumentOpenUrl = useCallback(
    async (document: any): Promise<string | null> => {
      const bucket = 'documents';
      const fileUrl: string | undefined = document?.file_url;
      const legacyFilePath: string | undefined =
        document?.file_path || document?.filePath || document?.path;

      console.log('[OPEN_DEBUG] Document clicked:', {
        id: document?.id,
        file_name: document?.file_name,
        file_url: fileUrl,
        legacyFilePath,
      });

      // 1) If we already have an http(s) URL, prefer it (but still try signed URL if it's Supabase public).
      if (typeof fileUrl === 'string' && fileUrl.length > 0) {
        const isHttp = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');
        if (isHttp) {
          // Try to convert public URL -> object path -> signed URL (works for both public/private).
          const publicMarker = `/storage/v1/object/public/${bucket}/`;
          const idx = fileUrl.indexOf(publicMarker);
          if (idx !== -1) {
            const objectPath = fileUrl.substring(idx + publicMarker.length);
            if (objectPath) {
              const { data: signedData, error: signedError } =
                await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);

              if (!signedError && signedData?.signedUrl) {
                console.log('[OPEN_DEBUG] Using signedUrl from public URL:', signedData.signedUrl);
                return signedData.signedUrl;
              }

              console.log('[OPEN_DEBUG] Signed URL creation failed, fallback:', {
                message: signedError?.message,
              });
            }
          }

          console.log('[OPEN_DEBUG] Opening direct URL:', fileUrl);
          return fileUrl;
        }

        // 2) If file_url isn't http(s), it might actually be an object path.
        const objectPath =
          fileUrl.startsWith(`${bucket}/`) ? fileUrl.slice(bucket.length + 1) : fileUrl;
        if (objectPath) {
          const { data: signedData, error: signedError } =
            await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);
          if (!signedError && signedData?.signedUrl) {
            console.log('[OPEN_DEBUG] Using signedUrl from objectPath:', signedData.signedUrl);
            return signedData.signedUrl;
          }
          console.log('[OPEN_DEBUG] Signed URL failed from objectPath, fallback to file_url:', {
            message: signedError?.message,
          });
        }
      }

      // 3) Legacy fallback: if DB stored file_path for older uploads.
      if (typeof legacyFilePath === 'string' && legacyFilePath.length > 0) {
        const { data: signedData, error: signedError } =
          await supabase.storage.from(bucket).createSignedUrl(legacyFilePath, 60 * 60);
        if (!signedError && signedData?.signedUrl) {
          console.log('[OPEN_DEBUG] Using signedUrl from legacyFilePath:', signedData.signedUrl);
          return signedData.signedUrl;
        }
        console.log('[OPEN_DEBUG] Signed URL failed from legacyFilePath:', {
          message: signedError?.message,
        });
      }

      return null;
    },
    [],
  );

  const handleViewDocument = async (document: any) => {
    try {
      console.log('[VIEW_DEBUG] Viewing document:', document.file_name);

      const documentUrl = await resolveDocumentOpenUrl(document);

      if (!documentUrl) {
        console.log('[VIEW_DEBUG] No documentUrl resolved for:', document);
        Alert.alert('Error', 'Document URL not available');
        return;
      }

      setLoadingPreview(true);
      setSelectedDocument({ ...document, file_url: documentUrl });

      const fileName = (document.file_name || document.name || '').toLowerCase();
      
      setImageModalVisible(true);
    } catch (err) {
      console.log('[VIEW_DEBUG] View error:', err);
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

  const handleMultiSelectDelete = () => {
  if (selectedIds.length === 0) return;

  const confirmDelete = async () => {
    try {
      console.log('[MULTI_DELETE_DEBUG] Deleting:', selectedIds);

      await Promise.all(selectedIds.map(id => deleteDocument(id)));

      console.log('[MULTI_DELETE_DEBUG] Batch delete done');

      setSelectedIds([]);
      setMultiSelectMode(false);

      await fetchDocuments(); // 🔥 FORCE REFRESH

    } catch (error) {
      console.error('[MULTI_DELETE_DEBUG] Error:', error);
      Alert.alert('Error', 'Failed to delete documents');
    }
  };

  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`Delete ${selectedIds.length} documents?`);
    if (confirmed) confirmDelete();
  } else {
    Alert.alert(
      'Delete Documents',
      `Delete ${selectedIds.length} documents?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  }
};

  const handleDeleteDocument = (document: any) => {
  console.log('[UI] Delete clicked with ID:', document.id);

  const confirmDelete = async () => {
    console.log('[DELETE_DEBUG] User confirmed delete');

    const result = await deleteDocument(document.id);

    console.log('[DELETE_DEBUG] Delete result:', result);

    if (result.success) {
      await fetchDocuments(); // 🔥 FORCE REFRESH HERE
    } else {
      Alert.alert('Error', result.error || 'Delete failed');
    }
  };

  // 🔥 FIX FOR WEB + MOBILE
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`Delete ${document.file_name}?`);
    if (confirmed) confirmDelete();
  } else {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete ${document.file_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  }
};

  const renderDocumentCard = ({ item }: { item: any }) => {
    const canDeleteDocument =
      profile?.role === 'admin' || item.uploaded_by !== 'admin';

    const getFileIcon = (fileName: string) => {
      const extension = fileName.split('.').pop()?.toLowerCase();
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
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString();
    };

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
                  icon={getFileIcon(item.file_name)}
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
                  Uploaded: {formatDate(item.created_at)}
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
                  onPress={() => multiSelectMode ? handleMultiSelectDelete() : handleDeleteDocument(item)}
                />
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <AuthGuard>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading documents...</Text>
          </View>
        </SafeAreaView>
      </AuthGuard>
    );
  }

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
                <Text style={styles.subtitle}>{visibleDocuments.length} documents</Text>
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

          {visibleDocuments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyTitle}>
                {isEmployee && activeTab === 'office' ? 'No office documents yet' : 'No documents yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isEmployee && activeTab === 'office'
                  ? 'Admin uploaded office rules and policy documents will appear here'
                  : 'Upload your first document to get started'}
              </Text>
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
          ) : (
            <FlatList
              data={visibleDocuments}
              renderItem={renderDocumentCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              onRefresh={fetchDocuments}
              refreshing={loading}
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
  listContainer: {
    gap: 12,
    paddingBottom: 20,
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
    marginBottom: 80, // Account for tab bar
  },
});
