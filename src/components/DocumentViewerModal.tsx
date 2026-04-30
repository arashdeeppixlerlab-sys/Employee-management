import React from 'react';
import { ActivityIndicator, Image, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const isPdfFile = (nameOrUrl?: string | null) => {
  if (!nameOrUrl) return false;
  return /\.pdf(\?|$)/i.test(nameOrUrl);
};

export default function DocumentViewerModal({
  visible,
  onClose,
  fileName,
  fileUrl,
  loading = false,
}: DocumentViewerModalProps) {
  const showImage = isImageFile(fileName) || isImageFile(fileUrl);
  const showPdf = isPdfFile(fileName) || isPdfFile(fileUrl);
  const safeUrl = fileUrl || '';
  const isWeb = Platform.OS === 'web';
  const mobilePdfViewerUrl = safeUrl
    ? `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(safeUrl)}`
    : '';

  const openInBrowser = async () => {
    if (!safeUrl) return;
    try {
      await Linking.openURL(safeUrl);
    } catch {
      // Ignore openURL errors, UI already communicates loading/availability.
    }
  };

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
          ) : isWeb ? (
            showImage ? (
              <View style={styles.webImageContainer}>
                <Image source={{ uri: safeUrl }} style={styles.webImage} resizeMode="contain" />
              </View>
            ) : showPdf ? (
              <View style={styles.webPdfContainer}>
                <iframe
                  src={`${safeUrl}#view=FitH`}
                  style={styles.webPdfIframe as React.CSSProperties}
                  title={fileName || 'Document'}
                />
              </View>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                  This file type is not supported in-app on web.
                </Text>
                <TouchableOpacity style={styles.openButton} onPress={openInBrowser}>
                  <Text style={styles.openButtonText}>Open in new tab</Text>
                </TouchableOpacity>
              </View>
            )
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
                  : showPdf
                    ? { uri: mobilePdfViewerUrl }
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
    textAlign: 'center',
  },
  webImageContainer: {
    flex: 1,
    backgroundColor: '#111111',
    padding: 12,
  },
  webImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webPdfContainer: {
    flex: 1,
    backgroundColor: '#111111',
  },
  webPdfIframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  openButton: {
    marginTop: 14,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  openButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
