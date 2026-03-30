import React, { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  Button,
  Card,
  IconButton,
  Snackbar,
  Portal,
} from 'react-native-paper';
import { Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useDocuments } from '../../src/hooks/useDocuments';
import AuthGuard from '../../src/components/AuthGuard';
import { supabase } from '../../src/services/supabase/supabaseClient';

const { width: screenWidth } = Dimensions.get('window');

export default function DocumentsTabScreen() {
  const router = useRouter();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  
  const {
    documents,
    loading,
    error,
    deleteDocument,
    clearError,
    fetchDocuments,
  } = useDocuments();

  // Fetch documents on component mount
  useEffect(() => {
    console.log('[MOUNT_DEBUG] Component mounted, fetching documents');
    fetchDocuments();
  }, [fetchDocuments]);

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
      
      // Check file type and open appropriate viewer
      if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
        // Image - open in modal
        setImageModalVisible(true);
      } else if (fileName.match(/\.pdf$/)) {
        // PDF - open in browser
        await Linking.openURL(documentUrl);
      } else {
        // Other files - show open dialog
        Alert.alert(
          'Open Document',
          `Would you like to open ${document.file_name || document.name || 'this document'}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open',
              onPress: () =>
                Linking.openURL(documentUrl).catch((e) => {
                  console.log('[VIEW_DEBUG] openURL error:', e);
                  Alert.alert('Error', 'Failed to open document');
                }),
            },
          ]
        );
      }
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
  console.log('[DELETE_DEBUG] Starting delete for document:', document.id);

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
          <View style={styles.documentInfo}>
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
            
            <TouchableOpacity
              style={styles.documentDetails}
              activeOpacity={0.8}
              onPress={() =>
                multiSelectMode ? toggleSelection(item.id) : handleViewDocument(item)
              }
            >
              <Text style={styles.fileName} numberOfLines={2}>
                {item.file_name}
              </Text>
              <Text style={styles.uploadDate}>
                Uploaded: {formatDate(item.created_at)}
              </Text>
            </TouchableOpacity>
          </View>

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
            
            <IconButton
              icon="delete"
              size={20}
              iconColor="#ef4444"
              onPress={() => multiSelectMode ? handleMultiSelectDelete() : handleDeleteDocument(item)}
            />
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
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>My Documents</Text>
            <View style={styles.headerActions}>
              {multiSelectMode && selectedIds.length > 0 && (
                <IconButton
                  icon="delete"
                  size={24}
                  iconColor="#ef4444"
                  onPress={handleMultiSelectDelete}
                  style={styles.multiSelectDelete}
                />
              )}
              <IconButton
                icon={multiSelectMode ? "close" : "checkbox-multiple-marked"}
                size={24}
                iconColor="#2563eb"
                onPress={handleMultiSelect}
              />
              <Button
                mode="contained"
                onPress={() => router.push('/documents/upload')}
                style={styles.uploadButton}
              >
                Upload
              </Button>
            </View>
          </View>

          {documents.length === 0 ? (
            <View style={styles.emptyState}>
              <IconButton
                icon="file-upload"
                size={64}
                iconColor="#9ca3af"
              />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptySubtitle}>
                Upload your first document to get started
              </Text>
              <Button
                mode="contained"
                onPress={() => router.push('/documents/upload')}
                style={styles.emptyUploadButton}
              >
                Upload First Document
              </Button>
            </View>
          ) : (
            <FlatList
              data={documents}
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
          onDismiss={clearError}
          duration={4000}
          style={styles.snackbar}
        >
          {error}
        </Snackbar>

        {/* Image Preview Modal */}
        <Modal
          visible={imageModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <View style={styles.imageModalOverlay}>
            <View style={styles.imageModalContent}>
              <View style={styles.imageModalHeader}>
                <Text style={styles.imageModalTitle}>
                  {selectedDocument?.file_name}
                </Text>
                <IconButton
                  icon="close"
                  size={24}
                  iconColor="#ffffff"
                  onPress={() => setImageModalVisible(false)}
                />
              </View>
              
              {loadingPreview ? (
                <View style={styles.imageLoadingContainer}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={styles.imageLoadingText}>Loading image...</Text>
                </View>
              ) : selectedDocument ? (
                <Image
                  source={{ 
                    uri: selectedDocument.file_url
                  }}
                  style={styles.previewImage}
                  resizeMode="contain"
                  onError={(error) => {
                    console.log('[IMAGE_DEBUG] Image load error:', error);
                    Alert.alert('Error', 'Failed to load image.');
                    setImageModalVisible(false);
                  }}
                  onLoad={() => {
                    console.log('[IMAGE_DEBUG] Image loaded successfully');
                  }}
                />
              ) : null}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiSelectDelete: {
    marginRight: 8,
  },
  checkboxContainer: {
    marginRight: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },
  uploadButton: {
    backgroundColor: '#2563eb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
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
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fileIconContainer: {
    marginRight: 12,
  },
  documentDetails: {
    flex: 1,
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewButton: {
    borderColor: '#2563eb',
    flex: 1,
    marginRight: 8,
  },
  snackbar: {
    marginBottom: 80, // Account for tab bar
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
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
  },
  imageLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  imageLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  previewImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#f9fafb',
  },
});
