import { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentService, UploadResponse } from '../services/documentService';
import { Document, DocumentListResponse, UploadProgress } from '../types/document';
import { useAuth } from './useAuth';

interface DocumentsState {
  documents: Document[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  uploadProgress: UploadProgress | null;
}

export const useDocuments = () => {
  const isMounted = useRef(true);
  const { profile } = useAuth();

  const [state, setState] = useState<DocumentsState>({
    documents: [],
    loading: false,
    uploading: false,
    error: null,
    uploadProgress: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, loading }));
    }
  }, []);

  const setUploading = useCallback((uploading: boolean) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, uploading }));
    }
  }, []);

  const setError = useCallback((error: string | null) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, error }));
    }
  }, []);

  const setUploadProgress = useCallback((progress: UploadProgress | null) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, uploadProgress: progress }));
    }
  }, []);

  const setDocuments = useCallback((documents: Document[]) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, documents }));
    }
  }, []);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!profile?.id) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await DocumentService.getDocuments(profile.id);

      if (response.success && response.documents) {
        setDocuments(response.documents);
      } else {
        setError(response.error || 'Failed to fetch documents');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [profile?.id, setLoading, setError, setDocuments]);

  // Upload document
  const uploadDocument = useCallback(async (file: any, fileName: string) => {
    if (!profile?.id) {
      setError('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    setUploading(true);
    setError(null);
    setUploadProgress({ loaded: 0, total: 100, percentage: 0 });

    try {
      const response = await DocumentService.uploadDocument(profile.id, file, fileName);

      if (response.success) {
        // Refresh documents list
        await fetchDocuments();
        setUploadProgress(null);
        return { success: true };
      } else {
        setError(response.error || 'Upload failed');
        setUploadProgress(null);
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setError(errorMessage);
      setUploadProgress(null);
      return { success: false, error: errorMessage };
    } finally {
      setUploading(false);
    }
  }, [profile?.id, setUploading, setError, setUploadProgress, setDocuments]);

  // Delete document
  const deleteDocument = useCallback(async (documentId: string) => {
    if (!profile?.id) {
      setError('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const response = await DocumentService.deleteDocument(documentId, profile.id);

      if (response.success) {
        // Remove document from the list
        setDocuments(state.documents.filter(doc => doc.id !== documentId));
        return { success: true };
      } else {
        setError(response.error || 'Delete failed');
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [profile?.id, setError, setDocuments]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Initialize documents on mount
  useEffect(() => {
    if (profile?.id) {
      fetchDocuments();
    }
  }, [profile?.id, fetchDocuments]);

  // Cleanup
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    ...state,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    clearError,
    hasDocuments: state.documents.length > 0,
  };
};
