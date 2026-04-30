import { useState, useEffect, useRef, useCallback } from 'react';
import { DocumentService } from '../services/documentService';
import { useAuth } from './useAuth';
import {
  notifyDocumentsChanged,
  subscribeToDocumentsChanges,
} from '../utils/documentsSync';

export const useDocuments = () => {
  const isMounted = useRef(true);
  const employeeFetchInFlightRef = useRef(false);
  const adminFetchInFlightRef = useRef(false);
  const lastEmployeeFetchAtRef = useRef(0);
  const lastAdminFetchAtRef = useRef(0);
  const { profile } = useAuth();

  const [state, setState] = useState({
    documents: [],
    loading: false,
    uploading: false,
    error: null,
  });

  const setStateSafe = (updates: any) => {
    if (isMounted.current) {
      setState((prev) => {
        const resolvedUpdates = typeof updates === 'function' ? updates(prev) : updates;
        return { ...prev, ...resolvedUpdates };
      });
    }
  };

  const fetchDocuments = useCallback(async () => {
    if (!profile?.id) return;
    const now = Date.now();
    const minIntervalMs = 1200;
    if (employeeFetchInFlightRef.current) return;
    if (now - lastEmployeeFetchAtRef.current < minIntervalMs) return;
    employeeFetchInFlightRef.current = true;
    lastEmployeeFetchAtRef.current = now;

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
      employeeFetchInFlightRef.current = false;
      setStateSafe({ loading: false });
    }
  }, [profile?.id]);

  const fetchAdminDocuments = useCallback(async () => {
    const now = Date.now();
    const minIntervalMs = 1200;
    if (adminFetchInFlightRef.current) return;
    if (now - lastAdminFetchAtRef.current < minIntervalMs) return;
    adminFetchInFlightRef.current = true;
    lastAdminFetchAtRef.current = now;

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
      adminFetchInFlightRef.current = false;
      setStateSafe({ loading: false });
    }
  }, []);

  const deleteDocument = useCallback(async (documentId: string) => {
    if (!profile?.id) return;

    try {
      const res = await DocumentService.deleteDocument(documentId, profile.id, profile.role);

      if (res.success) {
        setStateSafe((prev: any) => ({
          documents: prev.documents.filter(doc => doc.id !== documentId)
        }));
        if (profile?.role === 'admin') {
          notifyDocumentsChanged({ scope: 'admin' });
        } else {
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