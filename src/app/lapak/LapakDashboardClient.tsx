'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lapak, PesananWithDetails, MetodePengiriman } from '@/types/database';
import { createPesananAction, cancelPesananAction } from '@/app/actions';
import { HARGA_TAHU_PER_PAPAN } from '@/lib/constants';
import { exportPesananToPDF, exportPembayaranToPDF } from '@/lib/pdf';
import { AppSidebar, NavItem } from '@/components/ui/AppSidebar';
import { OverviewCard } from '@/components/ui/OverviewCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SuccessModal } from '@/components/ui/SuccessModal';
import {
  Store,
  PackagePlus,
  History,
  FileDown,
  Clock,
  TrendingUp,
  Package,
  ShieldCheck,
  AlertCircle,
  CheckCheck,
  Loader2,
  Calendar,
  Truck,
  ArrowRight,
  Menu,
  MapPin,
  Building2,
  Sparkles,
  Info,
  CheckCircle2,
  HelpCircle,
  CreditCard,
} from 'lucide-react';

interface Props {
  user: User;
  lapak: Lapak | null;
  pesananList: PesananWithDetails[];
}

export default function LapakDashboardClient({ user, lapak, pesananList }: Props) {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<'pesan' | 'riwayat' | 'pembayaran' | 'profil'>('pesan');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Form State
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [jumlahPapan, setJumlahPapan] = useState<number>(10);
  const [tanggalPengiriman, setTanggalPengiriman] = useState<string>(defaultDate);
  const [metodePengiriman, setMetodePengiriman] = useState<MetodePengiriman>('diantar');

  // Filter & Status
  const [historyFilter, setHistoryFilter] = useState<'semua' | 'aktif' | 'selesai'>('semua');
  const [paymentFilter, setPaymentFilter] = useState<'semua' | 'tunai' | 'transfer'>('semua');
  const [loading, setLoading] = useState(false);
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    badgeInfo?: string;
  } | null>(null);

  // Batas Waktu Pemesanan 20.00 WIB
  const [currentTimeWIB, setCurrentTimeWIB] = useState<string>('');
  const [isCutoffPassed, setIsCutoffPassed] = useState<boolean>(false);

  useEffect(() => {
    const checkWIB = () => {
      try {
        const now = new Date();
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Jakarta',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        }).formatToParts(now);
        const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
        const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
        setIsCutoffPassed(h >= 20);
        setCurrentTimeWIB(`${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')} WIB`);
      } catch {
        const h = new Date().getHours();
        setIsCutoffPassed(h >= 20);
      }
    };
    checkWIB();
    const interval = setInterval(checkWIB, 20000);
    return () => clearInterval(interval);
  }, []);

  // Deteksi Pesanan Ganda Aktif pada Tanggal Pengiriman yang Sama
  const duplicateActiveOrder = pesananList.find(
    (p) => p.tanggal_pengiriman === tanggalPengiriman && p.status_pesanan !== 'dibatalkan'
  );

  // Kalkulasi Harga Acuan
  const totalHarga = Math.max(0, jumlahPapan) * HARGA_TAHU_PER_PAPAN;

  // Statistik Lapak
  const totalOrders = pesananList.length;
  const activeOrders = pesananList.filter(
    (p) =>
      p.status_pesanan === 'menunggu_konfirmasi' ||
      p.status_pesanan === 'dikonfirmasi' ||
      p.status_pesanan === 'dikirim'
  ).length;
  const completedOrders = pesananList.filter((p) => p.status_pesanan === 'selesai');
  const totalBelanjaLunas = completedOrders.reduce((sum, p) => sum + Number(p.total_harga), 0);
  const totalPapanDiterima = completedOrders.reduce((sum, p) => sum + Number(p.jumlah_papan), 0);

  // Data Pembayaran Lapak (100% terisolasi milik lapak ini)
  const completedOrdersWithPayment = pesananList.filter(
    (p) => p.pembayaran || p.status_pesanan === 'selesai'
  );

  const totalPembayaranTunai = completedOrdersWithPayment
    .filter((p) => (p.pembayaran?.metode_pembayaran || 'tunai') === 'tunai')
    .reduce((sum, p) => sum + Number(p.pembayaran?.nominal || p.total_harga), 0);
  const countPembayaranTunai = completedOrdersWithPayment.filter(
    (p) => (p.pembayaran?.metode_pembayaran || 'tunai') === 'tunai'
  ).length;

  const totalPembayaranTransfer = completedOrdersWithPayment
    .filter((p) => p.pembayaran?.metode_pembayaran === 'transfer')
    .reduce((sum, p) => sum + Number(p.pembayaran?.nominal || p.total_harga), 0);
  const countPembayaranTransfer = completedOrdersWithPayment.filter(
    (p) => p.pembayaran?.metode_pembayaran === 'transfer'
  ).length;

  const filteredPayments = completedOrdersWithPayment.filter((p) => {
    if (paymentFilter === 'semua') return true;
    const method = p.pembayaran?.metode_pembayaran || 'tunai';
    return method === paymentFilter;
  });

  // Filter Riwayat Pesanan
  const filteredHistory = pesananList.filter((p) => {
    if (historyFilter === 'semua') return true;
    if (historyFilter === 'aktif') {
      return (
        p.status_pesanan === 'menunggu_konfirmasi' ||
        p.status_pesanan === 'dikonfirmasi' ||
        p.status_pesanan === 'dikirim'
      );
    }
    return p.status_pesanan === 'selesai';
  });

  const handleCreatePesanan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCutoffPassed) {
      setMsg({
        type: 'error',
        text: `Pemesanan ditolak: Batas waktu pemesanan tahu telah ditutup pada pukul 20.00 WIB (Waktu sistem: ${currentTimeWIB}). Pemesanan baru dapat dilakukan kembali besok hari.`,
      });
      return;
    }

    if (duplicateActiveOrder) {
      setMsg({
        type: 'error',
        text: `Pemesanan ditolak: Lapak Anda telah memiliki pesanan aktif untuk tanggal pengiriman ${tanggalPengiriman}. Setiap lapak hanya diperbolehkan membuat satu pesanan per tanggal pengiriman.`,
      });
      return;
    }

    setLoading(true);
    setMsg(null);

    const res = await createPesananAction({
      jumlah_papan: Number(jumlahPapan),
      tanggal_pengiriman: tanggalPengiriman,
      metode_pengiriman: metodePengiriman,
    });

    setLoading(false);

    if (res.error) {
      setMsg({ type: 'error', text: res.error });
    } else {
      setSuccessModal({
        isOpen: true,
        title: 'Pesanan Tahu Berhasil Dibuat!',
        message: `Pesanan sebanyak ${jumlahPapan} papan tahu telah berhasil dikirim ke pabrik dan sedang menunggu konfirmasi admin.`,
        badgeInfo: `${jumlahPapan} Papan • ${metodePengiriman === 'diantar' ? 'Diantar Armada Pabrik' : 'Ambil Mandiri'} • Total Rp ${totalHarga.toLocaleString('id-ID')}`,
      });
      setActiveTab('riwayat');
      router.refresh();
    }
  };

  const handleCancelPesanan = async (id_pesanan: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan pesanan tahu ini?')) return;

    setCancelLoadingId(id_pesanan);
    setMsg(null);

    const res = await cancelPesananAction(id_pesanan);
    setCancelLoadingId(null);

    if (res.error) {
      setMsg({ type: 'error', text: res.error });
    } else {
      setSuccessModal({
        isOpen: true,
        title: 'Pesanan Berhasil Dibatalkan!',
        message: 'Pesanan tahu Anda telah resmi dibatalkan dan statusnya diperbarui pada sistem pabrik.',
      });
      router.refresh();
    }
  };

  const handleExportPDF = () => {
    const listWithLapak = pesananList.map((p) => ({
      ...p,
      lapak: lapak || undefined,
    }));

    exportPesananToPDF(listWithLapak, {
      title: `Riwayat Pemesanan Tahu - ${lapak?.nama_lapak || 'Lapak Cabang'}`,
      subTitle: `Alamat: ${lapak?.alamat || '-'} | Akun Pemilik: ${user.username}`,
      adminName: user.username,
    });
  };

  const handleExportPembayaranPDF = () => {
    const listForPdf = filteredPayments.map((p, idx) => ({
      no: idx + 1,
      tanggalPembayaran: p.pembayaran?.tanggal_pembayaran
        ? new Date(p.pembayaran.tanggal_pembayaran).toLocaleString('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Asia/Jakarta',
          })
        : `${p.tanggal_pengiriman} (Selesai)`,
      tanggalPengiriman: p.tanggal_pengiriman,
      jumlahPapan: p.jumlah_papan,
      nominal: Number(p.pembayaran?.nominal || p.total_harga),
      metodePembayaran: p.pembayaran?.metode_pembayaran || 'tunai',
      status: 'LUNAS (100%)',
    }));

    const totalNominal = filteredPayments.reduce(
      (sum, p) => sum + Number(p.pembayaran?.nominal || p.total_harga),
      0
    );

    exportPembayaranToPDF(listForPdf, {
      namaLapak: lapak?.nama_lapak || 'Lapak Cabang',
      alamatLapak: lapak?.alamat || '-',
      totalNominal,
    });
  };

  const navItems: NavItem[] = [
    {
      id: 'pesan',
      label: 'Pesan Tahu Pabrik',
      icon: <PackagePlus className="w-4 h-4" />,
    },
    {
      id: 'riwayat',
      label: 'Riwayat Pesanan',
      icon: <History className="w-4 h-4" />,
      badge: pesananList.length,
    },
    {
      id: 'pembayaran',
      label: 'Riwayat Pembayaran',
      icon: <CreditCard className="w-4 h-4" />,
      badge: completedOrdersWithPayment.length,
    },
    {
      id: 'profil',
      label: 'Informasi Cabang',
      icon: <Store className="w-4 h-4" />,
    },
  ];

  const quickPills = [5, 10, 15, 20, 25, 30];

  return (
    <div className="min-h-screen bg-[#eef3f7] flex flex-col lg:flex-row text-slate-800 antialiased font-sans">
      {/* Center Modal Pop-Up Notifikasi dengan Backdrop Blur untuk Lapak */}
      {successModal && (
        <SuccessModal
          isOpen={successModal.isOpen}
          title={successModal.title}
          message={successModal.message}
          badgeInfo={successModal.badgeInfo}
          onClose={() => setSuccessModal(null)}
          buttonText="Mengerti / Selesai"
        />
      )}

      {/* Sidebar Gaya Eksekutif (Dark Sidebar #18222d) */}
      <AppSidebar
        userName={lapak?.nama_lapak || user.username}
        userRoleLabel="Pemilik Lapak"
        userSubLabel={lapak?.alamat || 'Cabang Resmi Pabrik'}
        navItems={navItems}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as 'pesan' | 'riwayat' | 'pembayaran' | 'profil')}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar Header */}
        <header className="px-4 lg:px-8 py-4 flex items-center justify-between border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                  Distribusi Cabang
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">
                  {lapak?.nama_lapak || 'Lapak Mandiri'}
                </span>
              </div>
              <h1 className="text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight">
                {activeTab === 'pesan' && 'Formulir Pemesanan Tahu'}
                {activeTab === 'riwayat' && 'Riwayat Transaksi Pesanan'}
                {activeTab === 'pembayaran' && 'Riwayat Pembayaran & Kuitansi Lunas'}
                {activeTab === 'profil' && 'Informasi Lapak & Ketentuan Pabrik'}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Badge Status Keaktifan Lapak */}
            <div
              className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                lapak?.status_aktif
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full mr-2 ${
                  lapak?.status_aktif ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              {lapak?.status_aktif ? 'Lapak Aktif (Bisa Memesan)' : 'Nonaktif (Hubungi Admin)'}
            </div>

            {pesananList.length > 0 && (
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition shadow-xs cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5 mr-1.5" />
                <span>Unduh Laporan</span>
              </button>
            )}
          </div>
        </header>

        {/* Kontainer Kanvas Lapak */}
        <main className="p-4 lg:p-8 space-y-6 max-w-7xl">
          {/* Pesan Notifikasi */}
          {msg && (
            <div
              className={`p-4 rounded-2xl flex items-start space-x-3 border shadow-xs animate-fadeIn ${
                msg.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {msg.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <CheckCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              )}
              <span className="text-sm font-semibold">{msg.text}</span>
            </div>
          )}

          {/* Alert Jika Lapak Dinonaktifkan */}
          {lapak && !lapak.status_aktif && (
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-900 text-xs sm:text-sm flex items-start space-x-3 shadow-2xs">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Pemberitahuan Status Lapak:</strong> Status lapak Anda
                sedang dinonaktifkan sementara oleh pihak admin pabrik. Anda dapat melihat riwayat
                pesanan lama, namun pembuatan pesanan baru saat ini ditutup. Hubungi admin untuk aktivasi
                ulang.
              </div>
            </div>
          )}

          {/* 4 Kartu Overview Atas (Sesuai Referensi Gambar) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <OverviewCard
              label="Total Belanja Lunas"
              value={`Rp ${totalBelanjaLunas.toLocaleString('id-ID')}`}
              sublabel={`${totalPapanDiterima} papan tahu selesai`}
              icon={<TrendingUp className="w-6 h-6" />}
              accentColor="emerald"
            />
            <OverviewCard
              label="Pesanan Berjalan"
              value={`${activeOrders} Pesanan`}
              sublabel="Menunggu / Dikirim"
              icon={<Clock className="w-6 h-6" />}
              accentColor="amber"
              isAlert={activeOrders > 0}
            />
            <OverviewCard
              label="Total Riwayat Pesanan"
              value={`${totalOrders} Transaksi`}
              sublabel="Seluruh catatan pesanan"
              icon={<Package className="w-6 h-6" />}
              accentColor="slate"
            />
            <OverviewCard
              label="Status Operasional"
              value={lapak?.status_aktif ? 'Lapak Aktif' : 'Nonaktif'}
              sublabel="Harga Rp 45.000 / papan"
              icon={<ShieldCheck className="w-6 h-6" />}
              accentColor={lapak?.status_aktif ? 'red' : 'amber'}
              isAlert={!lapak?.status_aktif}
            />
          </div>

          {/* TAB 1: FORMULIR PEMESANAN TAHU */}
          {activeTab === 'pesan' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sisi Kiri: Form Pesanan (8 Kolom) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-7">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <div className="flex items-center space-x-2 text-xs font-bold text-red-600 uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Jalur Pemesanan Pabrik</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Formulir Pemesanan Tahu Putih Segar
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Silakan tentukan jumlah papan tahu dan tanggal pengiriman yang diinginkan lapak
                    Anda.
                  </p>
                </div>

                {/* Notifikasi Batas Waktu 20.00 WIB */}
                {isCutoffPassed && (
                  <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-900 shadow-2xs">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm">Batas Waktu Pemesanan Berakhir (Pukul 20.00 WIB)</div>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        Pemesanan tahu untuk pabrik ditutup setiap hari tepat pukul 20.00 WIB guna persiapan produksi pagi hari. Waktu sistem saat ini: <strong className="font-semibold">{currentTimeWIB}</strong>. Formulir pemesanan dinonaktifkan sementara dan dibuka kembali besok.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreatePesanan} className="space-y-6">
                  {/* Selector Jumlah Papan Tahu */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Jumlah Papan Tahu
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">Preset cepat:</span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {quickPills.map((pill) => (
                        <button
                          key={pill}
                          type="button"
                          disabled={isCutoffPassed}
                          onClick={() => setJumlahPapan(pill)}
                          className={`text-xs px-3.5 py-2 rounded-xl font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                            jumlahPapan === pill
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                          }`}
                        >
                          +{pill} papan
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        required
                        disabled={isCutoffPassed}
                        value={jumlahPapan}
                        onChange={(e) => setJumlahPapan(Math.max(1, parseInt(e.target.value) || 0))}
                        className="block w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xl font-black text-slate-900 shadow-2xs bg-slate-50/50 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Papan Cetak
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-500 flex items-center">
                      <Info className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      1 papan berisi cetakan tahu putih padat berkualitas langsung dari pabrik.
                    </p>
                  </div>

                  {/* Tanggal & Metode Pengiriman */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Tanggal Pengiriman
                      </label>
                      <input
                        type="date"
                        required
                        disabled={isCutoffPassed}
                        min={new Date().toISOString().split('T')[0]}
                        value={tanggalPengiriman}
                        onChange={(e) => setTanggalPengiriman(e.target.value)}
                        className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xs sm:text-sm text-slate-800 bg-white shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />
                      {/* Peringatan Pesanan Ganda Aktif */}
                      {duplicateActiveOrder && (
                        <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Pesanan Ganda:</span> Lapak Anda telah memiliki pesanan aktif untuk tanggal <span className="font-semibold underline">{tanggalPengiriman}</span> (Status: <span className="capitalize font-semibold">{duplicateActiveOrder.status_pesanan.replace('_', ' ')}</span>).
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                        <Truck className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        Metode Penyerahan
                      </label>
                      <select
                        disabled={isCutoffPassed}
                        value={metodePengiriman}
                        onChange={(e) => setMetodePengiriman(e.target.value as MetodePengiriman)}
                        className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xs sm:text-sm text-slate-800 bg-white shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        <option value="diantar">Diantar Armada Pabrik ke Kios</option>
                        <option value="ambil_sendiri">Ambil Mandiri ke Pabrik</option>
                      </select>
                    </div>
                  </div>

                  {/* Tombol Kirim Pesanan */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={Boolean(
                        loading ||
                        (lapak && !lapak.status_aktif) ||
                        isCutoffPassed ||
                        duplicateActiveOrder
                      )}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition shadow-sm flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Mengirim Pesanan ke Pabrik...
                        </span>
                      ) : isCutoffPassed ? (
                        <span className="flex items-center justify-center">
                          <Clock className="w-4 h-4 mr-2" />
                          Pemesanan Ditutup (Lewat Pukul 20.00 WIB)
                        </span>
                      ) : duplicateActiveOrder ? (
                        <span className="flex items-center justify-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Tanggal Sudah Dipesan (Pilih Tanggal Lain)
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          Kirim Pesanan Tahu ({jumlahPapan} Papan)
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Sisi Kanan: Ringkasan Tagihan & Ketentuan Pabrik (5 Kolom) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Rincian Nota Tagihan */}
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center">
                      <Building2 className="w-4 h-4 mr-2 text-red-600" />
                      Rincian Tagihan Resmi Pabrik
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                      Fixed Price
                    </span>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Harga Acuan Resmi:</span>
                      <span className="font-semibold text-slate-800">
                        Rp {HARGA_TAHU_PER_PAPAN.toLocaleString('id-ID')} / papan
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-500">
                      <span>Kuantitas Dipesan:</span>
                      <span className="font-bold text-slate-900">{jumlahPapan} papan cetak</span>
                    </div>

                    <div className="flex justify-between text-slate-500">
                      <span>Jadwal Pengiriman:</span>
                      <span className="font-medium text-slate-800">{tanggalPengiriman}</span>
                    </div>

                    <div className="flex justify-between text-slate-500">
                      <span>Metode Penyerahan:</span>
                      <span className="font-medium text-slate-800 capitalize">
                        {metodePengiriman.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="border-t border-dashed border-slate-200 pt-3.5 flex justify-between items-baseline">
                      <div>
                        <span className="block font-bold text-slate-900">Total Tagihan:</span>
                        <span className="text-[10px] text-slate-400">Wajib lunas saat serah terima</span>
                      </div>
                      <span className="text-2xl font-black text-red-600">
                        Rp {totalHarga.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ketentuan Pemesanan Pabrik */}
                <div className="bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5 text-xs text-slate-600 leading-relaxed">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-1.5 text-red-600" />
                    Ketentuan Transaksi Distribusi:
                  </h4>
                  <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc list-inside">
                    <li>Pesanan yang masuk akan berstatus <strong className="text-slate-800 font-semibold">Menunggu Konfirmasi</strong> hingga disetujui admin pabrik.</li>
                    <li>Lapak dapat membatalkan pesanan mandiri selama admin pabrik belum mengonfirmasi.</li>
                    <li><strong className="text-red-700 font-semibold">Batas Waktu:</strong> Pemesanan ditutup setiap hari pukul 20.00 WIB untuk persiapan bahan baku dan produksi pabrik.</li>
                    <li><strong className="text-red-700 font-semibold">Aturan Duplikasi:</strong> Setiap cabang lapak hanya dapat memiliki 1 pesanan aktif per tanggal pengiriman.</li>
                    <li>Pembayaran dilakukan lunas 100% dan dicatatkan oleh admin pabrik saat status pesanan dikirim.</li>
                    <li>Harga cetakan tahu dikunci secara transparan pada Rp 45.000 per papan.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RIWAYAT PESANAN */}
          {activeTab === 'riwayat' && (
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 overflow-hidden">
              {/* Header Tabel & Filter Pills */}
              <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Riwayat Pemesanan Tahu Cabang
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daftar seluruh pesanan tahu yang pernah dibuat oleh lapak Anda
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setHistoryFilter('semua')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      historyFilter === 'semua'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua ({pesananList.length})
                  </button>
                  <button
                    onClick={() => setHistoryFilter('aktif')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      historyFilter === 'aktif'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Proses Aktif ({activeOrders})
                  </button>
                  <button
                    onClick={() => setHistoryFilter('selesai')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      historyFilter === 'selesai'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Selesai ({completedOrders.length})
                  </button>
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-600">
                    Belum ada data pesanan pada kategori ini.
                  </p>
                  <button
                    onClick={() => setActiveTab('pesan')}
                    className="mt-3 text-xs font-bold text-red-600 hover:underline inline-flex items-center cursor-pointer"
                  >
                    Buat pesanan tahu sekarang <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                    <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">Tgl Pesan</th>
                        <th className="px-5 py-3.5">Tgl Kirim</th>
                        <th className="px-5 py-3.5">Kuantitas</th>
                        <th className="px-5 py-3.5">Harga Acuan</th>
                        <th className="px-5 py-3.5">Total Tagihan</th>
                        <th className="px-5 py-3.5">Metode</th>
                        <th className="px-5 py-3.5">Status Pesanan</th>
                        <th className="px-5 py-3.5 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistory.map((p) => (
                        <tr key={p.id_pesanan} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-4 font-semibold text-slate-900">
                            {p.tanggal_pesanan}
                          </td>
                          <td className="px-5 py-4 text-slate-700">{p.tanggal_pengiriman}</td>
                          <td className="px-5 py-4 font-bold text-slate-900">
                            {p.jumlah_papan} papan
                          </td>
                          <td className="px-5 py-4 text-slate-500">
                            Rp {Number(p.harga_satuan).toLocaleString('id-ID')}
                          </td>
                          <td className="px-5 py-4 font-bold text-red-600">
                            Rp {Number(p.total_harga).toLocaleString('id-ID')}
                          </td>
                          <td className="px-5 py-4 capitalize text-xs text-slate-700">
                            {p.metode_pengiriman === 'diantar' ? (
                              <span className="inline-flex items-center text-purple-700 font-semibold">
                                <Truck className="w-3.5 h-3.5 mr-1" /> Diantar
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-slate-700 font-semibold">
                                <Package className="w-3.5 h-3.5 mr-1" /> Ambil Sendiri
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={p.status_pesanan} size="sm" />
                            {p.status_pesanan === 'selesai' && (
                              <div className="mt-1 text-[11px] font-semibold text-emerald-700 flex items-center">
                                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                                Lunas ({p.pembayaran?.metode_pembayaran ? p.pembayaran.metode_pembayaran.toUpperCase() : 'TERCATAT'})
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {p.status_pesanan === 'menunggu_konfirmasi' && (
                              <button
                                onClick={() => handleCancelPesanan(p.id_pesanan)}
                                disabled={cancelLoadingId === p.id_pesanan}
                                className="text-xs text-rose-600 hover:text-rose-800 font-bold border border-rose-200 hover:border-rose-300 hover:bg-rose-50 rounded-xl px-3 py-1.5 transition disabled:opacity-50 cursor-pointer"
                              >
                                {cancelLoadingId === p.id_pesanan ? 'Membatalkan...' : 'Batalkan'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RIWAYAT PEMBAYARAN */}
          {activeTab === 'pembayaran' && (
            <div className="space-y-6">
              {/* Grid Ringkasan Pembayaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Lunas</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    Rp {totalBelanjaLunas.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {completedOrdersWithPayment.length} transaksi pembayaran lunas
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Transaksi</span>
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {completedOrdersWithPayment.length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Diverifikasi admin pabrik
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Bayar Tunai</span>
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    Rp {totalPembayaranTunai.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {countPembayaranTunai} transaksi via tunai
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Bayar Transfer</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    Rp {totalPembayaranTransfer.toLocaleString('id-ID')}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {countPembayaranTransfer} transaksi via transfer bank
                  </div>
                </div>
              </div>

              {/* Tabel Riwayat Pembayaran */}
              <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 overflow-hidden">
                <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Catatan Pembayaran Resmi Lapak
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bukti verifikasi pelunasan tahu dari pabrik untuk cabang {lapak?.nama_lapak || 'Anda'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filter Pills */}
                    <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                      <button
                        onClick={() => setPaymentFilter('semua')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          paymentFilter === 'semua'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Semua ({completedOrdersWithPayment.length})
                      </button>
                      <button
                        onClick={() => setPaymentFilter('tunai')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          paymentFilter === 'tunai'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tunai ({countPembayaranTunai})
                      </button>
                      <button
                        onClick={() => setPaymentFilter('transfer')}
                        className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          paymentFilter === 'transfer'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Transfer ({countPembayaranTransfer})
                      </button>
                    </div>

                    {filteredPayments.length > 0 && (
                      <button
                        onClick={handleExportPembayaranPDF}
                        className="inline-flex items-center text-xs font-bold px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5 mr-1.5" />
                        Unduh PDF
                      </button>
                    )}
                  </div>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-semibold text-slate-600">
                      Belum ada catatan pembayaran lunas yang tercatat.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Pembayaran akan otomatis tercatat di sini setelah pesanan dikirim dan dicatat lunas oleh admin pabrik.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                      <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3.5 text-center">No</th>
                          <th className="px-5 py-3.5">Tanggal Pembayaran</th>
                          <th className="px-5 py-3.5">Tanggal Kirim</th>
                          <th className="px-5 py-3.5">Jumlah Papan</th>
                          <th className="px-5 py-3.5">Nominal Lunas</th>
                          <th className="px-5 py-3.5">Metode Bayar</th>
                          <th className="px-5 py-3.5 text-right">Status Verifikasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPayments.map((p, idx) => {
                          const nominal = Number(p.pembayaran?.nominal || p.total_harga);
                          const paymentDate = p.pembayaran?.tanggal_pembayaran
                            ? new Date(p.pembayaran.tanggal_pembayaran).toLocaleString('id-ID', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                                timeZone: 'Asia/Jakarta',
                              })
                            : `${p.tanggal_pengiriman} (Selesai)`;
                          const method = p.pembayaran?.metode_pembayaran || 'tunai';

                          return (
                            <tr key={p.id_pesanan} className="hover:bg-slate-50/70 transition">
                              <td className="px-5 py-4 text-center text-slate-400 font-mono text-xs">
                                {idx + 1}
                              </td>
                              <td className="px-5 py-4 font-semibold text-slate-900">
                                {paymentDate}
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                {p.tanggal_pengiriman}
                              </td>
                              <td className="px-5 py-4 font-bold text-slate-800">
                                {p.jumlah_papan} papan
                              </td>
                              <td className="px-5 py-4 font-bold text-emerald-700">
                                Rp {nominal.toLocaleString('id-ID')}
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                    method === 'transfer'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                                  }`}
                                >
                                  {method === 'transfer' ? 'Transfer Bank' : 'Tunai / Cash'}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                  Lunas 100%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: INFORMASI CABANG LAPAK */}
          {activeTab === 'profil' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 sm:p-7 space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center">
                    <Store className="w-5 h-5 mr-2 text-red-600" />
                    Profil Cabang Lapak Terdaftar
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Informasi identitas kios dan alamat tujuan pengiriman pesanan tahu oleh pabrik
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Nama Lapak / Cabang
                    </span>
                    <span className="font-extrabold text-slate-900 text-base">
                      {lapak?.nama_lapak || 'Lapak Belum Terdaftar'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Status Operasional
                    </span>
                    <span
                      className={`inline-flex items-center font-bold px-2.5 py-1 rounded-md text-xs ${
                        lapak?.status_aktif
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {lapak?.status_aktif ? 'Aktif (Dapat Memesan)' : 'Nonaktif (Ditutup Admin)'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Username Akun Pemilik
                    </span>
                    <span className="font-bold text-slate-800">{user.username}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Role Pengguna
                    </span>
                    <span className="font-bold text-red-600">Pemilik Lapak</span>
                  </div>

                  <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Alamat Pengiriman Lapak
                    </span>
                    <span className="font-semibold text-slate-800">
                      {lapak?.alamat || 'Alamat fisik kios belum ditentukan'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bantuan & Kontak Dukungan Pabrik */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  <HelpCircle className="w-4 h-4 mr-2 text-red-600" />
                  Bantuan Operasional
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Jika Anda perlu mengubah alamat pengiriman lapak, mengalami kendala pengantaran,
                  atau ingin menambah kapasitas pesanan khusus, silakan hubungi kontak manajemen
                  pabrik tahu berikut:
                </p>

                <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200/70 text-xs space-y-1">
                  <span className="font-bold text-red-950 block">Pusat Layanan Pabrik Tahu</span>
                  <span className="text-slate-600 block">Jam Operasional: 06.00 - 18.00 WIB</span>
                  <span className="font-bold text-red-700 block">WhatsApp: 0812-3456-7890</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
