// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

type Action =
  | { operation: 'create_user'; email: string; password: string; role?: 'admin' | 'employee'; name?: string }
  | { operation: 'block_user'; userId: string; reason?: string }
  | { operation: 'unblock_user'; userId: string }
  | { operation: 'delete_user'; userId: string }
  | { operation: 'dashboard_stats' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const parseBearerToken = (authorizationHeader: string | null): string | null => {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
};

const isValidRole = (role: string | undefined): role is 'admin' | 'employee' =>
  role === 'admin' || role === 'employee';

const getActiveUsersLast7Days = async (adminClient: ReturnType<typeof createClient>): Promise<number> => {
  const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thresholdIso = threshold.toISOString();
  let page = 1;
  const perPage = 200;
  let total = 0;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const users = data.users ?? [];
    total += users.filter((user) => {
      if (!user.last_sign_in_at) return false;
      return user.last_sign_in_at >= thresholdIso;
    }).length;

    if (users.length < perPage) break;
    page += 1;
  }

  return total;
};

const getDocumentsStorageBytes = async (adminClient: ReturnType<typeof createClient>): Promise<number> => {
  const getDirectoryBytes = async (path: string): Promise<number> => {
    let offset = 0;
    const limit = 100;
    let bytes = 0;

    while (true) {
      const { data, error } = await adminClient.storage.from('documents').list(path, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) {
        throw new Error(`Failed to list storage objects at "${path}": ${error.message}`);
      }

      const objects = data ?? [];
      for (const object of objects) {
        const nestedPath = path ? `${path}/${object.name}` : object.name;
        const isFolder = !object.metadata;

        if (isFolder) {
          bytes += await getDirectoryBytes(nestedPath);
          continue;
        }

        const size = Number((object.metadata as { size?: number | string } | null)?.size ?? 0);
        bytes += Number.isFinite(size) ? size : 0;
      }

      if (objects.length < limit) break;
      offset += limit;
    }

    return bytes;
  };

  return getDirectoryBytes('');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json(500, {
        error: 'Edge function missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret',
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const token = parseBearerToken(req.headers.get('Authorization') ?? req.headers.get('authorization'));
    if (!token) {
      return json(401, { error: 'Missing authorization token. User session token was not sent.' });
    }

    const {
      data: { user: caller },
      error: callerError,
    } = await adminClient.auth.getUser(token);

    if (callerError || !caller) {
      return json(401, { error: 'Invalid user token' });
    }

    const { data: adminProfile, error: adminProfileError } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminProfileError) {
      return json(500, { error: `Failed to verify admin access: ${adminProfileError.message}` });
    }

    if (!adminProfile) {
      return json(403, { error: 'Only admins can perform this action' });
    }

    const payload = (await req.json()) as Action;

    switch (payload.operation) {
      case 'create_user': {
        const role = payload.role ?? 'employee';
        if (!payload.email || !payload.password || !isValidRole(role)) {
          return json(400, { error: 'Invalid create_user payload' });
        }

        const { data: created, error: createError } = await adminClient.auth.admin.createUser({
          email: payload.email,
          password: payload.password,
          email_confirm: true,
          user_metadata: {
            role,
            name: payload.name ?? '',
          },
        });

        if (createError || !created.user) {
          return json(400, { error: createError?.message ?? 'Failed to create user' });
        }

        const { error: profileError } = await adminClient
          .from('profiles')
          .upsert({
            id: created.user.id,
            role,
            email: payload.email,
            name: payload.name ?? '',
            is_blocked: false,
            blocked_at: null,
            blocked_reason: null,
            deleted_at: null,
          }, {
            onConflict: 'id',
          });

        if (profileError) {
          return json(500, { error: 'User created, but profile update failed' });
        }

        await adminClient.from('admin_user_actions').insert({
          action: 'create_user',
          target_user_id: created.user.id,
          performed_by: caller.id,
          metadata: { role, email: payload.email },
        });

        return json(200, { success: true, userId: created.user.id });
      }

      case 'block_user': {
        if (!payload.userId) {
          return json(400, { error: 'Missing userId for block_user' });
        }

        if (payload.userId === caller.id) {
          return json(400, { error: 'Admin cannot block own account' });
        }

        const { error: blockError } = await adminClient.auth.admin.updateUserById(payload.userId, {
          ban_duration: '876000h',
        });

        if (blockError) {
          return json(400, { error: blockError.message });
        }

        await adminClient
          .from('profiles')
          .update({
            is_blocked: true,
            blocked_at: new Date().toISOString(),
            blocked_reason: payload.reason ?? 'Blocked by admin',
          })
          .eq('id', payload.userId);

        await adminClient.from('admin_user_actions').insert({
          action: 'block_user',
          target_user_id: payload.userId,
          performed_by: caller.id,
          metadata: { reason: payload.reason ?? null },
        });

        return json(200, { success: true });
      }

      case 'unblock_user': {
        if (!payload.userId) {
          return json(400, { error: 'Missing userId for unblock_user' });
        }

        const { error: unblockError } = await adminClient.auth.admin.updateUserById(payload.userId, {
          ban_duration: '0s',
        });

        if (unblockError) {
          return json(400, { error: unblockError.message });
        }

        await adminClient
          .from('profiles')
          .update({
            is_blocked: false,
            blocked_at: null,
            blocked_reason: null,
          })
          .eq('id', payload.userId);

        await adminClient.from('admin_user_actions').insert({
          action: 'unblock_user',
          target_user_id: payload.userId,
          performed_by: caller.id,
          metadata: {},
        });

        return json(200, { success: true });
      }

      case 'delete_user': {
        if (!payload.userId) {
          return json(400, { error: 'Missing userId for delete_user' });
        }

        if (payload.userId === caller.id) {
          return json(400, { error: 'Admin cannot delete own account' });
        }

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(payload.userId, false);
        if (deleteError) {
          return json(400, { error: deleteError.message });
        }

        const { error: profileDeleteError } = await adminClient
          .from('profiles')
          .delete()
          .eq('id', payload.userId);

        if (profileDeleteError) {
          return json(500, { error: `User deleted from auth, but profile delete failed: ${profileDeleteError.message}` });
        }

        await adminClient.from('admin_user_actions').insert({
          action: 'delete_user',
          target_user_id: payload.userId,
          performed_by: caller.id,
          metadata: {},
        });

        return json(200, { success: true });
      }

      case 'dashboard_stats': {
        const [activeUsers7d, storageBytes] = await Promise.all([
          getActiveUsersLast7Days(adminClient),
          getDocumentsStorageBytes(adminClient),
        ]);

        return json(200, {
          success: true,
          activeUsers7d,
          storageBytes,
        });
      }

      default:
        return json(400, { error: 'Invalid operation' });
    }
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
