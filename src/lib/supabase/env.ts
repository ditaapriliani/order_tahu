export function getCleanSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  let clean = raw.trim().replace(/^["']|["']$/g, '');
  // Buang path /rest/v1 atau /auth/v1 jika tidak sengaja disertakan
  clean = clean.replace(/\/rest\/v1\/?$/, '');
  clean = clean.replace(/\/auth\/v1\/?$/, '');
  // Buang trailing slash di akhir URL
  clean = clean.replace(/\/+$/, '');
  return clean;
}

export function getCleanSupabaseAnonKey(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  return raw.trim().replace(/^["']|["']$/g, '');
}
