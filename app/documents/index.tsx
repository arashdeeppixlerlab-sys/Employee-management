import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import {
  Button,
  Card,
  IconButton,
  ActivityIndicator,
  Snackbar,
  Portal,
  Modal,
} from 'react-native-paper';
import { Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useDocuments } from '../../src/hooks/useDocuments';
import AuthGuard from '../../src/components/AuthGuard';
import { supabase } from '../../src/services/supabase/supabaseClient';

const { width: screenWidth } = Dimensions.get('window');

export default function DocumentsScreen() {
  const router = useRouter();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  
  const {
    documents,
    loading,
    error,
    deleteDocument,
    clearError,
    fetchDocuments,
  } = useDocuments();

  const resolveDocumentOpenUrl = async (document: any): Promise<string | null> => {
    const bucket = 'documents';
    const fileUrl: string | undefined = document?.file_url;
    const legacyFilePath: string | undefined =
      document?.file_path || document?.filePath || document?.path;

    console.log('[OPEN_DEBUG][LEGACY] Document clicked:', {
      id: document?.id,
      file_name: document?.file_name,
      signed_url: document?.signed_url,
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
              console.log('[OPEN_DEBUG][LEGACY] Using signedUrl:', signedData.signedUrl);
              return signedData.signedUrl;
            }
            console.log('[OPEN_DEBUG][LEGACY] Signed URL failed, fallback:', {
              message: signedError?.message,
            });
          }
        }

        console.log('[OPEN_DEBUG][LEGACY] Opening direct URL:', fileUrl);
        return fileUrl;
      }

      const objectPath =
        fileUrl.startsWith(`${bucket}/`) ? fileUrl.slice(bucket.length + 1) : fileUrl;
      if (objectPath) {
        const { data: signedData, error: signedError } =
          await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);
        if (!signedError && signedData?.signedUrl) {
          console.log('[OPEN_DEBUG][LEGACY] Using signedUrl from objectPath:', signedData.signedUrl);
          return signedData.signedUrl;
        }
      }
    }

    if (typeof legacyFilePath === 'string' && legacyFilePath.length > 0) {
      const { data: signedData, error: signedError } =
        await supabase.storage.from(bucket).createSignedUrl(legacyFilePath, 60 * 60);
      if (!signedError && signedData?.signedUrl) {
        console.log('[OPEN_DEBUG][LEGACY] Using signedUrl from legacyFilePath:', signedData.signedUrl);
        return signedData.signedUrl;
      }
    }

    return null;
  };

  const handleViewDocument = async (document: any) => {
    try {
      const resolvedUrl = await resolveDocumentOpenUrl(document);
      if (!resolvedUrl) {
        console.log('[VIEW_DEBUG][LEGACY] No resolvable URL for doc:', document);
        Alert.alert('Error', 'Document URL not available');
        return;
      }

      const fileName = (document.file_name || document.name || '').toLowerCase();
      
      // Check if it's an image
      if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
        setSelectedDocument({ ...document, file_url: resolvedUrl, signed_url: resolvedUrl });
        setImageModalVisible(true);
      } else if (fileName.match(/\.pdf$/)) {
        // For PDFs, try to open in browser
        await Linking.openURL(resolvedUrl);
      } else {
        // For other file types, show download/open option
        Alert.alert(
          'Open Document',
          `Would you like to open ${document.file_name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open',
              onPress: () =>
                Linking.openURL(resolvedUrl).catch((e) => {
                  console.log('[VIEW_DEBUG][LEGACY] openURL error:', e);
                  Alert.alert('Error', 'Failed to open document');
                }),
            },
          ]
        );
      }
    } catch (err) {
      console.log('[VIEW_DEBUG][LEGACY] View error:', err);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const handleDeleteDocument = (document: any) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete ${document.file_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteDocument(document.id);
            if (!result.success) {
              Alert.alert('Error', result.error || 'Failed to delete document');
            }
          },
        },
      ]
    );
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
            <View style={styles.fileIconContainer}>
              <IconButton
                icon={getFileIcon(item.file_name)}
                size={32}
                iconColor="#2563eb"
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
          </View>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => handleViewDocument(item)}
              style={styles.viewButton}
              compact
            >
              View
            </Button>
            
            <IconButton
              icon="delete"
              size={20}
              iconColor="#ef4444"
              onPress={() => handleDeleteDocument(item)}
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
            <Button
              mode="contained"
              onPress={() => router.push('/documents/upload')}
              style={styles.uploadButton}
            >
              Upload
            </Button>
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
        <Portal>
          <Modal
            visible={imageModalVisible}
            onDismiss={() => setImageModalVisible(false)}
            contentContainerStyle={styles.imageModal}
          >
            <View style={styles.imageModalContent}>
              <View style={styles.imageModalHeader}>
                <Text style={styles.imageModalTitle}>
                  {selectedDocument?.file_name}
                </Text>
                <IconButton
                  icon="close"
                  onPress={() => setImageModalVisible(false)}
                />
              </View>
              
              {selectedDocument?.signed_url && (
                <Image
                  source={{ uri: selectedDocument.signed_url }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </Modal>
        </Portal>
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
    marginBottom: 16,
  },
  imageModal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  imageModalContent: {
    flex: 1,
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  imageModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
  },
  previewImage: {
    width: screenWidth - 80,
    height: screenWidth - 80,
    backgroundColor: '#f9fafb',
  },
});
