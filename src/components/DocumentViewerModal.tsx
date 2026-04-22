import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { WebView } from 'react-native-webview';

type DocumentViewerModalProps = {
  visible: boolean;
  onClose: () => void;
  fileName?: string;
  fileUrl?: string | null;
  loading?: boolean;
};

const isImageFile = (nameOrUrl?: string | null) => {
  if (!nameOrUrl) return false;
  return /\.(jpg|jpeg|png|gif|bmp|webp)(\?|$)/i.test(nameOrUrl);
};

export default function DocumentViewerModal({
  visible,
  onClose,
  fileName,
  fileUrl,
  loading = false,
}: DocumentViewerModalProps) {
  const showImage = isImageFile(fileName) || isImageFile(fileUrl);
  const safeUrl = fileUrl || '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {fileName || 'Document'}
            </Text>
            <IconButton icon="close" size={24} iconColor="#ffffff" onPress={onClose} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading document...</Text>
            </View>
          ) : !fileUrl ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Document URL not available</Text>
            </View>
          ) : (
            <WebView
              source={
                showImage
                  ? {
                      html: `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=6.0, user-scalable=yes" />
    <style>
      html, body { margin: 0; padding: 0; background: #111; height: 100%; overflow: auto; }
      body { display: flex; align-items: center; justify-content: center; }
      img { max-width: none; width: auto; height: auto; min-width: 100%; object-fit: contain; }
    </style>
  </head>
  <body>
    <img src="${safeUrl}" />
  </body>
</html>`,
                    }
                  : { uri: safeUrl }
              }
              style={styles.viewer}
              startInLoadingState
              setBuiltInZoomControls
              setDisplayZoomControls={false}
              scalesPageToFit
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              renderLoading={() => (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2563eb" />
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  content: {
    width: '100%',
    height: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#2563eb',
  },
  title: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  viewer: {
    flex: 1,
    backgroundColor: '#111111',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#111111',
  },
  loadingText: {
    marginTop: 12,
    color: '#d1d5db',
    fontSize: 14,
  },
});
