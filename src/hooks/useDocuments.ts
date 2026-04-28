import { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentService } from '../services/documentService';
import { useAuth } from './useAuth';
import {
  notifyDocumentsChanged,
  subscribeToDocumentsChanges,
} from '../utils/documentsSync';

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

  const fetchAdminDocuments = useCallback(async () => {
    setStateSafe({ loading: true, error: null });

    try {
      const response = await DocumentService.getAdminDocuments();

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
  }, []);

  const deleteDocument = useCallback(async (documentId: string) => {
    if (!profile?.id) return;

    try {
      const res = await DocumentService.deleteDocument(documentId, profile.id, profile.role);

      if (res.success) {
        setStateSafe(prev => ({
          documents: prev.documents.filter(doc => doc.id !== documentId)
        }));
        if (profile?.role === 'admin') {
          await fetchAdminDocuments();
          notifyDocumentsChanged({ scope: 'admin' });
        } else {
          await fetchDocuments();
          notifyDocumentsChanged({
            scope: 'employee',
            employeeId: profile.id,
          });
        }
      } else {
        setStateSafe({ error: res.error });
      }

      return res;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Delete failed';
      setStateSafe({ error: msg });
      return { success: false, error: msg };
    }
  }, [profile?.id, fetchDocuments, fetchAdminDocuments]);

  useEffect(() => {
    if (!profile?.id) return;
    if (profile.role === 'admin') {
      fetchAdminDocuments();
    } else {
      fetchDocuments();
    }
  }, [profile?.id, profile?.role, fetchDocuments, fetchAdminDocuments]);

  useEffect(() => {
    if (!profile?.id) return;

    const unsubscribe = subscribeToDocumentsChanges((event) => {
      if (profile.role === 'admin' && event.scope === 'admin') {
        fetchAdminDocuments();
        return;
      }

      if (
        profile.role === 'employee' &&
        event.scope === 'employee' &&
        event.employeeId === profile.id
      ) {
        fetchDocuments();
      }
    });

    return unsubscribe;
  }, [profile?.id, profile?.role, fetchDocuments, fetchAdminDocuments]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    ...state,
    fetchDocuments,
    fetchAdminDocuments,
    deleteDocument,
  };
};