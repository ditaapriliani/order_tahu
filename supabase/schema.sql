-- ============================================================================
-- SKEMA BASIS DATA: SISTEM INFORMASI PEMESANAN LAPAK PABRIK TAHU
-- Berdasarkan ERD: USER, LAPAK, PESANAN, PEMBAYARAN
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABEL: users (ENTITAS USER PADA ERD)
-- ============================================================================
-- Catatan: Kredensial autentikasi (password) dikelola secara aman oleh 
-- Supabase Auth pada auth.users (terenkripsi bcrypt/argon2). 
-- Tabel public.users tidak menyimpan plaintext maupun placeholder password.
CREATE TABLE IF NOT EXISTS public.users (
    id_user UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL CONSTRAINT username_min_length CHECK (char_length(username) >= 3),
    role VARCHAR(20) NOT NULL DEFAULT 'pemilik_lapak' 
        CONSTRAINT check_role CHECK (role IN ('admin_pabrik', 'pemilik_lapak'))
);

-- ============================================================================
-- 2. FUNGSI OTORISASI ADMIN PABRIK
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id_user = auth.uid() AND role = 'admin_pabrik'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Trigger proteksi: Pengguna dilarang menaikkan role sendiri & dilarang ubah id_user
CREATE OR REPLACE FUNCTION public.protect_user_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_is_bootstrap BOOLEAN;
BEGIN
  -- 1. id_user tidak pernah boleh diubah
  IF NEW.id_user IS DISTINCT FROM OLD.id_user THEN
    RAISE EXCEPTION 'Akses ditolak: id_user tidak dapat diubah.';
  END IF;

  -- 2. Jika role berubah, lakukan verifikasi otorisasi ketat
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Periksa apakah dipanggil dalam konteks transaksi bootstrap admin resmi
    v_is_bootstrap := COALESCE(current_setting('app.bootstrap_admin', true) = 'true', false);

    -- Izinkan jika:
    -- a) Sedang dalam proses bootstrap resmi (assign_initial_admin), ATAU
    -- b) Pemanggil adalah admin pabrik aktif (public.is_admin()), ATAU
    -- c) Dijalankan langsung oleh superuser di SQL Editor (session_user = 'postgres' dan auth.uid() IS NULL)
    IF NOT (
      v_is_bootstrap OR 
      public.is_admin() OR 
      (session_user = 'postgres' AND auth.uid() IS NULL)
    ) THEN
      RAISE EXCEPTION 'Akses ditolak: Hanya admin pabrik yang berwenang mengubah role.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_users ON public.users;
CREATE TRIGGER trg_protect_users
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_user_fields();

-- ============================================================================
-- 3. TABEL: lapak (ENTITAS LAPAK PADA ERD)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lapak (
    id_lapak UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_user UUID NOT NULL UNIQUE REFERENCES public.users(id_user) ON DELETE RESTRICT,
    nama_lapak VARCHAR(100) NOT NULL,
    alamat TEXT NOT NULL,
    status_aktif BOOLEAN DEFAULT TRUE NOT NULL
);

-- Trigger proteksi: Pemilik lapak hanya dapat dialihkan oleh admin
CREATE OR REPLACE FUNCTION public.protect_lapak_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id_user IS DISTINCT FROM OLD.id_user THEN
    IF NOT (
      public.is_admin() OR 
      (session_user = 'postgres' AND auth.uid() IS NULL) OR
      COALESCE(current_setting('app.bootstrap_admin', true) = 'true', false)
    ) THEN
      RAISE EXCEPTION 'Akses ditolak: Pemilik lapak hanya dapat dialihkan oleh admin pabrik.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_lapak_fields ON public.lapak;
CREATE TRIGGER trg_protect_lapak_fields
BEFORE UPDATE ON public.lapak
FOR EACH ROW EXECUTE FUNCTION public.protect_lapak_fields();

