export type UserRole = 'admin_pabrik' | 'pemilik_lapak';

export type StatusPesanan = 
  | 'menunggu_konfirmasi'
  | 'dikonfirmasi'
  | 'dikirim'
  | 'selesai'
  | 'dibatalkan';

export type MetodePengiriman = 'ambil_sendiri' | 'diantar';
export type MetodePembayaran = 'tunai' | 'transfer';

export interface User {
  id_user: string;
  username: string;
  password?: string | null;
  role: UserRole;
}

export interface Lapak {
  id_lapak: string;
  id_user: string;
  nama_lapak: string;
  alamat: string;
  status_aktif: boolean;
}

export interface Pesanan {
  id_pesanan: string;
  id_lapak: string;
  jumlah_papan: number;
  harga_satuan: number;
  total_harga: number;
  tanggal_pesanan: string;
  tanggal_pengiriman: string;
  metode_pengiriman: MetodePengiriman;
  status_pesanan: StatusPesanan;
}

export interface Pembayaran {
  id_pembayaran: string;
  id_pesanan: string;
  tanggal_pembayaran: string;
  metode_pembayaran: MetodePembayaran;
  nominal: number;
  id_admin: string;
}

// Relasi & Tipe Tampilan (Joined Data)
export interface PesananWithLapak extends Pesanan {
  lapak?: Lapak;
}

export interface PesananWithDetails extends Pesanan {
  lapak?: Lapak;
  pembayaran?: Pembayaran | null;
}
