import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCleanSupabaseUrl, getCleanSupabaseAnonKey } from './env';

export async function createClient() {
  const cookieStore = await cookies();
  const url = getCleanSupabaseUrl();
  const key = getCleanSupabaseAnonKey();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
        }
      },
    },
  });
}
