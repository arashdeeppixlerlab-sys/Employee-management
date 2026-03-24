import { supabase } from './supabase/supabaseClient';
import { Buffer } from 'buffer';

global.Buffer = global.Buffer || Buffer;

export interface UploadResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Document {
  id: string;
  employee_id: string;
  file_name: string;
  file_url: string;
  created_at: string;
  signed_url?: string; // Runtime signed URL for viewing
}

export interface DocumentListResponse {
  success: boolean;
  documents?: Document[];
  error?: string;
}

export const DocumentService = {
  async uploadDocument(userId: string, file: any, fileName: string): Promise<UploadResponse> {
    try {
      console.log('[UPLOAD_DEBUG] Starting upload:', { userId, fileName, file });

      // Validate file
      if (!file || !file.uri) {
        return { success: false, error: 'No file selected' };
      }

      const fileSize = file.size || 0;
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (fileSize > maxSize) {
        return { success: false, error: 'File size exceeds 10MB limit' };
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const storageFileName = `${timestamp}.${fileExt}`;
      const storagePath = `documents/${userId}/${storageFileName}`;

      console.log('[UPLOAD_DEBUG] Storage path:', storagePath);
      console.log('[UPLOAD_DEBUG] File info:', {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
        size: fileSize
      });

      // Convert file to buffer for proper upload
      const response = await fetch(file.uri);
      const buffer = await response.arrayBuffer();

      console.log('[UPLOAD_DEBUG] Buffer size:', buffer.byteLength);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, {
          contentType: file.mimeType || 'application/octet-stream',
          upsert: false
        });

      if (error) {
        console.log('[UPLOAD_DEBUG] Storage error:', error);
        return { success: false, error: error.message };
      }

      console.log('[UPLOAD_DEBUG] Storage upload success:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      console.log('[UPLOAD_DEBUG] Public URL:', publicUrl);

      // Insert metadata into database
      const { data: insertData, error: dbError } = await supabase
        .from('documents')
        .insert({
          employee_id: userId,
          file_name: fileName,
          file_url: publicUrl,
        })
        .select();

      if (dbError) {
        console.log('[UPLOAD_DEBUG] DB error:', dbError);
        // Clean up uploaded file if DB insert fails
        await supabase.storage.from('documents').remove([storagePath]);
        return { success: false, error: `Failed to save document metadata: ${dbError.message}` };
      }

      console.log('[UPLOAD_DEBUG] DB insert success:', insertData);
      return { success: true, data: insertData };

    } catch (error) {
      console.log('[UPLOAD_DEBUG] Upload exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },

  async getDocuments(userId: string): Promise<DocumentListResponse> {
    try {
      console.log('[FETCH_DEBUG] Fetching for user:', userId);

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('employee_id', userId);

      if (error) {
        console.log('[FETCH_DEBUG] ERROR:', error);
        return { success: false, error: error.message };
      }

      console.log('[FETCH_DEBUG] RESULT COUNT:', data?.length);

      return {
        success: true,
        documents: data || [],
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  },

  async deleteDocument(documentId: string, userId: string) {
    try {
      console.log('[DELETE_DEBUG] Starting delete for document:', documentId, 'user:', userId);

      // First fetch document to get file info
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', documentId)
        .eq('employee_id', userId)
        .single();

      console.log('[DELETE_DEBUG] Fetched document:', { document, fetchError });

      if (fetchError || !document) {
        console.log('[DELETE_DEBUG] Document not found:', fetchError);
        return { success: false, error: 'Not found or no access' };
      }

      // Extract file name and construct storage path
      if (!document.file_url) {
        console.log('[DELETE_DEBUG] No file_url found');
        return { success: false, error: 'File URL not found' };
      }

      const urlParts = document.file_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const storagePath = `documents/${userId}/${fileName}`;

      console.log('[DELETE_DEBUG] Storage path:', storagePath);

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath]);

      console.log('[DELETE_DEBUG] Storage delete result:', { storageError });

      if (storageError) {
        console.log('[DELETE_DEBUG] Storage delete failed:', storageError);
        // Continue with DB delete even if storage fails (cleanup)
        console.log('[DELETE_DEBUG] Continuing with DB delete for cleanup');
      }

      // Delete from database
      const { error: dbError ,count} = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('employee_id', userId)
        .select();

      console.log('[DELETE_DEBUG] DB delete result:', { dbError, count });

      if (dbError) {
        console.log('[DELETE_DEBUG] DB delete failed:', dbError);
        return { success: false, error: dbError.message };
      }

      console.log('[DELETE_DEBUG] Delete successful');
      return { success: true };
    } catch (error) {
      console.log('[DELETE_DEBUG] Delete exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  },
};