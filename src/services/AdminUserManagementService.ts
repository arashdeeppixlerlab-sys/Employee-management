import { supabase } from './supabase/supabaseClient';

type Role = 'admin' | 'employee';

interface AdminActionResult {
  success: boolean;
  error?: string;
}

export interface AdminDashboardStatsResult {
  success: boolean;
  activeUsers7d: number;
  storageBytes: number;
  error?: string;
}

interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  role?: Role;
}

type AdminOperation = 'create_user' | 'block_user' | 'unblock_user' | 'delete_user' | 'dashboard_stats';

interface InvokePayload {
  operation: AdminOperation;
  email?: string;
  password?: string;
  name?: string;
  role?: Role;
  userId?: string;
  reason?: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const isInvalidRefreshTokenError = (message?: string) => {
  const value = (message ?? '').toLowerCase();
  return (
    value.includes('invalid refresh token') ||
    value.includes('refresh token not found') ||
    value.includes('invalid session')
  );
};

const getFriendlyCreateUserError = (error?: string): string => {
  if (!error) return 'Failed to create user';

  const normalized = error.toLowerCase();
  const duplicateSignals = [
    'already registered',
    'already exists',
    'duplicate',
    'unique constraint',
    'email address already',
    'user already',
    'phone number already',
  ];

  if (duplicateSignals.some((signal) => normalized.includes(signal))) {
    return 'A user with this email or phone number already exists. Please use different credentials.';
  }

  return error;
};

const getFunctionErrorMessage = async (error: unknown, fallback: string): Promise<string> => {
  const basicMessage = error instanceof Error ? error.message : fallback;
  const maybeContext = (error as { context?: Response } | null)?.context;

  if (!maybeContext) return basicMessage;

  try {
    const contentType = maybeContext.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await maybeContext.clone().json();
      if (body?.error && typeof body.error === 'string') {
        return body.error;
      }
    } else {
      const textBody = await maybeContext.clone().text();
      if (textBody?.trim()) return textBody.trim();
    }
  } catch {
    return basicMessage;
  }

  return basicMessage;
};

const invokeAdminFunction = async (payload: InvokePayload) => {
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    return {
      data: null,
      errorMessage: 'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY in app environment.',
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    if (isInvalidRefreshTokenError(sessionError.message)) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      return {
        data: null,
        errorMessage: 'Your session expired. Please login again.',
      };
    }
    return {
      data: null,
      errorMessage: sessionError.message,
    };
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    return {
      data: null,
      errorMessage: 'You are not logged in. Please login again.',
    };
  }

  const { data, error } = await supabase.functions.invoke('admin-user-management', {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload,
  });

  if (error) {
    return {
      data: null,
      errorMessage: await getFunctionErrorMessage(error, 'Admin action failed'),
    };
  }

  return {
    data,
    errorMessage: null,
  };
};

export class AdminUserManagementService {
  static async getDashboardStats(): Promise<AdminDashboardStatsResult> {
    const { data, errorMessage } = await invokeAdminFunction({
      operation: 'dashboard_stats',
    });

    if (errorMessage) {
      return { success: false, activeUsers7d: 0, storageBytes: 0, error: errorMessage };
    }

    if (!data?.success) {
      return {
        success: false,
        activeUsers7d: 0,
        storageBytes: 0,
        error: data?.error ?? 'Failed to fetch dashboard stats',
      };
    }

    return {
      success: true,
      activeUsers7d: Number(data.activeUsers7d ?? 0),
      storageBytes: Number(data.storageBytes ?? 0),
    };
  }

  static async createUser(input: CreateUserInput): Promise<AdminActionResult> {
    const email = input.email.trim().toLowerCase();
    const password = input.password;
    const name = input.name?.trim() ?? '';

    if (!email) {
      return { success: false, error: 'Email is required.' };
    }

    if (!EMAIL_REGEX.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!password) {
      return { success: false, error: 'Password is required.' };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      };
    }

    if (name && name.length < 2) {
      return { success: false, error: 'Name must be at least 2 characters.' };
    }

    const { data, errorMessage } = await invokeAdminFunction({
      operation: 'create_user',
      email,
      password,
      name,
      role: input.role ?? 'employee',
    });

    if (errorMessage) {
      return { success: false, error: getFriendlyCreateUserError(errorMessage) };
    }

    if (!data?.success) {
      return { success: false, error: getFriendlyCreateUserError(data?.error) };
    }

    return { success: true };
  }

  static async blockUser(userId: string, reason?: string): Promise<AdminActionResult> {
    const { data, errorMessage } = await invokeAdminFunction({
      operation: 'block_user',
      userId,
      reason: reason ?? null,
    });

    if (errorMessage) {
      return { success: false, error: errorMessage };
    }

    if (!data?.success) {
      return { success: false, error: data?.error ?? 'Failed to block user' };
    }

    return { success: true };
  }

  static async unblockUser(userId: string): Promise<AdminActionResult> {
    const { data, errorMessage } = await invokeAdminFunction({
      operation: 'unblock_user',
      userId,
    });

    if (errorMessage) {
      return { success: false, error: errorMessage };
    }

    if (!data?.success) {
      return { success: false, error: data?.error ?? 'Failed to unblock user' };
    }

    return { success: true };
  }

  static async deleteUser(userId: string): Promise<AdminActionResult> {
    const { data, errorMessage } = await invokeAdminFunction({
      operation: 'delete_user',
      userId,
    });

    if (errorMessage) {
      return { success: false, error: errorMessage };
    }

    if (!data?.success) {
      return { success: false, error: data?.error ?? 'Failed to delete user' };
    }

    return { success: true };
  }
}
