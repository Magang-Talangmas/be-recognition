import { getSupabase } from './client';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

interface AuthUserData {
  email: string;
  password?: string;
  name?: string;
  employeeId?: string;
}

function buildUserMetadata(data: AuthUserData): Record<string, string> {
  const metadata: Record<string, string> = {};
  if (data.name) metadata.name = data.name;
  if (data.employeeId) metadata.employee_id = data.employeeId;
  return metadata;
}

async function findAuthUserByEmail(email: string): Promise<{ id: string; user_metadata: Record<string, unknown> } | null> {
  const endpoint = `${env.SUPABASE_URL}/auth/v1/admin/users`;
  const filter = encodeURIComponent(email);

  const res = await fetch(`${endpoint}?filter=${filter}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  }).catch((err) => {
    logger.error('Gagal mencari user di Supabase Auth', {
      email,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  });

  if (!res) return null;

  if (!res.ok) {
    logger.error('Gagal mencari user di Supabase Auth', {
      email,
      status: res.status,
      statusText: res.statusText,
    });
    return null;
  }

  const json = (await res.json().catch(() => null)) as {
    users?: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    }[];
  } | null;

  const found = json?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  return found
    ? {
        id: found.id,
        user_metadata: found.user_metadata ?? {},
      }
    : null;
}

/**
 * Buat user di Supabase Auth secara otomatis saat employee dibuat di backend.
 */
export async function createAuthUser(data: AuthUserData): Promise<{ id: string } | null> {
  if (!data.email || !data.password) {
    return null;
  }

  const client = getSupabase();
  const { data: created, error } = await client.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: buildUserMetadata(data),
  });

  if (error) {
    logger.error('Gagal membuat user di Supabase Auth', {
      email: data.email,
      error: error.message,
    });
    return null;
  }

  if (created?.user) {
    logger.info('User Supabase Auth dibuat otomatis', {
      email: data.email,
      authUserId: created.user.id,
    });
    return { id: created.user.id };
  }

  return null;
}

/**
 * Perbarui user di Supabase Auth (email/password/metadata) saat employee diupdate.
 * Jika user belum ada di Supabase Auth, buat otomatis.
 */
export async function upsertAuthUser(data: AuthUserData): Promise<void> {
  if (!data.email) {
    return;
  }

  const client = getSupabase();
  const found = await findAuthUserByEmail(data.email);

  if (!found) {
    await createAuthUser(data);
    return;
  }

  const updates: Record<string, unknown> = {};
  if (data.password) updates.password = data.password;
  updates.user_metadata = {
    ...found.user_metadata,
    ...buildUserMetadata(data),
  };

  const { error } = await client.auth.admin.updateUserById(found.id, updates);
  if (error) {
    logger.error('Gagal memperbarui user di Supabase Auth', {
      email: data.email,
      authUserId: found.id,
      error: error.message,
    });
  }
}

/**
 * Nonaktifkan user di Supabase Auth saat employee dinonaktifkan / dihapus.
 */
export async function deactivateAuthUser(email?: string | null): Promise<void> {
  if (!email) {
    return;
  }

  const client = getSupabase();
  const found = await findAuthUserByEmail(email);

  if (!found) {
    return;
  }

  const { error } = await client.auth.admin.updateUserById(found.id, {
    ban_duration: '876000 hours', // 100 tahun ~ selamanya
  });
  if (error) {
    logger.error('Gagal menonaktifkan user di Supabase Auth', {
      email,
      authUserId: found.id,
      error: error.message,
    });
  }
}

/**
 * Aktifkan kembali user di Supabase Auth saat employee diaktifkan.
 */
export async function activateAuthUser(email?: string | null): Promise<void> {
  if (!email) {
    return;
  }

  const client = getSupabase();
  const found = await findAuthUserByEmail(email);

  if (!found) {
    return;
  }

  const { error } = await client.auth.admin.updateUserById(found.id, {
    ban_duration: 'none',
  });
  if (error) {
    logger.error('Gagal mengaktifkan user di Supabase Auth', {
      email,
      authUserId: found.id,
      error: error.message,
    });
  }
}

/**
 * Hapus user di Supabase Auth saat employee dihapus dari backend.
 */
export async function deleteAuthUser(email?: string | null): Promise<void> {
  if (!email) {
    return;
  }

  const client = getSupabase();
  const found = await findAuthUserByEmail(email);

  if (!found) {
    return;
  }

  const { error } = await client.auth.admin.deleteUser(found.id);
  if (error) {
    logger.error('Gagal menghapus user di Supabase Auth', {
      email,
      authUserId: found.id,
      error: error.message,
    });
  }
}