import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
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

const { width: screenWidth } = Dimensions.get('window');

export default function DocumentsTabScreen() {
  const router = useRouter();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const {
    documents,
    loading,
    error,
    deleteDocument,
    clearError,
    fetchDocuments,
  } = useDocuments();

  const handleViewDocument = async (document: any) => {
    try {
      if (!document.signed_url) {
        Alert.alert('Error', 'Document URL not available');
        return;
      }

      setLoadingPreview(true);
      setSelectedDocument(document);

      const fileName = document.file_name.toLowerCase();
      
      // Check file type and open appropriate viewer
      if (fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
        // Image - open in modal
        setImageModalVisible(true);
      } else if (fileName.match(/\.pdf$/)) {
        // PDF - open in browser
        await Linking.openURL(document.signed_url);
      } else {
        // Other files - show open dialog
        Alert.alert(
          'Open Document',
          `Would you like to open ${document.file_name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open',
              onPress: () => Linking.openURL(document.signed_url),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to open document');
    } finally {
      setLoadingPreview(false);
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
              ) : selectedDocument?.signed_url ? (
                <Image
                  source={{ uri: selectedDocument.signed_url }}
                  style={styles.previewImage}
                  resizeMode="contain"
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
