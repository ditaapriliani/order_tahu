'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Factory,
  Store,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AuthSliderClientProps {
  initialMode?: 'login' | 'register';
}

function AuthSliderForm({ initialMode = 'login' }: AuthSliderClientProps) {
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Mode: false = Sign In, true = Sign Up
  const [isSignUp, setIsSignUp] = useState<boolean>(initialMode === 'register');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regNamaLapak, setRegNamaLapak] = useState('');
  const [regAlamat, setRegAlamat] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Periksa parameter error dari redirect Server Component
  useEffect(() => {
    const errParam = searchParams.get('error');
    if (errParam === 'profile_not_found') {
      setLoginError(
        'Akun terautentikasi, namun data profil pengguna belum terdaftar di basis data. Silakan hubungi admin pabrik.'
      );
    }
  }, [searchParams]);

  // Cek apakah user sudah memiliki sesi aktif saat membuka form
  useEffect(() => {
    let isMounted = true;
    const checkActiveSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && isMounted) {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id_user', user.id)
            .maybeSingle();

          if (profile?.role === 'admin_pabrik') {
            window.location.href = '/admin';
          } else if (profile?.role === 'pemilik_lapak') {
            window.location.href = '/lapak';
          }
        }
      } catch {
        // Abaikan error pada silent check
      }
    };

    checkActiveSession();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Handle Switch Mode & sync browser URL tanpa refresh
  const toggleMode = (signUpMode: boolean) => {
    setIsSignUp(signUpMode);
    setLoginError(null);
    setRegError(null);
    if (typeof window !== 'undefined') {
      const targetUrl = signUpMode ? '/register' : '/login';
      window.history.replaceState(null, '', targetUrl);
    }
  };

  // 1. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPassword = loginPassword.trim();

    if (!cleanEmail) {
      setLoginError('Alamat email wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setLoginError('Format email tidak valid (contoh: nama@domain.com).');
      return;
    }

    if (!cleanPassword) {
      setLoginError('Kata sandi wajib diisi.');
      return;
    }

    if (cleanPassword.length < 6) {
      setLoginError('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoginLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setLoginError('Email atau kata sandi tidak cocok. Silakan periksa kembali.');
        } else if (error.message.includes('Email not confirmed')) {
          setLoginError(
            'Email Anda belum dikonfirmasi. Pastikan Anda telah mengonfirmasi email atau nonaktifkan "Confirm email" di Supabase Dashboard.'
          );
        } else {
          setLoginError(error.message || 'Gagal masuk ke sistem. Silakan coba beberapa saat lagi.');
        }
        setLoginLoading(false);
        return;
      }

      if (!data.user) {
        setLoginError('Data pengguna tidak ditemukan setelah autentikasi.');
        setLoginLoading(false);
        return;
      }

      // Ambil role pengguna dari public.users
      const { data: profile, error: profileErr } = await supabase
        .from('users')
        .select('role, username')
        .eq('id_user', data.user.id)
        .maybeSingle();

      if (profileErr) {
        setLoginError(`Gagal memuat profil: ${profileErr.message}`);
        setLoginLoading(false);
        return;
      }

      if (!profile) {
        setLoginError(
          'Akun berhasil diautentikasi, namun belum memiliki profil di sistem pabrik. Silakan hubungi admin.'
        );
        setLoginLoading(false);
        return;
      }

      // Redirect sesuai role
      if (profile.role === 'admin_pabrik') {
        setLoginSuccess(`Selamat datang, Admin ${profile.username}! Mengalihkan...`);
        window.location.href = '/admin';
      } else {
        setLoginSuccess(`Selamat datang, ${profile.username}! Mengalihkan ke Lapak...`);
        window.location.href = '/lapak';
      }
    } catch (err: any) {
      setLoginError(err.message || 'Terjadi kesalahan sistem saat proses masuk.');
      setLoginLoading(false);
    }
  };

  // 2. Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanUsername = regUsername.trim();
    const cleanNamaLapak = regNamaLapak.trim();
    const cleanAlamat = regAlamat.trim();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      setRegError('Format email tidak valid (contoh: nama@domain.com).');
      setRegLoading(false);
      return;
    }

    if (cleanUsername.length < 3) {
      setRegError('Username akun minimal 3 karakter.');
      setRegLoading(false);
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Kata sandi harus minimal 6 karakter.');
      setRegLoading(false);
      return;
    }

    if (!cleanNamaLapak) {
      setRegError('Nama cabang lapak wajib diisi.');
      setRegLoading(false);
      return;
    }

    if (!cleanAlamat) {
      setRegError('Alamat lengkap pengiriman lapak wajib diisi.');
      setRegLoading(false);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: regPassword,
        options: {
          data: {
            username: cleanUsername,
            nama_lapak: cleanNamaLapak,
            alamat: cleanAlamat,
          },
        },
      });

      if (authError) {
        if (
          authError.message.includes('rate limit') ||
          (authError as any).code === 'over_email_send_rate_limit'
        ) {
          setRegError(
            'Batas pengiriman email Supabase tercapai. Harap nonaktifkan "Confirm email" di Supabase Dashboard agar registrasi langsung aktif.'
          );
        } else if (
          authError.message.includes('invalid') ||
          (authError as any).code === 'email_address_invalid'
        ) {
          setRegError('Format email ditolak oleh server autentikasi.');
        } else if (
          authError.message.includes('already registered') ||
          authError.message.includes('User already registered')
        ) {
          setRegError('Alamat email ini sudah terdaftar. Silakan geser ke panel Masuk.');
        } else {
          setRegError(authError.message || 'Gagal mendaftar. Silakan coba kembali.');
        }
        setRegLoading(false);
        return;
      }

      setRegLoading(false);
      setRegSuccess(
        'Pendaftaran berhasil! Akun lapak Anda telah terdaftar. Mengalihkan ke formulir Masuk...'
      );
      setLoginEmail(cleanEmail);
      setTimeout(() => {
        toggleMode(false);
        setLoginSuccess('Silakan masukkan kata sandi untuk masuk ke akun lapak Anda.');
      }, 1500);
    } catch (err: any) {
      setRegError(err.message || 'Terjadi kesalahan sistem saat pendaftaran.');
      setRegLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[740px] relative">
      {/* Mobile Switch Tabs (< lg) */}
      <div className="lg:hidden flex justify-center mb-3">
        <div className="bg-white/10 p-1 rounded-xl backdrop-blur-md border border-white/10 flex space-x-1">
          <button
            type="button"
            onClick={() => toggleMode(false)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              !isSignUp ? 'bg-red-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            Masuk (Sign In)
          </button>
          <button
            type="button"
            onClick={() => toggleMode(true)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              isSignUp ? 'bg-red-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
            }`}
          >
            Daftar Lapak (Sign Up)
          </button>
        </div>
      </div>

      {/* Main Sliding Card Container - Absolute Two-Panel Structure */}
      <div className="relative w-full lg:h-[460px] min-h-[460px] bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* ============================================================== */}
        {/* PANEL KIRI: FORMULIR SIGN IN (Absolute Left 50%)              */}
        {/* ============================================================== */}
        <div
          className={`absolute top-0 left-0 w-full lg:w-1/2 h-full p-6 sm:p-8 flex flex-col justify-center transition-all duration-700 ease-in-out ${
            isSignUp
              ? 'opacity-0 pointer-events-none z-0'
              : 'opacity-100 z-10 pointer-events-auto'
          }`}
        >
          {/* Header Form */}
          <div className="text-center mb-5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Masuk ke Sistem
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Admin Pabrik atau Pemilik Lapak
            </p>
          </div>

          {/* Error & Success Messages */}
          {loginError && (
            <div className="mb-3 rounded-lg bg-rose-50 px-2.5 py-1.5 border border-rose-200 flex items-start space-x-1.5 text-rose-700 text-xs animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
              <span className="font-semibold text-[11px] leading-tight">{loginError}</span>
            </div>
          )}

          {loginSuccess && (
            <div className="mb-3 rounded-lg bg-emerald-50 px-2.5 py-1.5 border border-emerald-200 flex items-start space-x-1.5 text-emerald-800 text-xs animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
              <span className="font-semibold text-[11px] leading-tight">{loginSuccess}</span>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleLogin} className="space-y-3" noValidate>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Alamat Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                disabled={loginLoading}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@pabrik.com / lapak@gmail.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60 transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={loginLoading}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60 transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-60 transition shadow-xs flex items-center justify-center cursor-pointer"
              >
                {loginLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    Memverifikasi...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <LogIn className="w-4 h-4 mr-1.5" />
                    Masuk ke Sistem
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Footer Mobile Helper */}
          <div className="mt-3 pt-2 border-t border-slate-100 text-center lg:hidden text-[11px] text-slate-500">
            Belum punya akun lapak?{' '}
            <button
              type="button"
              onClick={() => toggleMode(true)}
              className="font-bold text-red-600 hover:underline cursor-pointer"
            >
              Daftar di Sini
            </button>
          </div>

          <div className="hidden lg:flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[10px] text-slate-400">
            <span className="flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1 text-slate-400" />
              Keamanan Terenkripsi
            </span>
            <span>Pabrik Tahu &copy; 2026</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PANEL KANAN: FORMULIR SIGN UP (Absolute Right 50%)             */}
        {/* ============================================================== */}
        <div
          className={`absolute top-0 right-0 w-full lg:w-1/2 h-full p-5 sm:p-7 flex flex-col justify-center transition-all duration-700 ease-in-out ${
            !isSignUp
              ? 'opacity-0 pointer-events-none z-0'
              : 'opacity-100 z-10 pointer-events-auto'
          }`}
        >
          {/* Header Form */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
              Registrasi Lapak Cabang
            </h2>
            <p className="text-[11px] text-slate-500 mt-1">
              Lengkapi data kios untuk mulai memesan tahu
            </p>
          </div>

          {/* Error & Success Messages */}
          {regError && (
            <div className="mb-2.5 rounded-lg bg-rose-50 px-2.5 py-1 border border-rose-200 flex items-start space-x-1.5 text-rose-700 text-[11px] animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
              <span className="font-semibold leading-tight">{regError}</span>
            </div>
          )}

          {regSuccess && (
            <div className="mb-2.5 rounded-lg bg-emerald-50 px-2.5 py-1 border border-emerald-200 flex items-start space-x-1.5 text-emerald-800 text-[11px] animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
              <span className="font-semibold leading-tight">{regSuccess}</span>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleRegister} className="space-y-2" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Username
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  disabled={regLoading}
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="lapak_pasar1"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60 transition shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  disabled={regLoading}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="lapak@gmail.com"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60 transition shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  disabled={regLoading}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-2.5 py-1.5 pr-8 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60 transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                Nama Cabang Lapak
              </label>
              <input
                type="text"
                required
                disabled={regLoading}
                value={regNamaLapak}
                onChange={(e) => setRegNamaLapak(e.target.value)}
                placeholder="Contoh: Lapak Tahu Pasar Wage Kios 12"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60 transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-0.5">
                Alamat Kios Pengiriman
              </label>
              <input
                type="text"
                required
                disabled={regLoading}
                value={regAlamat}
                onChange={(e) => setRegAlamat(e.target.value)}
                placeholder="Jl. Raya Pasar Barat Blok B..."
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60 transition shadow-2xs"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-2 px-4 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-60 transition shadow-xs flex items-center justify-center cursor-pointer"
              >
                {regLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Mendaftarkan...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Daftarkan Akun & Lapak
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* Footer Mobile Helper */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-center lg:hidden text-[11px] text-slate-500">
            Sudah memiliki akun?{' '}
            <button
              type="button"
              onClick={() => toggleMode(false)}
              className="font-bold text-red-600 hover:underline cursor-pointer"
            >
              Masuk di Sini
            </button>
          </div>

          <div className="hidden lg:flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-400">
            <span>Satu Akun = Satu Cabang</span>
            <span>Mitra Distribusi Resmi</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* OVERLAY PANEL MERAH SLIDING HORIZONTAL (DESKTOP >= LG)         */}
        {/* Meluncur antara sisi kiri (z-20) dan sisi kanan (z-20)         */}
        {/* ============================================================== */}
        <div
          className={`hidden lg:block absolute top-0 left-0 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-20 shadow-xl ${
            isSignUp ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Latar Belakang Merah Solid & Gradasi */}
          <div
            className={`relative -left-full h-full w-[200%] bg-gradient-to-br from-red-600 via-red-600 to-red-700 text-white transition-transform duration-700 ease-in-out ${
              isSignUp ? 'translate-x-1/2' : 'translate-x-0'
            }`}
          >
            {/* SISI KIRI OVERLAY (Aktif saat mode Register, menawarkan Masuk ke Akun) */}
            <div className="absolute top-0 left-0 w-1/2 h-full flex flex-col justify-center items-center text-center p-6 sm:p-8">
              <div className="w-14 h-14 rounded-full bg-white p-0.5 flex items-center justify-center mb-3 shadow-md ring-4 ring-white/20 overflow-hidden">
                <img
                  src="/logo.jpg"
                  alt="Logo Tahu Sumedang Teh Uci"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                Sudah Punya Akun?
              </h2>

              <p className="text-xs text-red-100/90 leading-relaxed mb-6 max-w-[240px]">
                Silakan masuk menggunakan kredensial yang telah terdaftar untuk mengelola pesanan tahu.
              </p>

              <button
                type="button"
                onClick={() => toggleMode(false)}
                className="px-7 py-2 rounded-full border-2 border-white text-white font-extrabold text-xs uppercase tracking-wider hover:bg-white hover:text-red-600 active:scale-95 transition-all duration-200 shadow-md cursor-pointer"
              >
                MASUK KE SISTEM
              </button>
            </div>

            {/* SISI KANAN OVERLAY (Aktif saat mode Login, menawarkan Daftar Lapak) */}
            <div className="absolute top-0 right-0 w-1/2 h-full flex flex-col justify-center items-center text-center p-6 sm:p-8">
              <div className="w-14 h-14 rounded-full bg-white p-0.5 flex items-center justify-center mb-3 shadow-md ring-4 ring-white/20 overflow-hidden">
                <img
                  src="/logo.jpg"
                  alt="Logo Tahu Sumedang Teh Uci"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                Halo, Mitra Lapak!
              </h2>

              <p className="text-xs text-red-100/90 leading-relaxed mb-6 max-w-[240px]">
                Belum memiliki akun lapak terdaftar? Daftarkan kios cabang Anda untuk mulai memesan tahu harian pabrik.
              </p>

              <button
                type="button"
                onClick={() => toggleMode(true)}
                className="px-7 py-2 rounded-full border-2 border-white text-white font-extrabold text-xs uppercase tracking-wider hover:bg-white hover:text-red-600 active:scale-95 transition-all duration-200 shadow-md cursor-pointer"
              >
                DAFTAR LAPAK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthSliderClient({ initialMode = 'login' }: AuthSliderClientProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-sm bg-white py-10 px-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
          <Loader2 className="w-7 h-7 text-red-600 animate-spin mb-2.5" />
          <p className="text-xs text-slate-500 font-medium">Memuat sistem autentikasi...</p>
        </div>
      }
    >
      <AuthSliderForm initialMode={initialMode} />
    </Suspense>
  );
}
