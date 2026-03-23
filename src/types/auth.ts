export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  created_at: string;
  updated_at: string;
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
