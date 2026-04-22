import { supabase } from './supabase/supabaseClient';
import { Platform } from 'react-native';
import type { DocumentListResponse } from '../types/document';

export interface UploadResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const DocumentService = {


  async uploadDocument(file: any, userId: string, role: 'admin' | 'employee'): Promise<UploadResponse> {
    try {
      console.log('[UPLOAD] Start:', { userId, role });

      if (!file || !file.uri) {
        return { success: false, error: 'No file selected' };
      }

      // FIX: Add ownership logic
      const isAdmin = role === 'admin';

      // FIX: Extract file extension and create unique filename
      const fileExt = file.name?.split('.').pop() || 'jpg';
      const storageFileName = `${Date.now()}.${fileExt}`;
      const storagePath = `documents/${isAdmin ? 'admin' : userId}/${storageFileName}`;

      const contentType = file.mimeType || file.type || 'application/octet-stream';

      let uploadResult: any;

      // FIX: Handle platform-specific upload
      if (Platform.OS === 'web') {
        // FIX: Keep existing web logic with blob
        console.log('[UPLOAD] WEB - Using blob approach');

        const response = await fetch(file.uri);
        const blob = await response.blob();

        const { error } = await supabase.storage
          .from('documents')
          .upload(storagePath, blob, {
            contentType,
            upsert: false,
          });

        if (error) {
          console.log('[UPLOAD ERROR]:', error);
          return { success: false, error: error.message };
        }

        uploadResult = { data: null, error: null };

      } else {
        // FIX: React Native - Use FormData instead of fetch/blob
        console.log('[UPLOAD] MOBILE - Using FormData approach');

        const formData = new FormData();

        // FIX: Proper React Native file object format
        formData.append('file', {
          uri: file.uri,
          name: storageFileName,
          type: contentType,
        } as any);

        const { data, error } = await supabase.storage
          .from('documents')
          .upload(storagePath, formData, {
            contentType,
            upsert: false,
          });

        if (error) {
          console.log('[UPLOAD ERROR]:', error);
          return { success: false, error: error.message };
        }

        uploadResult = { data, error };
      }

      // FIX: Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        return { success: false, error: 'Failed to generate file URL' };
      }

      const documentData = {
        uploaded_by: isAdmin ? 'admin' : 'employee',
        employee_id: isAdmin ? null : userId,
        file_name: file.name,
        file_url: publicUrl,
      };

      // FIX: Insert document record in database with ownership
      const { data: insertData, error: dbError } = await supabase
        .from('documents')
        .insert(documentData)
        .select();

      if (dbError) {
        // FIX: Cleanup uploaded file if DB insert fails
        await supabase.storage.from('documents').remove([storagePath]);
        return { success: false, error: dbError.message };
      }

      return { success: true, data: insertData };

    } catch (error) {
      console.log('[UPLOAD EXCEPTION]:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },

  async getDocuments(userId: string): Promise<DocumentListResponse> {
    try {
      console.log('[FETCH] Fetching documents for employee:', userId);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .or(`employee_id.eq.${userId},uploaded_by.eq.admin`)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('[FETCH ERROR]:', error);
        return { success: false, error: error.message };
      }

      console.log('[FETCH] Employee documents fetched:', data?.length || 0);
      return { success: true, documents: data || [] };

    } catch (error) {
      console.log('[FETCH EXCEPTION]:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  },

  async getAdminDocuments(): Promise<DocumentListResponse> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('uploaded_by', 'admin')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, documents: data || [] };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  },

  async deleteDocument(
    documentId: string,
    userId: string,
    userRole?: 'admin' | 'employee'
  ) {
    try {
      console.log('[DELETE] Received ID:', documentId);
      console.log('[DELETE] Starting deletion for document:', documentId);

      // 🔍 DEBUG: Fetch sample DB IDs for comparison
      const { data: sampleData } = await supabase.from('documents').select('id').limit(5);
      console.log('[DEBUG] DB IDs:', sampleData);

      let isAdmin = userRole === 'admin';
      if (!userRole) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        isAdmin = profile?.role === 'admin';
      }
      console.log('[DELETE] User is admin:', isAdmin);

      const docQuery = supabase
        .from('documents')
        .select('id, file_url, employee_id, uploaded_by')
        .eq('id', documentId);

      const { data: document, error: fetchError } = await docQuery.maybeSingle();

      console.log('[DELETE] Document fetch result:', { document, fetchError });

      // Make delete idempotent: if already deleted, treat as success.
      if (!document) {
        console.log('[DELETE] Document already deleted or inaccessible:', documentId);
        return { success: true };
      }

      if (fetchError) {
        console.log('[DELETE] Document fetch error:', fetchError);
        return { success: false, error: fetchError.message || 'Not found or no access' };
      }

      console.log('[DELETE] Document found:', document);
      console.log('[DELETE] RLS DEBUG - Document ownership:', {
        docId: document.id,
        employeeId: document.employee_id,
        uploadedBy: document.uploaded_by,
        currentUserId: userId,
        isAdmin: isAdmin,
        canDelete: isAdmin || document.employee_id === userId
      });

      // filename parsing
      const urlParts = document.file_url.split('/');
      const fileNameWithQuery = urlParts[urlParts.length - 1];
      const fileName = fileNameWithQuery.split('?')[0];

      // Delete from storage
      const storagePath = `documents/${document.employee_id || 'admin'}/${fileName}`;
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath]);

      if (storageError) {
        console.log('[DELETE] Storage deletion error:', storageError);
        // continue anyway
      }

      // Database delete with RLS handling
      let deleteResponse;

      try {
        if (isAdmin) {
          console.log('[DELETE] Admin delete - no additional filters');
          deleteResponse = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId)
            .select();
        } else {
          console.log('[DELETE] Employee delete - with ownership check');
          deleteResponse = await supabase
            .from('documents')
            .delete()
            .eq('id', documentId)
            .eq('employee_id', userId)
            .select();
        }
      } catch (err) {
        console.log('[DELETE] Exception during DB delete:', err);
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown DB error',
        };
      }

      const { data, error: dbError } = deleteResponse;

      console.log('[DELETE] DB response:', { data, dbError });

      if (dbError) {
        console.log('[DELETE] Database deletion error:', dbError);
        return { success: false, error: dbError.message };
      }

      if (!data || data.length === 0) {
        console.log('[DELETE] No rows deleted. Treating as already deleted.');
        return { success: true };
      }

      console.log('[DELETE] Document deleted successfully');
      return { success: true };

    } catch (error) {
      console.log('[DELETE] Exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }
};