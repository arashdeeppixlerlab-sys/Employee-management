import { supabase } from './supabase/supabaseClient';
import { Platform } from 'react-native';

export interface UploadResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface Document {
  id: string;
  employee_id: string | null;
  uploaded_by: 'admin' | 'employee';
  file_name: string;
  file_url: string;
  created_at: string;
}

export interface DocumentListResponse {
  success: boolean;
  documents?: Document[];
  error?: string;
}console.log("FILE DEBUG:", File);

export const DocumentService = {
  

  async uploadDocument(file: any, userId: string, role: 'admin' | 'employee'): Promise<UploadResponse> {
    try {
      console.log('[UPLOAD] Start:', { userId, role });

      if (!file || !file.uri) {
        return { success: false, error: 'No file selected' };
      }

      // FIX: Extract file extension and create unique filename
      const fileExt = file.name?.split('.').pop() || 'jpg';
      const storageFileName = `${Date.now()}.${fileExt}`;
      const storagePath = `documents/${userId}/${storageFileName}`;

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

      // FIX: Add ownership logic
      const isAdmin = role === 'admin';
      
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
      const { data, error } = await supabase
        .from('documents')
        .select('*')
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

  async deleteDocument(documentId: string, userId: string) {
    try {
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

      // 🔥 FIXED filename parsing
      const urlParts = document.file_url.split('/');
      const fileNameWithQuery = urlParts[urlParts.length - 1];
      const fileName = fileNameWithQuery.split('?')[0];

      const storagePath = `documents/${document.employee_id}/${fileName}`;

      await supabase.storage.from('documents').remove([storagePath]);

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