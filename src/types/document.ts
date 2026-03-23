export interface Document {
  id: string;
  employee_id: string;
  file_name: string;
  file_url: string;
  created_at: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  document?: Document;
  error?: string;
}

export interface DocumentListResponse {
  success: boolean;
  documents?: Document[];
  error?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileType?: string;
  fileSize?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
