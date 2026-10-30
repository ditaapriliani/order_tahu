-- ============================================================================
-- MIGRASI BASIS DATA: PENCEGAHAN PESANAN GANDA (ANTI-DUPLICATE ORDERS)
-- Pabrik Tahu Sumedang Teh Uci
-- ============================================================================
-- Aturan Bisnis & Masa Berlaku:
-- 1. Mulai tanggal pengiriman 2026-10-30 ke depan, setiap cabang lapak hanya
--    diperbolehkan memiliki maksimal 1 pesanan aktif per tanggal pengiriman.
-- 2. Transaksi historis sebelum tanggal 2026-10-30 (termasuk pesanan selesai &
--    lunas pada 2026-10-29) tetap dipertahankan utuh demi integritas audit & akuntansi.
-- 3. Pesanan yang berstatus 'dibatalkan' dikecualikan dari index, sehingga lapak
--    tetap dapat membuat pesanan ulang jika pesanan sebelumnya telah dibatalkan.
-- ============================================================================

-- LANGKAH 1: PENGECEKAN PRA-MIGRASI (AUDIT DATA EKSIS >= 2026-10-30)
-- Jalankan kueri berikut di Supabase SQL Editor.
-- Jika hasil kueri ini KOSONG (0 rows), basis data dipastikan bersih dan aman
-- untuk menerapkan partial unique index tanpa risiko error.

SELECT 
    id_lapak, 
    tanggal_pengiriman, 
    COUNT(*) AS total_pesanan_aktif,
    array_agg(id_pesanan) AS daftar_id_pesanan,
    array_agg(status_pesanan) AS daftar_status
FROM public.pesanan
WHERE status_pesanan <> 'dibatalkan'
  AND tanggal_pengiriman >= '2026-10-30'
GROUP BY id_lapak, tanggal_pengiriman
HAVING COUNT(*) > 1;

-- ============================================================================
-- LANGKAH 2: PENERAPAN PARTIAL UNIQUE INDEX (MULAI TANGGAL 2026-10-30)
-- ============================================================================
-- Index unik parsial ini hanya mengikat baris yang memenuhi:
-- 1. status_pesanan <> 'dibatalkan'
-- 2. tanggal_pengiriman >= '2026-10-30'
-- Dengan demikian, data historis sebelum 2026-10-30 tidak terdampak.

CREATE UNIQUE INDEX IF NOT EXISTS uq_pesanan_lapak_tanggal_aktif 
ON public.pesanan (id_lapak, tanggal_pengiriman) 
WHERE status_pesanan <> 'dibatalkan'
  AND tanggal_pengiriman >= '2026-10-30';

-- ============================================================================
-- LANGKAH 3: VERIFIKASI KEBERADAAN DAN DEFINISI INDEX
-- ============================================================================
-- Jalankan kueri berikut untuk memastikan index telah aktif terdaftar di PostgreSQL:

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'pesanan' AND indexname = 'uq_pesanan_lapak_tanggal_aktif';

-- ============================================================================
-- INSTRUKSI ROLLBACK (JIKA DIBUTUHKAN DI KEMUDIAN HARI)
-- ============================================================================
-- DROP INDEX IF EXISTS public.uq_pesanan_lapak_tanggal_aktif;
