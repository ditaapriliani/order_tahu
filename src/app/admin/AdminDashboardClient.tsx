'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lapak, PesananWithLapak, StatusPesanan, MetodePembayaran } from '@/types/database';
import {
  updatePesananStatusAction,
  recordPembayaranAction,
  toggleLapakStatusAction,
  createLapakByAdminAction,
} from '@/app/actions';
import { exportPesananToPDF } from '@/lib/pdf';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { OverviewCard } from '@/components/ui/OverviewCard';
import { AdminVisualCharts } from '@/components/admin/AdminVisualCharts';
import { AppSidebar, NavItem } from '@/components/ui/AppSidebar';
import { ToastNotification } from '@/components/ui/ToastNotification';
import {
  LayoutDashboard,
  ClipboardList,
  Store,
  FileDown,
  Truck,
  CreditCard,
  Clock,
  CheckCheck,
  AlertCircle,
  Loader2,
  Plus,
  TrendingUp,
  Package,
  Filter,
  Calendar,
  Search,
  Menu,
  Shield,
  Layers,
  CheckCircle,
} from 'lucide-react';

interface Props {
  user: User;
  pesananList: PesananWithLapak[];
  lapakList: (Lapak & { users?: User })[];
  userListWithoutLapak: User[];
}

export default function AdminDashboardClient({
  user,
  pesananList,
  lapakList,
  userListWithoutLapak,
}: Props) {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pesanan' | 'lapak' | 'laporan'>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Filter Pesanan
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [filterLapak, setFilterLapak] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter Laporan
  const [laporanStartDate, setLaporanStartDate] = useState<string>('');
  const [laporanEndDate, setLaporanEndDate] = useState<string>('');

  // Modal State: Periksa & Konfirmasi Pesanan
  const [confirmModalPesanan, setConfirmModalPesanan] = useState<PesananWithLapak | null>(null);

  // Modal State: Catat Pembayaran
  const [paymentModalPesanan, setPaymentModalPesanan] = useState<PesananWithLapak | null>(null);
  const [metodePembayaran, setMetodePembayaran] = useState<MetodePembayaran>('tunai');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Modal State: Tambah Lapak
  const [showAddLapakModal, setShowAddLapakModal] = useState(false);
  const [newLapakUserId, setNewLapakUserId] = useState('');
  const [newLapakName, setNewLapakName] = useState('');
  const [newLapakAlamat, setNewLapakAlamat] = useState('');
  const [addLapakLoading, setAddLapakLoading] = useState(false);

  // State loading aksi
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'error';
    title: string;
    message?: string;
  } | null>(null);

  // Perhitungan Ringkasan / Metrik Nyata
  const totalPesanan = pesananList.length;
  const pesananMenunggu = pesananList.filter((p) => p.status_pesanan === 'menunggu_konfirmasi').length;
  const pesananDikirim = pesananList.filter((p) => p.status_pesanan === 'dikirim').length;
  const pesananSelesai = pesananList.filter((p) => p.status_pesanan === 'selesai');
  const totalOmset = pesananSelesai.reduce((sum, p) => sum + Number(p.total_harga), 0);
  const totalPapanLunas = pesananSelesai.reduce((sum, p) => sum + Number(p.jumlah_papan), 0);
  const totalLapakAktif = lapakList.filter((l) => l.status_aktif).length;

  // Nav Items Sidebar Admin
  const adminNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard & Analitik', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'pesanan',
      label: 'Kelola Pesanan',
      icon: <ClipboardList className="w-4 h-4" />,
      badge: pesananMenunggu > 0 ? `${pesananMenunggu} Baru` : undefined,
    },
    { id: 'lapak', label: 'Cabang Lapak', icon: <Store className="w-4 h-4" />, badge: lapakList.length },
    { id: 'laporan', label: 'Laporan Transaksi', icon: <FileDown className="w-4 h-4" /> },
  ];

  // Filter List Pesanan
  const filteredPesanan = pesananList.filter((p) => {
    const matchStatus = filterStatus === 'semua' || p.status_pesanan === filterStatus;
    const matchLapak = filterLapak === 'semua' || p.id_lapak === filterLapak;
    const matchSearch =
      !searchQuery ||
      (p.lapak?.nama_lapak || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.lapak?.alamat || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchLapak && matchSearch;
  });

  // Filter List untuk Laporan
  const filteredLaporan = pesananList.filter((p) => {
    let match = true;
    if (laporanStartDate && p.tanggal_pesanan < laporanStartDate) match = false;
    if (laporanEndDate && p.tanggal_pesanan > laporanEndDate) match = false;
    return match;
  });

  // Aksi Update Status Pesanan
  const handleUpdateStatus = async (id_pesanan: string, newStatus: StatusPesanan) => {
    setActionLoadingId(id_pesanan);
    setMsg(null);

    const res = await updatePesananStatusAction(id_pesanan, newStatus);
    setActionLoadingId(null);

    if (res.error) {
      setMsg({ type: 'error', text: res.error });
      setToast({
        show: true,
        type: 'error',
        title: 'Gagal Memperbarui Pesanan',
        message: res.error,
      });
    } else {
      let title = 'Status Pesanan Berhasil Diperbarui!';
      let message = `Pesanan kini berstatus ${newStatus.replace('_', ' ')}.`;
      if (newStatus === 'dikonfirmasi') {
        title = 'Pesanan Berhasil Dikonfirmasi!';
        message = 'Pesanan telah disetujui dan masuk jadwal produksi harian pabrik.';
      } else if (newStatus === 'dikirim') {
        title = 'Pesanan Berhasil Dikirim!';
        message = 'Tahu sedang diantar armada atau siap diambil oleh lapak.';
      } else if (newStatus === 'dibatalkan') {
        title = 'Pesanan Berhasil Dibatalkan!';
        message = 'Pesanan tahu telah resmi dibatalkan oleh pihak admin.';
      }

      setMsg({ type: 'success', text: message });
      setToast({
        show: true,
        type: 'success',
        title,
        message,
      });
      router.refresh();
    }
  };

  // Aksi Simpan Pembayaran Lunas 100%
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalPesanan) return;

    setPaymentLoading(true);
    setMsg(null);

    const res = await recordPembayaranAction({
      id_pesanan: paymentModalPesanan.id_pesanan,
      nominal: Number(paymentModalPesanan.total_harga),
      metode_pembayaran: metodePembayaran,
    });

    setPaymentLoading(false);

    if (res.error) {
      setMsg({ type: 'error', text: res.error });
      setToast({
        show: true,
        type: 'error',
        title: 'Gagal Mencatat Pembayaran',
        message: res.error,
      });
    } else {
      const message = `Pembayaran lunas sebesar Rp ${Number(paymentModalPesanan.total_harga).toLocaleString(
        'id-ID'
      )} berhasil dicatat. Status pesanan selesai.`;
      setMsg({ type: 'success', text: message });
      setToast({
        show: true,
        type: 'success',
        title: 'Pembayaran Berhasil Dicatat Lunas!',
        message,
      });
      setPaymentModalPesanan(null);
      router.refresh();
    }
  };

  // Aksi Toggle Status Aktif Lapak
  const handleToggleLapak = async (id_lapak: string, currentStatus: boolean) => {
    const res = await toggleLapakStatusAction(id_lapak, !currentStatus);
    if (res.error) {
      setMsg({ type: 'error', text: res.error });
      setToast({
        show: true,
        type: 'error',
        title: 'Gagal Mengubah Status Lapak',
        message: res.error,
      });
    } else {
      const message = `Status operasional lapak berhasil diubah menjadi ${!currentStatus ? 'Aktif' : 'Nonaktif'}.`;
      setMsg({ type: 'success', text: message });
      setToast({
        show: true,
        type: 'success',
        title: 'Status Lapak Berhasil Diperbarui!',
        message,
      });
      router.refresh();
    }
  };

  // Aksi Tambah Lapak
  const handleCreateLapak = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLapakLoading(true);

    const res = await createLapakByAdminAction({
      id_user: newLapakUserId,
      nama_lapak: newLapakName,
      alamat: newLapakAlamat,
    });

    setAddLapakLoading(false);

    if (res.error) {
      setMsg({ type: 'error', text: res.error });
      setToast({
        show: true,
        type: 'error',
        title: 'Gagal Menambah Lapak',
        message: res.error,
      });
    } else {
      const message = 'Lapak cabang baru berhasil ditambahkan.';
      setMsg({ type: 'success', text: message });
      setToast({
        show: true,
        type: 'success',
        title: 'Lapak Cabang Berhasil Ditambahkan!',
        message,
      });
      setShowAddLapakModal(false);
      setNewLapakUserId('');
      setNewLapakName('');
      setNewLapakAlamat('');
      router.refresh();
    }
  };

  // Cetak Laporan PDF
  const handleDownloadPDF = () => {
    const totalPapanFiltered = filteredLaporan.reduce((sum, p) => sum + Number(p.jumlah_papan), 0);
    const totalOmsetFiltered = filteredLaporan
      .filter((p) => p.status_pesanan === 'selesai')
      .reduce((sum, p) => sum + Number(p.total_harga), 0);

    exportPesananToPDF(filteredLaporan, {
      title: 'Laporan Rekapitulasi Pemesanan Cabang Pabrik Tahu',
      subTitle: `Periode: ${laporanStartDate || 'Awal'} s/d ${laporanEndDate || 'Sekarang'} | Administrator: ${user.username}`,
      adminName: user.username,
      totalPapan: totalPapanFiltered,
      totalOmset: totalOmsetFiltered,
    });
  };

  return (
    <div className="min-h-screen bg-[#eef3f7] flex flex-col lg:flex-row antialiased text-slate-800">
      {/* Top Floating Toast Pop-up Notification untuk Admin */}
      {toast && (
        <ToastNotification
          show={toast.show}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* 1. Integrated Dark Sidebar (Gaya Persis Seperti di Referensi) */}
      <AppSidebar
        userName={user.username}
        userRoleLabel="Admin Pabrik"
        userSubLabel="Pusat Distribusi Tahu"
        navItems={adminNavItems}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as any)}
        isOpenMobile={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Area Canvas */}
      <div className="flex-1 flex flex-col min-w-0 p-3 sm:p-5 lg:p-6 lg:pl-3">
        {/* Top Header Bar Gaya Referensi ("Welcome [Username]!" + Search Bar) */}
        <header className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:px-6 sm:py-3.5 mb-5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* Hamburger Button Mobile */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 lg:hidden hover:bg-slate-200 transition"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                Halo, Admin!
              </h1>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Pusat Kendali Pemesanan & Distribusi Pabrik Tahu
              </p>
            </div>
          </div>

          {/* Right Header: Pill Search Bar & Tanggal Hari Ini */}
          <div className="flex items-center space-x-3">
            <div className="relative hidden md:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pesanan / cabang..."
                className="w-52 lg:w-64 pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5" />
            </div>

            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-red-600" />
              <span>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </header>

        {/* Notifikasi Global */}
        {msg && (
          <div
            className={`mb-5 p-3.5 rounded-2xl flex items-start space-x-3 border shadow-2xs animate-fadeIn text-xs ${msg.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
          >
            {msg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            ) : (
              <CheckCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            )}
            <span className="font-semibold">{msg.text}</span>
          </div>
        )}

        {/* TAB 1: DASHBOARD & ANALITIK (Gaya Visual Referensi) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Section: Over View (4 Kartu Horisontal Persis Referensi) */}
            <div>
              <div className="text-xs font-bold text-slate-800 mb-3 px-1 uppercase tracking-wider">
                Ringkasan Operasional (Over View)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Omset Lunas */}
                <OverviewCard
                  label="Total Omset Lunas"
                  value={`Rp ${totalOmset.toLocaleString('id-ID')}`}
                  sublabel={`${totalPapanLunas} papan terjual`}
                  icon={<TrendingUp className="w-6 h-6" />}
                  accentColor="emerald"
                />

                {/* 2. Menunggu Konfirmasi (Diberi alert tint seperti kartu "Out of Stock" di referensi) */}
                <OverviewCard
                  label="Menunggu Konfirmasi"
                  value={pesananMenunggu}
                  sublabel="Pesanan baru masuk"
                  icon={<Clock className="w-6 h-6" />}
                  isAlert={pesananMenunggu > 0}
                  accentColor="amber"
                />

                {/* 3. Dalam Pengiriman */}
                <OverviewCard
                  label="Dalam Pengiriman"
                  value={pesananDikirim}
                  sublabel="Siap catat bayar"
                  icon={<Truck className="w-6 h-6" />}
                  accentColor="purple"
                />

                {/* 4. Lapak Aktif */}
                <OverviewCard
                  label="Lapak Aktif"
                  value={`${totalLapakAktif} / ${lapakList.length}`}
                  sublabel="Cabang beroperasi"
                  icon={<Store className="w-6 h-6" />}
                  accentColor="red"
                />
              </div>
            </div>

            {/* Visualisasi Data Nyata (Peringkat Lapak, Donut Distribusi, Tren Harian) */}
            <AdminVisualCharts pesananList={pesananList} lapakList={lapakList} />

            {/* Tabel Ringkas Pesanan Terbaru */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Pesanan Terbaru Masuk</span>
                  <span className="text-[11px] text-slate-400">5 transaksi pemesanan tahu paling mutakhir</span>
                </div>
                <button
                  onClick={() => setActiveTab('pesanan')}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  Buka Kelola Pesanan &rarr;
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Lapak Cabang</th>
                      <th className="px-3.5 py-2.5">Tgl Kirim</th>
                      <th className="px-3.5 py-2.5">Jumlah</th>
                      <th className="px-3.5 py-2.5">Total Tagihan</th>
                      <th className="px-3.5 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pesananList.slice(0, 5).map((p) => (
                      <tr key={p.id_pesanan} className="hover:bg-slate-50/70 transition">
                        <td className="px-3.5 py-3 font-semibold text-slate-900">{p.lapak?.nama_lapak || '-'}</td>
                        <td className="px-3.5 py-3 text-slate-600">{p.tanggal_pengiriman}</td>
                        <td className="px-3.5 py-3 font-bold text-slate-800">{p.jumlah_papan} papan</td>
                        <td className="px-3.5 py-3 font-bold text-red-700">
                          Rp {Number(p.total_harga).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3.5 py-3">
                          <StatusBadge status={p.status_pesanan} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KELOLA PESANAN & PEMBAYARAN */}
        {activeTab === 'pesanan' && (
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filter:</span>
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-medium focus:ring-2 focus:ring-red-500 text-slate-700 shadow-2xs"
                >
                  <option value="semua">Semua Status</option>
                  <option value="menunggu_konfirmasi">Menunggu Konfirmasi</option>
                  <option value="dikonfirmasi">Dikonfirmasi</option>
                  <option value="dikirim">Dikirim</option>
                  <option value="selesai">Selesai / Lunas</option>
                  <option value="dibatalkan">Dibatalkan</option>
                </select>

                <select
                  value={filterLapak}
                  onChange={(e) => setFilterLapak(e.target.value)}
                  className="text-xs border border-slate-300 rounded-xl px-3 py-1.5 bg-white font-medium focus:ring-2 focus:ring-red-500 text-slate-700 shadow-2xs"
                >
                  <option value="semua">Semua Cabang Lapak</option>
                  {lapakList.map((l) => (
                    <option key={l.id_lapak} value={l.id_lapak}>
                      {l.nama_lapak}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500">
                Menampilkan <strong>{filteredPesanan.length}</strong> dari {pesananList.length} pesanan
              </div>
            </div>

            {/* Tabel Pesanan */}
            {filteredPesanan.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Tidak ada data pesanan yang sesuai dengan filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Lapak Cabang</th>
                      <th className="px-4 py-3">Tgl Kirim</th>
                      <th className="px-4 py-3">Jumlah</th>
                      <th className="px-4 py-3">Total Tagihan</th>
                      <th className="px-4 py-3">Metode Penyerahan</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Tindakan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPesanan.map((p) => (
                      <tr key={p.id_pesanan} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{p.lapak?.nama_lapak || 'Lapak Cabang'}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.lapak?.alamat || '-'}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 font-medium">
                          {p.tanggal_pengiriman}
                          <span className="block text-[10px] text-slate-400">Pesan: {p.tanggal_pesanan}</span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">{p.jumlah_papan} papan</td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-red-700">
                            Rp {Number(p.total_harga).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 capitalize text-xs text-slate-700">
                          {p.metode_pengiriman === 'diantar' ? 'Diantar Pabrik' : 'Ambil Sendiri'}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={p.status_pesanan} size="sm" />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5 sm:space-x-2">
                            {p.status_pesanan === 'menunggu_konfirmasi' && (
                              <>
                                <button
                                  onClick={() => setConfirmModalPesanan(p)}
                                  disabled={actionLoadingId === p.id_pesanan}
                                  className="text-xs bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold px-3 py-1.5 rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                                >
                                  Konfirmasi
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(p.id_pesanan, 'dibatalkan')}
                                  disabled={actionLoadingId === p.id_pesanan}
                                  className="text-xs text-slate-600 hover:text-rose-700 font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 transition disabled:opacity-50 cursor-pointer"
                                >
                                  Tolak
                                </button>
                              </>
                            )}

                            {p.status_pesanan === 'dikonfirmasi' && (
                              <button
                                onClick={() => handleUpdateStatus(p.id_pesanan, 'dikirim')}
                                disabled={actionLoadingId === p.id_pesanan}
                                className="text-xs bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold px-3 py-1.5 rounded-xl shadow-xs transition flex items-center disabled:opacity-50 cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5 mr-1" />
                                Kirimkan
                              </button>
                            )}

                            {p.status_pesanan === 'dikirim' && (
                              <button
                                onClick={() => setPaymentModalPesanan(p)}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs transition flex items-center cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                Catat Bayar
                              </button>
                            )}

                            {p.status_pesanan === 'selesai' && (
                              <span className="text-xs text-emerald-700 font-semibold flex items-center">
                                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Lunas 100%
                              </span>
                            )}

                            {p.status_pesanan === 'dibatalkan' && (
                              <span className="text-xs text-rose-500 font-medium">Batal</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: KELOLA CABANG LAPAK */}
        {activeTab === 'lapak' && (
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Daftar Cabang Lapak Mitra</h2>
                <p className="text-xs text-slate-500">Pengelolaan status operasional dan akun pemilik cabang</p>
              </div>

              {userListWithoutLapak.length > 0 && (
                <button
                  onClick={() => setShowAddLapakModal(true)}
                  className="inline-flex items-center text-xs font-semibold px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Tambah Lapak Baru
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Nama Lapak Cabang</th>
                    <th className="px-4 py-3">Alamat Pengiriman</th>
                    <th className="px-4 py-3">Akun Pemilik</th>
                    <th className="px-4 py-3">Status Operasional</th>
                    <th className="px-4 py-3 text-right">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lapakList.map((l) => (
                    <tr key={l.id_lapak} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3.5 font-semibold text-slate-900 flex items-center space-x-2">
                        <Store className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{l.nama_lapak}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{l.alamat}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-700">
                        {l.users?.username || <span className="text-slate-400 italic">Belum ditautkan</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${l.status_aktif
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${l.status_aktif ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                          />
                          {l.status_aktif ? 'Aktif Beroperasi' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleToggleLapak(l.id_lapak, l.status_aktif)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition cursor-pointer ${l.status_aktif
                              ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                              : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            }`}
                        >
                          {l.status_aktif ? 'Nonaktifkan Lapak' : 'Aktifkan Lapak'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: LAPORAN & PDF */}
        {activeTab === 'laporan' && (
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 p-5 sm:p-7">
            <div className="border-b border-slate-200 pb-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Laporan Rekapitulasi & Dokumen Transaksi Pabrik
                </h2>
                <p className="text-xs text-slate-500">
                  Filter transaksi dan unduh dokumen laporan resmi berformat PDF untuk pertanggungjawaban
                </p>
              </div>

              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-xs transition cursor-pointer"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Unduh Dokumen Laporan (PDF)
              </button>
            </div>

            {/* Filter Rentang Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Dari Tanggal Pesanan:
                </label>
                <input
                  type="date"
                  value={laporanStartDate}
                  onChange={(e) => setLaporanStartDate(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Sampai Tanggal Pesanan:
                </label>
                <input
                  type="date"
                  value={laporanEndDate}
                  onChange={(e) => setLaporanEndDate(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Preview Ringkasan Laporan */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="bg-slate-100/70 px-4 py-3 font-semibold text-xs text-slate-700 flex justify-between border-b border-slate-200">
                <span>Ringkasan Data yang Akan Dicetak:</span>
                <span className="font-bold text-slate-900">{filteredLaporan.length} baris data ditemukan</span>
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                <div>
                  <div className="text-xs text-slate-500">Total Transaksi</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">
                    {filteredLaporan.length} pesanan
                  </div>
                </div>

                <div className="pt-3 sm:pt-0">
                  <div className="text-xs text-slate-500">Total Papan Terjadwal</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-1">
                    {filteredLaporan.reduce((sum, p) => sum + Number(p.jumlah_papan), 0)} papan
                  </div>
                </div>

                <div className="pt-3 sm:pt-0">
                  <div className="text-xs text-slate-500">Pendapatan Lunas</div>
                  <div className="text-xl font-extrabold text-emerald-600 mt-1">
                    Rp{' '}
                    {filteredLaporan
                      .filter((p) => p.status_pesanan === 'selesai')
                      .reduce((sum, p) => sum + Number(p.total_harga), 0)
                      .toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PEMERIKSAAN & KONFIRMASI PESANAN OLEH ADMIN */}
      {confirmModalPesanan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-fadeIn">
            <div className="flex items-center space-x-2 text-xs font-bold text-red-600 uppercase tracking-wider mb-1">
              <ClipboardList className="w-4 h-4" />
              <span>Verifikasi Pesanan Pabrik</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
              Pemeriksaan & Konfirmasi Pesanan Tahu
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Periksa rincian pesanan dan metode penyerahan yang dipilih oleh pihak lapak sebelum menyetujui.
            </p>

            <div className="space-y-4">
              {/* Rincian Pesanan Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm space-y-2.5">
                <div className="flex justify-between items-start">
                  <span className="text-slate-500">Cabang Lapak:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">
                      {confirmModalPesanan.lapak?.nama_lapak || 'Lapak Cabang'}
                    </span>
                    <span className="text-[11px] text-slate-400 block max-w-xs">
                      {confirmModalPesanan.lapak?.alamat || '-'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-500">Tanggal Pengiriman:</span>
                  <span className="font-semibold text-slate-800">
                    {confirmModalPesanan.tanggal_pengiriman}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-500">Kuantitas Tahu:</span>
                  <span className="font-bold text-slate-900">
                    {confirmModalPesanan.jumlah_papan} papan (@ Rp 45.000)
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Total Nilai Tagihan:</span>
                  <span className="text-base font-extrabold text-red-600">
                    Rp {Number(confirmModalPesanan.total_harga).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Sorotan Metode Penyerahan yang Dipilih Lapak */}
              <div
                className={`p-4 rounded-xl border ${confirmModalPesanan.metode_pengiriman === 'diantar'
                    ? 'bg-purple-50/70 border-purple-200 text-purple-900'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  {confirmModalPesanan.metode_pengiriman === 'diantar' ? (
                    <Truck className="w-5 h-5 text-purple-700" />
                  ) : (
                    <Store className="w-5 h-5 text-emerald-700" />
                  )}
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Pilihan Metode Penyerahan oleh Lapak:
                  </span>
                </div>
                <div className="text-sm font-black mb-1">
                  {confirmModalPesanan.metode_pengiriman === 'diantar'
                    ? 'DIANTAR OLEH ARMADA PABRIK KE LOKASI LAPAK'
                    : 'DIAMBIL MANDIRI OLEH PEMILIK LAPAK DI PABRIK'}
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  {confirmModalPesanan.metode_pengiriman === 'diantar'
                    ? `Pabrik wajib mengalokasikan armada kendaraan pengiriman untuk mengantar ${confirmModalPesanan.jumlah_papan} papan tahu ke alamat: "${confirmModalPesanan.lapak?.alamat}".`
                    : `Pihak ${confirmModalPesanan.lapak?.nama_lapak} akan mengambil langsung ${confirmModalPesanan.jumlah_papan} papan tahu di fasilitas pabrik pada tanggal pengiriman.`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmModalPesanan(null)}
                  className="text-xs font-semibold px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === confirmModalPesanan.id_pesanan}
                  onClick={async () => {
                    const id = confirmModalPesanan.id_pesanan;
                    setConfirmModalPesanan(null);
                    await handleUpdateStatus(id, 'dikonfirmasi');
                  }}
                  className="text-xs font-bold px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl shadow-xs transition flex items-center cursor-pointer disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4 mr-1.5" />
                  Setujui & Konfirmasi Pesanan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATAT PEMBAYARAN LUNAS 100% */}
      {paymentModalPesanan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900 flex items-center mb-1">
              <CreditCard className="w-5 h-5 mr-2 text-emerald-600" />
              Pencatatan Pembayaran Tahu Lunas 100%
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Konfirmasi penerimaan pembayaran setelah pesanan berstatus dikirim
            </p>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Lapak Pemesan:</span>
                  <span className="font-semibold text-slate-900">
                    {paymentModalPesanan.lapak?.nama_lapak || '-'}
                  </span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Jumlah Pesanan:</span>
                  <span className="font-semibold text-slate-900">
                    {paymentModalPesanan.jumlah_papan} papan (@ Rp 45.000)
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-900">Nominal Wajib Lunas:</span>
                  <span className="text-lg font-extrabold text-emerald-600">
                    Rp {Number(paymentModalPesanan.total_harga).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Metode Pembayaran Diterima
                </label>
                <select
                  value={metodePembayaran}
                  onChange={(e) => setMetodePembayaran(e.target.value as MetodePembayaran)}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2.5 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="tunai">Tunai / Cash (Saat penyerahan produk)</option>
                  <option value="transfer">Transfer Bank</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalPesanan(null)}
                  className="text-xs font-semibold px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition disabled:opacity-50 flex items-center cursor-pointer"
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Pembayaran & Selesaikan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH LAPAK */}
      {showAddLapakModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900 flex items-center mb-1">
              <Store className="w-5 h-5 mr-2 text-red-600" />
              Pendaftaran Cabang Lapak Baru
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Daftarkan salah satu dari cabang lapak distribusi pabrik
            </p>

            <form onSubmit={handleCreateLapak} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Akun Pemilik Lapak
                </label>
                <select
                  required
                  value={newLapakUserId}
                  onChange={(e) => setNewLapakUserId(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Pilih Akun Pemilik --</option>
                  {userListWithoutLapak.map((u) => (
                    <option key={u.id_user} value={u.id_user}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Lapak / Cabang
                </label>
                <input
                  type="text"
                  required
                  value={newLapakName}
                  onChange={(e) => setNewLapakName(e.target.value)}
                  placeholder="Contoh: Lapak Pasar Wage Blok A"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Alamat Lengkap Pengiriman
                </label>
                <textarea
                  rows={2}
                  required
                  value={newLapakAlamat}
                  onChange={(e) => setNewLapakAlamat(e.target.value)}
                  placeholder="Lokasi kios/pengantaran tahu"
                  className="w-full text-sm border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLapakModal(false)}
                  className="text-xs font-semibold px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addLapakLoading}
                  className="text-xs font-bold px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {addLapakLoading ? 'Menyimpan...' : 'Simpan Lapak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
