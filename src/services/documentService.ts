import { supabase } from './supabase/supabaseClient';
import { Buffer } from 'buffer';

global.Buffer = global.Buffer || Buffer;

export interface UploadResponse {
  success: boolean;
  url?: string;
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
    console.log('[UPLOAD_DEBUG] UploadStart', { userId, fileName });

    try {
      if (!file || !file.uri) {
        return { success: false, error: 'No file selected' };
      }

      // Generate file path
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const extension = fileName.split('.').pop() || '';
      const storageFileName = `${timestamp}-${random}.${extension}`;
      const storagePath = `documents/${userId}/${storageFileName}`;

      console.log('[UPLOAD_DEBUG] StoragePath:', storagePath);
//upload
console.log('RUNNING CLEAN VERSION');
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('documents')
        .upload(filePath, {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        } as any);

      if (error) {
        console.log('UPLOAD ERROR:', error);
        return { success: false, error: error.message };
      }

      console.log('[UPLOAD_DEBUG] Storage upload success');

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('documents').getPublicUrl(storagePath);

      console.log('[UPLOAD_DEBUG] PublicURL:', publicUrl);

      // Insert metadata into database
      const { data: insertData, error: dbError } = await supabase
        .from('documents')
        .insert({
          employee_id: userId,
          file_name: fileName,
          file_url: publicUrl,
        })
        .select();

      console.log('[UPLOAD_DEBUG] DB_RESULT:', { insertData, dbError });

      if (dbError) {
        // Clean up uploaded file if DB insert fails
        await supabase.storage.from('documents').remove([storagePath]);

        return {
          success: false,
          error: `Failed to save document metadata: ${dbError.message}`,
        };
      }

      return { success: true, url: publicUrl };
    } catch (error) {
      console.log('[UPLOAD_EXCEPTION]', error);
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
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      // Generate signed URLs for each document
      const documentsWithSignedUrls = await Promise.all(
        (data as Document[]).map(async (doc) => {
          try {
            // Extract file path from storage URL
            const urlParts = doc.file_url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `documents/${userId}/${fileName}`;
            
            // Generate signed URL (valid for 1 hour)
            const { data: signedUrlData } = await supabase.storage
              .from('documents')
              .createSignedUrl(filePath, 3600); // 1 hour expiry

            return {
              ...doc,
              signed_url: signedUrlData?.signedUrl || doc.file_url,
            };
          } catch (err) {
            console.warn('Failed to generate signed URL for document:', doc.id, err);
            return {
              ...doc,
              signed_url: doc.file_url, // Fallback to original URL
            };
          }
        })
      );

      return { success: true, documents: documentsWithSignedUrls };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
      };
    }
  },

  async deleteDocument(documentId: string, userId: string) {
    try {
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_url')
        .eq('id', documentId)
        .eq('employee_id', userId)
        .single();

      if (fetchError || !document) {
        return { success: false, error: 'Not found or no access' };
      }

      const fileName = document.file_url.split('/').pop();
      const storagePath = `documents/${userId}/${fileName}`;

      await supabase.storage.from('documents').remove([storagePath]);

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('employee_id', userId);

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