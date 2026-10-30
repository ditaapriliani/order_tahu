'use server';

import { createClient } from '@/lib/supabase/server';
import { HARGA_TAHU_PER_PAPAN } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { MetodePengiriman, MetodePembayaran, StatusPesanan } from '@/types/database';

// Helper verifikasi admin di sisi server tepercaya
async function verifyAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { isAuthorized: false, user: null, error: 'Anda harus login terlebih dahulu.' };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id_user', user.id)
    .single();

  if (!profile || profile.role !== 'admin_pabrik') {
    return { isAuthorized: false, user, error: 'Akses ditolak: Hanya admin pabrik yang berwenang melakukan tindakan ini.' };
  }

  return { isAuthorized: true, user, error: null };
}

export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id_user', user.id)
    .single();

  return profile;
}

export async function getCurrentUserLapak() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: lapak } = await supabase
    .from('lapak')
    .select('*')
    .eq('id_user', user.id)
    .single();

  return lapak;
}

export async function createPesananAction(formData: {
  jumlah_papan: number;
  tanggal_pengiriman: string;
  metode_pengiriman: MetodePengiriman;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Anda harus login terlebih dahulu.' };
  }

  // 1. Validasi Batas Waktu Pemesanan (Maksimal pukul 20.00 WIB)
  const now = new Date();
  const wibParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const currentWibHour = parseInt(wibParts.find((p) => p.type === 'hour')?.value || '0', 10);
  const currentWibMinute = parseInt(wibParts.find((p) => p.type === 'minute')?.value || '0', 10);

  if (currentWibHour >= 20) {
    const formattedTime = `${String(currentWibHour).padStart(2, '0')}.${String(currentWibMinute).padStart(2, '0')} WIB`;
    return {
      error: `Batas waktu pemesanan tahu untuk hari ini telah ditutup pada pukul 20.00 WIB (Waktu server saat ini: ${formattedTime}). Pemesanan baru dapat dilakukan kembali besok.`,
    };
  }

  // Ambil lapak milik user yang sedang aktif
  const { data: lapak, error: lapakError } = await supabase
    .from('lapak')
    .select('id_lapak, status_aktif')
    .eq('id_user', user.id)
    .single();

  if (lapakError || !lapak) {
    return { error: 'Data lapak Anda belum terdaftar. Hubungi admin pabrik.' };
  }

  if (!lapak.status_aktif) {
    return { error: 'Lapak Anda sedang berstatus nonaktif. Pemesanan tidak dapat dilakukan.' };
  }

  if (formData.jumlah_papan <= 0) {
    return { error: 'Jumlah papan harus lebih dari 0.' };
  }

  // 2. Pencegahan Pesanan Ganda untuk Lapak dan Tanggal Pengiriman yang Sama (Kecuali yang Dibatalkan)
  const { data: existingActiveOrder } = await supabase
    .from('pesanan')
    .select('id_pesanan, status_pesanan')
    .eq('id_lapak', lapak.id_lapak)
    .eq('tanggal_pengiriman', formData.tanggal_pengiriman)
    .neq('status_pesanan', 'dibatalkan')
    .maybeSingle();

  if (existingActiveOrder) {
    return {
      error: `Lapak Anda sudah memiliki pesanan aktif untuk tanggal pengiriman ${formData.tanggal_pengiriman}. Setiap lapak hanya diperbolehkan membuat satu pesanan per tanggal pengiriman.`,
    };
  }

  const harga_satuan = HARGA_TAHU_PER_PAPAN;
  const total_harga = formData.jumlah_papan * harga_satuan;

  const { error: insertError } = await supabase.from('pesanan').insert({
    id_lapak: lapak.id_lapak,
    jumlah_papan: formData.jumlah_papan,
    harga_satuan: harga_satuan,
    total_harga: total_harga,
    tanggal_pengiriman: formData.tanggal_pengiriman,
    metode_pengiriman: formData.metode_pengiriman,
    status_pesanan: 'menunggu_konfirmasi',
  });

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath('/lapak');
  return { success: true };
}

export async function cancelPesananAction(id_pesanan: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Anda harus login terlebih dahulu.' };
  }

  // Verifikasi pesanan milik lapak pengguna yang bersangkutan
  const { data: pesanan } = await supabase
    .from('pesanan')
    .select('id_pesanan, id_lapak, status_pesanan, lapak!inner(id_user)')
    .eq('id_pesanan', id_pesanan)
    .single();

  if (!pesanan || (pesanan as any).lapak?.id_user !== user.id) {
    return { error: 'Pesanan tidak ditemukan atau bukan milik lapak Anda.' };
  }

  if (pesanan.status_pesanan !== 'menunggu_konfirmasi') {
    return { error: 'Pesanan hanya dapat dibatalkan jika masih berstatus menunggu konfirmasi.' };
  }

  const { error } = await supabase
    .from('pesanan')
    .update({ status_pesanan: 'dibatalkan' })
    .eq('id_pesanan', id_pesanan);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/lapak');
  return { success: true };
}

export async function updatePesananStatusAction(
  id_pesanan: string,
  new_status: StatusPesanan
) {
  const authCheck = await verifyAdminUser();
  if (!authCheck.isAuthorized) {
    return { error: authCheck.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('pesanan')
    .update({ status_pesanan: new_status })
    .eq('id_pesanan', id_pesanan);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function recordPembayaranAction(formData: {
  id_pesanan: string;
  nominal: number;
  metode_pembayaran: MetodePembayaran;
}) {
  const authCheck = await verifyAdminUser();
  if (!authCheck.isAuthorized) {
    return { error: authCheck.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('pembayaran').insert({
    id_pesanan: formData.id_pesanan,
    nominal: formData.nominal,
    metode_pembayaran: formData.metode_pembayaran,
    id_admin: authCheck.user!.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function toggleLapakStatusAction(
  id_lapak: string,
  new_status: boolean
) {
  const authCheck = await verifyAdminUser();
  if (!authCheck.isAuthorized) {
    return { error: authCheck.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('lapak')
    .update({ status_aktif: new_status })
    .eq('id_lapak', id_lapak);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}

export async function createLapakByAdminAction(formData: {
  id_user: string;
  nama_lapak: string;
  alamat: string;
}) {
  const authCheck = await verifyAdminUser();
  if (!authCheck.isAuthorized) {
    return { error: authCheck.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.from('lapak').insert({
    id_user: formData.id_user,
    nama_lapak: formData.nama_lapak,
    alamat: formData.alamat,
    status_aktif: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}
