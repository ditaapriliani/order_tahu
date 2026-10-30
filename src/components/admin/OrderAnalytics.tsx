import React from 'react';
import { PesananWithLapak } from '@/types/database';
import { BarChart3, TrendingUp, Truck, Package, PieChart, CheckCheck, Clock } from 'lucide-react';

interface OrderAnalyticsProps {
  pesananList: PesananWithLapak[];
}

export function OrderAnalytics({ pesananList }: OrderAnalyticsProps) {
  const totalCount = pesananList.length;

  if (totalCount === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200/90 text-center text-slate-500 shadow-xs">
        <BarChart3 className="w-10 h-10 mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-700">Belum Ada Data Transaksi</p>
        <p className="text-xs text-slate-400 mt-1">
          Grafik dan visualisasi data akan muncul otomatis setelah cabang lapak mengirim pesanan.
        </p>
      </div>
    );
  }

  // 1. Status Breakdown
  const selesaiCount = pesananList.filter((p) => p.status_pesanan === 'selesai').length;
  const dikirimCount = pesananList.filter((p) => p.status_pesanan === 'dikirim').length;
  const dikonfirmasiCount = pesananList.filter((p) => p.status_pesanan === 'dikonfirmasi').length;
  const menungguCount = pesananList.filter((p) => p.status_pesanan === 'menunggu_konfirmasi').length;
  const batalCount = pesananList.filter((p) => p.status_pesanan === 'dibatalkan').length;

  const selesaiPct = Math.round((selesaiCount / totalCount) * 100);
  const dikirimPct = Math.round((dikirimCount / totalCount) * 100);
  const dikonfirmasiPct = Math.round((dikonfirmasiCount / totalCount) * 100);
  const menungguPct = Math.round((menungguCount / totalCount) * 100);
  const batalPct = Math.round((batalCount / totalCount) * 100);

  // 2. Metode Penyerahan
  const diantarCount = pesananList.filter((p) => p.metode_pengiriman === 'diantar').length;
  const ambilCount = pesananList.filter((p) => p.metode_pengiriman === 'ambil_sendiri').length;
  const diantarPct = Math.round((diantarCount / totalCount) * 100);
  const ambilPct = Math.round((ambilCount / totalCount) * 100);

  // 3. Rekap Per Tanggal Pesanan (Maks 7 tanggal terbaru yang tercatat)
  const dateMap: { [date: string]: { totalPapan: number; totalOmsetLunas: number; count: number } } = {};

  pesananList.forEach((p) => {
    const d = p.tanggal_pesanan;
    if (!dateMap[d]) {
      dateMap[d] = { totalPapan: 0, totalOmsetLunas: 0, count: 0 };
    }
    dateMap[d].totalPapan += Number(p.jumlah_papan);
    dateMap[d].count += 1;
    if (p.status_pesanan === 'selesai') {
      dateMap[d].totalOmsetLunas += Number(p.total_harga);
    }
  });

  const sortedDates = Object.keys(dateMap).sort().slice(-7);
  const maxPapan = Math.max(...sortedDates.map((d) => dateMap[d].totalPapan), 1);

  return (
    <div className="space-y-6">
      {/* Grid: Grafik Tren Harian + Distribusi Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Tren Volume Pemesanan Nyata (SVG Bar Chart) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-red-600" />
                Aktivitas Volume Pemesanan Harian
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Jumlah papan tahu yang dipesan berdasarkan tanggal transaksi
              </p>
            </div>
            <span className="text-[11px] font-semibold bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-100">
              Data Riil Pabrik
            </span>
          </div>

          {/* Area Visualisasi Grafik SVG */}
          <div className="pt-2 pb-4">
            {sortedDates.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                Belum ada data tanggal pemesanan.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 pt-4 px-2">
                  {sortedDates.map((date) => {
                    const data = dateMap[date];
                    const heightPercent = Math.max(12, Math.round((data.totalPapan / maxPapan) * 100));

                    // Format tanggal pendek (contoh: 28 Okt)
                    const dateParts = date.split('-');
                    const dateFormatted = `${dateParts[2]}/${dateParts[1]}`;

                    return (
                      <div key={date} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                        {/* Tooltip Hover */}
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 pointer-events-none whitespace-nowrap shadow-md z-10">
                          <p className="font-bold">{date}</p>
                          <p>{data.totalPapan} papan ({data.count} pesanan)</p>
                          {data.totalOmsetLunas > 0 && (
                            <p className="text-emerald-300">
                              Lunas: Rp {data.totalOmsetLunas.toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>

                        {/* Nilai di atas bar */}
                        <span className="text-[11px] font-bold text-slate-700 mb-1.5">
                          {data.totalPapan}
                        </span>

                        {/* Bar Batang */}
                        <div
                          className="w-full max-w-[42px] bg-red-600 hover:bg-red-700 rounded-t-lg transition-all duration-300 shadow-2xs group-hover:ring-2 group-hover:ring-red-300"
                          style={{ height: `${heightPercent}%` }}
                        />

                        {/* Label Tanggal */}
                        <span className="text-[11px] font-medium text-slate-500 mt-2">
                          {dateFormatted}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-2">
                  Satuan: Papan Tahu per Tanggal Transaksi
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Distribusi Status & Metode */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <PieChart className="w-4 h-4 mr-2 text-slate-700" />
                Status & Penyerahan
              </h3>
              <span className="text-xs text-slate-500 font-semibold">{totalCount} Pesanan</span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="space-y-3 mb-5">
              <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                {selesaiPct > 0 && (
                  <div
                    style={{ width: `${selesaiPct}%` }}
                    className="bg-emerald-600 transition-all duration-500"
                    title={`Selesai: ${selesaiCount}`}
                  />
                )}
                {dikirimPct > 0 && (
                  <div
                    style={{ width: `${dikirimPct}%` }}
                    className="bg-purple-600 transition-all duration-500"
                    title={`Dikirim: ${dikirimCount}`}
                  />
                )}
                {dikonfirmasiPct > 0 && (
                  <div
                    style={{ width: `${dikonfirmasiPct}%` }}
                    className="bg-blue-600 transition-all duration-500"
                    title={`Dikonfirmasi: ${dikonfirmasiCount}`}
                  />
                )}
                {menungguPct > 0 && (
                  <div
                    style={{ width: `${menungguPct}%` }}
                    className="bg-amber-500 transition-all duration-500"
                    title={`Menunggu: ${menungguCount}`}
                  />
                )}
                {batalPct > 0 && (
                  <div
                    style={{ width: `${batalPct}%` }}
                    className="bg-rose-500 transition-all duration-500"
                    title={`Dibatalkan: ${batalCount}`}
                  />
                )}
              </div>

              {/* Status List */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                  <span className="flex items-center text-emerald-800 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 mr-1.5" />
                    Selesai
                  </span>
                  <span className="font-bold text-emerald-900">{selesaiCount} ({selesaiPct}%)</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/70 border border-purple-100">
                  <span className="flex items-center text-purple-800 font-medium">
                    <span className="w-2 h-2 rounded-full bg-purple-600 mr-1.5" />
                    Dikirim
                  </span>
                  <span className="font-bold text-purple-900">{dikirimCount} ({dikirimPct}%)</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/70 border border-amber-100">
                  <span className="flex items-center text-amber-800 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                    Menunggu
                  </span>
                  <span className="font-bold text-amber-900">{menungguCount} ({menungguPct}%)</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                  <span className="flex items-center text-blue-800 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-600 mr-1.5" />
                    Konfirmasi
                  </span>
                  <span className="font-bold text-blue-900">{dikonfirmasiCount} ({dikonfirmasiPct}%)</span>
                </div>
              </div>
            </div>

            {/* Metode Pengiriman Breakdown */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-500 block mb-2">
                Metode Distribusi Tahu:
              </span>
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-1.5">
                  <Truck className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-slate-700 font-medium">Diantar Pabrik:</span>
                  <span className="font-bold text-slate-900">{diantarCount} ({diantarPct}%)</span>
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-700 font-medium">Ambil Sendiri:</span>
                  <span className="font-bold text-slate-900">{ambilCount} ({ambilPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
