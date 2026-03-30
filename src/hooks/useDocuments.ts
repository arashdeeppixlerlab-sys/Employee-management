import { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentService } from '../services/documentService';
import { useAuth } from './useAuth';

export const useDocuments = () => {
  const isMounted = useRef(true);
  const { profile } = useAuth();

  const [state, setState] = useState({
    documents: [],
    loading: false,
    uploading: false,
    error: null,
  });

  const setStateSafe = (updates: any) => {
    if (isMounted.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  };

  const fetchDocuments = useCallback(async () => {
    if (!profile?.id) return;

    setStateSafe({ loading: true, error: null });

    try {
      const response = await DocumentService.getDocuments(profile.id);

      if (response.success) {
        setStateSafe({ documents: response.documents || [] });
      } else {
        setStateSafe({ error: response.error });
      }
    } catch (error) {
      setStateSafe({
        error: error instanceof Error ? error.message : 'Fetch failed',
      });
    } finally {
      setStateSafe({ loading: false });
    }
  }, [profile?.id]);

  const uploadDocument = useCallback(async (file: any, fileName: string) => {
    if (!profile?.id) {
      setStateSafe({ error: 'User not authenticated' });
      return { success: false, error: 'User not authenticated' };
    }

    setStateSafe({ uploading: true, error: null });

    try {
      const response = await DocumentService.uploadDocument(file, profile.id, 'employee');

      if (response.success) {
        await fetchDocuments(); // ✅ FIX count update
      } else {
        setStateSafe({ error: response.error });
      }

      return response;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Upload failed';
      setStateSafe({ error: msg });
      return { success: false, error: msg };
    } finally {
      setStateSafe({ uploading: false });
    }
  }, [profile?.id, fetchDocuments]);

  const deleteDocument = useCallback(async (documentId: string) => {
    if (!profile?.id) return;

    try {
      const res = await DocumentService.deleteDocument(documentId, profile.id);

      if (res.success) {
        await fetchDocuments(); // ✅ FIX count update
      } else {
        setStateSafe({ error: res.error });
      }

      return res;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Delete failed';
      setStateSafe({ error: msg });
      return { success: false, error: msg };
    }
  }, [profile?.id, fetchDocuments]);

  useEffect(() => {
    if (profile?.id) fetchDocuments();
  }, [profile?.id]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    ...state,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
  };
};