-- ============================================================================
-- 4. TABEL: pesanan (ENTITAS PESANAN PADA ERD)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pesanan (
    id_pesanan UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_lapak UUID NOT NULL REFERENCES public.lapak(id_lapak) ON DELETE RESTRICT,
    jumlah_papan INTEGER NOT NULL CONSTRAINT check_jumlah_papan CHECK (jumlah_papan > 0),
    harga_satuan NUMERIC(12, 2) NOT NULL CONSTRAINT check_harga_satuan CHECK (harga_satuan = 45000.00),
    total_harga NUMERIC(12, 2) NOT NULL,
    tanggal_pesanan DATE DEFAULT CURRENT_DATE NOT NULL,
    tanggal_pengiriman DATE NOT NULL,
    metode_pengiriman VARCHAR(30) NOT NULL CONSTRAINT check_metode_pengiriman CHECK (metode_pengiriman IN ('ambil_sendiri', 'diantar')),
    status_pesanan VARCHAR(30) NOT NULL DEFAULT 'menunggu_konfirmasi'
        CONSTRAINT check_status_pesanan CHECK (status_pesanan IN ('menunggu_konfirmasi', 'dikonfirmasi', 'dikirim', 'selesai', 'dibatalkan')),
    CONSTRAINT check_total_harga CHECK (total_harga = (jumlah_papan * 45000.00)),
    CONSTRAINT check_tanggal_pengiriman CHECK (tanggal_pengiriman >= tanggal_pesanan)
);

-- Trigger INSERT: Memaksa harga acuan pabrik Rp45.000, hitung total_harga, & status awal
CREATE OR REPLACE FUNCTION public.handle_pesanan_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.harga_satuan := 45000.00;
  NEW.total_harga := NEW.jumlah_papan * 45000.00;
  NEW.tanggal_pesanan := CURRENT_DATE;

  IF NOT public.is_admin() THEN
    NEW.status_pesanan := 'menunggu_konfirmasi';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_pesanan_before_insert ON public.pesanan;
CREATE TRIGGER trg_pesanan_before_insert
BEFORE INSERT ON public.pesanan
FOR EACH ROW EXECUTE FUNCTION public.handle_pesanan_insert();

-- Trigger UPDATE: Lapak HANYA boleh membatalkan pesanan jika status masih menunggu_konfirmasi
CREATE OR REPLACE FUNCTION public.handle_pesanan_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF OLD.status_pesanan <> 'menunggu_konfirmasi' OR NEW.status_pesanan <> 'dibatalkan' THEN
      RAISE EXCEPTION 'Akses ditolak: Anda hanya dapat membatalkan pesanan yang masih berstatus menunggu_konfirmasi.';
    END IF;

    -- Bekukan kolom transaksi agar tidak dimanipulasi saat pembatalan
    IF NEW.jumlah_papan IS DISTINCT FROM OLD.jumlah_papan OR
       NEW.harga_satuan IS DISTINCT FROM OLD.harga_satuan OR
       NEW.total_harga IS DISTINCT FROM OLD.total_harga OR
       NEW.id_lapak IS DISTINCT FROM OLD.id_lapak OR
       NEW.tanggal_pengiriman IS DISTINCT FROM OLD.tanggal_pengiriman OR
       NEW.metode_pengiriman IS DISTINCT FROM OLD.metode_pengiriman OR
       NEW.tanggal_pesanan IS DISTINCT FROM OLD.tanggal_pesanan THEN
      RAISE EXCEPTION 'Akses ditolak: Rincian pesanan tidak dapat diubah saat pembatalan.';
    END IF;
  ELSE
    -- Admin dilarang mengubah pesanan yang sudah selesai atau dibatalkan
    IF OLD.status_pesanan IN ('selesai', 'dibatalkan') AND NEW.status_pesanan <> OLD.status_pesanan THEN
      RAISE EXCEPTION 'Akses ditolak: Pesanan yang sudah selesai atau dibatalkan bersifat final.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_pesanan_before_update ON public.pesanan;
CREATE TRIGGER trg_pesanan_before_update
BEFORE UPDATE ON public.pesanan
FOR EACH ROW EXECUTE FUNCTION public.handle_pesanan_update();

-- ============================================================================
-- 5. TABEL: pembayaran (ENTITAS PEMBAYARAN PADA ERD)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pembayaran (
    id_pembayaran UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pesanan UUID NOT NULL UNIQUE REFERENCES public.pesanan(id_pesanan) ON DELETE RESTRICT,
    tanggal_pembayaran TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    metode_pembayaran VARCHAR(20) NOT NULL CONSTRAINT check_metode_bayar CHECK (metode_pembayaran IN ('tunai', 'transfer')),
    nominal NUMERIC(12, 2) NOT NULL CONSTRAINT check_nominal CHECK (nominal > 0),
    id_admin UUID NOT NULL REFERENCES public.users(id_user) ON DELETE RESTRICT
);

