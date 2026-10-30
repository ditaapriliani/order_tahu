import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import AdminDashboardClient from './AdminDashboardClient';
import { User, Lapak, PesananWithLapak } from '@/types/database';

export const instant = false;

export default async function AdminPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Ambil profil user & verifikasi status admin pabrik
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id_user', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login?error=profile_not_found');
  }

  if (profile.role !== 'admin_pabrik') {
    redirect('/lapak');
  }

  // 2. Ambil seluruh pesanan beserta informasi lapak
  const { data: pesananData } = await supabase
    .from('pesanan')
    .select('*, lapak(*)')
    .order('tanggal_pesanan', { ascending: false });

  // 3. Ambil seluruh data cabang lapak beserta user pemiliknya
  const { data: lapakData } = await supabase
    .from('lapak')
    .select('*, users(*)');

  // 4. Ambil user pemilik_lapak yang belum memiliki lapak (untuk pembuatan lapak oleh admin)
  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'pemilik_lapak');

  const assignedUserIds = new Set((lapakData || []).map((l: any) => l.id_user));
  const userListWithoutLapak = (allUsers || []).filter(
    (u: any) => !assignedUserIds.has(u.id_user)
  );

  return (
    <AdminDashboardClient
      user={profile as User}
      pesananList={(pesananData || []) as PesananWithLapak[]}
      lapakList={(lapakData || []) as (Lapak & { users?: User })[]}
      userListWithoutLapak={(userListWithoutLapak || []) as User[]}
    />
  );
}
