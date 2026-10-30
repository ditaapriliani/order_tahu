import { createBrowserClient } from '@supabase/ssr';
import { getCleanSupabaseUrl, getCleanSupabaseAnonKey } from './env';

export function createClient() {
  const url = getCleanSupabaseUrl();
  const key = getCleanSupabaseAnonKey();

  return createBrowserClient(url, key);
}
