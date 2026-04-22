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
}
