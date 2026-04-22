export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  created_at: string;
  updated_at: string;
  is_blocked?: boolean;
  blocked_at?: string | null;
  blocked_reason?: string | null;
  deleted_at?: string | null;
  profile_photo_url?: string | null;
  name?: string;
  bio?: string;
  education?: string;
  age?: number;
  address?: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
  language?: string;
  timezone?: string;
}

export interface AuthResponse {
  success: boolean;
  profile?: Profile;
  error?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}
