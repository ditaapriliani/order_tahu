import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import LapakDashboardClient from './LapakDashboardClient';
import { User, Lapak, PesananWithDetails } from '@/types/database';

export const instant = false;

export default async function LapakPage() {
  await connection();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Ambil profil user
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id_user', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/login?error=profile_not_found');
  }

  if (profile.role === 'admin_pabrik') {
    redirect('/admin');
  }

  // 2. Ambil data lapak milik user
  const { data: lapak } = await supabase
    .from('lapak')
    .select('*')
    .eq('id_user', user.id)
    .single();

  // 3. Ambil riwayat pesanan lapak beserta relasi pembayaran (RLS membatasi hanya lapak milik user)
  let pesananList: PesananWithDetails[] = [];
  if (lapak) {
    const { data: pesananData } = await supabase
      .from('pesanan')
      .select('*, pembayaran(*)')
      .eq('id_lapak', lapak.id_lapak)
      .order('tanggal_pesanan', { ascending: false });

    if (pesananData) {
      pesananList = (pesananData as any[]).map((p) => ({
        ...p,
        pembayaran: Array.isArray(p.pembayaran) ? (p.pembayaran[0] || null) : (p.pembayaran || null),
      }));
    }
  }

  return (
    <LapakDashboardClient
      user={profile as User}
      lapak={lapak as Lapak | null}
      pesananList={pesananList}
    />
  );
}