-- Trigger INSERT: Validasi status 'dikirim', lunas 100%, dan transisi status 'selesai' secara atomik
CREATE OR REPLACE FUNCTION public.handle_pembayaran_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_pesanan RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya admin pabrik yang berwenang mencatat pembayaran.';
  END IF;

  NEW.id_admin := auth.uid();

  -- Kunci baris pesanan untuk mencegah race condition
  SELECT status_pesanan, total_harga INTO v_pesanan
  FROM public.pesanan
  WHERE id_pesanan = NEW.id_pesanan
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan dengan ID tersebut tidak ditemukan.';
  END IF;

  -- Pembayaran hanya dapat dicatat jika pesanan sudah dikirim
  IF v_pesanan.status_pesanan <> 'dikirim' THEN
    RAISE EXCEPTION 'Pembayaran hanya dapat dicatat jika status pesanan adalah dikirim (status saat ini: %).', v_pesanan.status_pesanan;
  END IF;

  -- Wajib lunas 100%
  IF NEW.nominal <> v_pesanan.total_harga THEN
    RAISE EXCEPTION 'Nominal pembayaran (Rp %) harus sama persis dengan total pesanan (Rp %). Pembayaran wajib lunas 100%%.', 
      NEW.nominal, v_pesanan.total_harga;
  END IF;

  -- Pembaruan atomik: pesanan langsung menjadi 'selesai'
  UPDATE public.pesanan
  SET status_pesanan = 'selesai'
  WHERE id_pesanan = NEW.id_pesanan;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_pembayaran_before_insert ON public.pembayaran;
CREATE TRIGGER trg_pembayaran_before_insert
BEFORE INSERT ON public.pembayaran
FOR EACH ROW EXECUTE FUNCTION public.handle_pembayaran_insert();

-- Proteksi Immutability: Pembayaran tidak boleh diubah atau dihapus
CREATE OR REPLACE FUNCTION public.prevent_pembayaran_mod()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Catatan pembayaran bersifat permanen (immutable) dan tidak dapat diubah atau dihapus demi integritas audit.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_pembayaran_update ON public.pembayaran;
CREATE TRIGGER trg_prevent_pembayaran_update
BEFORE UPDATE ON public.pembayaran
FOR EACH ROW EXECUTE FUNCTION public.prevent_pembayaran_mod();

DROP TRIGGER IF EXISTS trg_prevent_pembayaran_delete ON public.pembayaran;
CREATE TRIGGER trg_prevent_pembayaran_delete
BEFORE DELETE ON public.pembayaran
FOR EACH ROW EXECUTE FUNCTION public.prevent_pembayaran_mod();

