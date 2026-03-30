import { supabase } from './supabase/supabaseClient';

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
  signed_url?: string;
}

export interface DocumentListResponse {
  success: boolean;
  documents?: Document[];
  error?: string;
}

export const DocumentService = {
  async uploadDocument(userId: string, file: any, fileName: string): Promise<UploadResponse> {
    try {
      console.log('[UPLOAD] Start:', { userId, fileName });

      if (!file || !file.uri) {
        return { success: false, error: 'No file selected' };
      }

      const fileExt = (file.name || 'file').split('.').pop() || 'bin';
      const storageFileName = `${Date.now()}.${fileExt}`;
      const storagePath = `documents/${userId}/${storageFileName}`;

      const contentType =
        file.mimeType || file.type || 'application/octet-stream';

      let uploadData: any;

      const isWeb = typeof window !== 'undefined';

      if (isWeb) {
        console.log('[UPLOAD] WEB');

        const response = await fetch(file.uri);
        uploadData = await response.blob();

      } else {
        console.log('[UPLOAD] RN');

        // 🔥 FIX: Convert to blob for React Native
        const response = await fetch(file.uri);
        uploadData = await response.blob();
      }

      const { error } = await supabase.storage
        .from('documents')
        .upload(storagePath, uploadData, {
          contentType,
        });

      if (error) {
        console.log('[UPLOAD ERROR]:', error);
        return { success: false, error: error.message };
      }

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        return { success: false, error: 'Failed to generate file URL' };
      }

      const { data: insertData, error: dbError } = await supabase
        .from('documents')
        .insert({
          employee_id: userId,
          file_name: fileName || file.name || 'file',
          file_url: publicUrl,
        })
        .select();

      if (dbError) {
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
      console.log('[FETCH] user:', userId);

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.log('[FETCH ERROR]:', error);
        return { success: false, error: error.message };
      }

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
      console.log('[DELETE] doc:', documentId);

      // Determine role so employees can only delete their own documents
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      const isAdmin = profile?.role === 'admin';

      const docQuery = supabase
        .from('documents')
        .select('file_url, employee_id')
        .eq('id', documentId);

      const { data: document, error: fetchError } = !isAdmin
        ? await docQuery.eq('employee_id', userId).maybeSingle()
        : await docQuery.maybeSingle();

      if (fetchError || !document) {
        return { success: false, error: 'Not found or no access' };
      }

      const fileName = document.file_url?.split('/').pop();
      if (!fileName) {
        return { success: false, error: 'File URL not found' };
      }

      // Storage path is based on the document owner (employee_id), not the requester id
      const storagePath = `documents/${document.employee_id}/${fileName}`;

      // Delete from storage
      await supabase.storage.from('documents').remove([storagePath]);

      // Delete from DB
      const deleteQuery = supabase.from('documents').delete().eq('id', documentId);
      const { error: dbError } = !isAdmin
        ? await deleteQuery.eq('employee_id', userId)
        : await deleteQuery;

      if (dbError) {
        return { success: false, error: dbError.message };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  },
};