-- ============================================================================
-- 6. KEBIJAKAN ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- A. RLS: USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
FOR SELECT USING (id_user = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
FOR UPDATE USING (id_user = auth.uid() OR public.is_admin())
WITH CHECK (id_user = auth.uid() OR public.is_admin());

-- B. RLS: LAPAK
ALTER TABLE public.lapak ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lapak_select" ON public.lapak;
CREATE POLICY "lapak_select" ON public.lapak
FOR SELECT USING (id_user = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "lapak_admin_manage" ON public.lapak;
CREATE POLICY "lapak_admin_manage" ON public.lapak
FOR ALL USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "lapak_insert_own" ON public.lapak;
CREATE POLICY "lapak_insert_own" ON public.lapak
FOR INSERT WITH CHECK (id_user = auth.uid());

-- C. RLS: PESANAN
ALTER TABLE public.pesanan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pesanan_select" ON public.pesanan;
CREATE POLICY "pesanan_select" ON public.pesanan
FOR SELECT USING (
    public.is_admin() OR 
    id_lapak IN (SELECT id_lapak FROM public.lapak WHERE id_user = auth.uid())
);

DROP POLICY IF EXISTS "pesanan_insert" ON public.pesanan;
CREATE POLICY "pesanan_insert" ON public.pesanan
FOR INSERT WITH CHECK (
    public.is_admin() OR
    id_lapak IN (SELECT id_lapak FROM public.lapak WHERE id_user = auth.uid() AND status_aktif = true)
);

DROP POLICY IF EXISTS "pesanan_update" ON public.pesanan;
CREATE POLICY "pesanan_update" ON public.pesanan
FOR UPDATE USING (
    public.is_admin() OR 
    id_lapak IN (SELECT id_lapak FROM public.lapak WHERE id_user = auth.uid())
) WITH CHECK (
    public.is_admin() OR 
    id_lapak IN (SELECT id_lapak FROM public.lapak WHERE id_user = auth.uid())
);

-- D. RLS: PEMBAYARAN
ALTER TABLE public.pembayaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pembayaran_select" ON public.pembayaran;
CREATE POLICY "pembayaran_select" ON public.pembayaran
FOR SELECT USING (
    public.is_admin() OR 
    id_pesanan IN (
        SELECT p.id_pesanan FROM public.pesanan p
        JOIN public.lapak l ON p.id_lapak = l.id_lapak
        WHERE l.id_user = auth.uid()
    )
);

DROP POLICY IF EXISTS "pembayaran_insert_admin" ON public.pembayaran;
CREATE POLICY "pembayaran_insert_admin" ON public.pembayaran
FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================================
-- 7. SINKRONISASI REGISTRASI SUPABASE AUTH KE USERS & LAPAK
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_role TEXT;
  v_nama_lapak TEXT;
  v_alamat TEXT;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));

  -- Menghindari error jika prefix email/username identik
  IF EXISTS (SELECT 1 FROM public.users WHERE username = v_username) THEN
    v_username := v_username || '_' || substring(NEW.id::text, 1, 4);
  END IF;

  -- Keamanan Role: raw_app_meta_data HANYA dapat diset melalui Service Role / SQL / Admin API.
  -- Pendaftaran reguler dari web (client-side signUp) hanya bisa mengirim raw_user_meta_data,
  -- sehingga role selalu default menjadi 'pemilik_lapak'.
  IF (NEW.raw_app_meta_data->>'role') = 'admin_pabrik' THEN
    v_role := 'admin_pabrik';
  ELSE
    v_role := 'pemilik_lapak';
  END IF;

  INSERT INTO public.users (id_user, username, role)
  VALUES (
    NEW.id,
    v_username,
    v_role
  )
  ON CONFLICT (id_user) DO NOTHING;

  -- Entitas lapak HANYA dibuat untuk role 'pemilik_lapak' jika metadata lapak disertakan
  v_nama_lapak := NULLIF(TRIM(NEW.raw_user_meta_data->>'nama_lapak'), '');
  v_alamat := NULLIF(TRIM(NEW.raw_user_meta_data->>'alamat'), '');

  IF v_role = 'pemilik_lapak' AND v_nama_lapak IS NOT NULL AND v_alamat IS NOT NULL THEN
    INSERT INTO public.lapak (id_user, nama_lapak, alamat, status_aktif)
    VALUES (
      NEW.id,
      v_nama_lapak,
      v_alamat,
      true
    )
    ON CONFLICT (id_user) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 8. FUNGSI INISIALISASI ADMIN PERTAMA SECARA AMAN (HANYA SQL EDITOR)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.assign_initial_admin(admin_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_username TEXT;
BEGIN
  -- 1. Validasi parameter input
  IF admin_email IS NULL OR TRIM(admin_email) = '' THEN
    RAISE EXCEPTION 'Email admin tidak boleh kosong.';
  END IF;

  -- 2. Cari akun di auth.users (case-insensitive & trim)
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE lower(email) = lower(trim(admin_email));

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Pengguna dengan email "%" belum terdaftar di Supabase Auth (auth.users). Tambahkan user terlebih dahulu via Supabase Auth (Authentication > Users > Add user).', trim(admin_email);
  END IF;

  v_username := split_part(trim(admin_email), '@', 1);

  -- 3. Cegah bentrok username jika sudah digunakan user lain
  IF EXISTS (SELECT 1 FROM public.users WHERE username = v_username AND id_user <> v_user_id) THEN
    v_username := v_username || '_' || substring(v_user_id::text, 1, 4);
  END IF;

  -- 4. Pasang flag bootstrap lokal dalam transaksi (mengizinkan pembaruan role oleh trigger guard)
  PERFORM set_config('app.bootstrap_admin', 'true', true);

  -- 5. Buat atau perbarui profil admin pada public.users tanpa menghapus data lapak/transaksi apapun
  INSERT INTO public.users (id_user, username, role)
  VALUES (
    v_user_id,
    v_username,
    'admin_pabrik'
  )
  ON CONFLICT (id_user) DO UPDATE 
  SET role = 'admin_pabrik';

  -- 6. Sinkronkan raw_app_meta_data di auth.users agar role juga tercermin pada Auth metadata
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin_pabrik')
  WHERE id = v_user_id;

  -- 7. Reset flag bootstrap
  PERFORM set_config('app.bootstrap_admin', 'false', true);

  RETURN 'Sukses: Akun ' || trim(admin_email) || ' berhasil diangkat menjadi admin_pabrik.';
END;
$$;

-- Cabut seluruh akses eksekusi dari klien luar (anon dan authenticated)
-- Fungsi ini HANYA bisa dijalankan oleh superuser / SQL Editor / service_role
REVOKE EXECUTE ON FUNCTION public.assign_initial_admin(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_initial_admin(TEXT) TO service_role;
