import React from 'react';
import { PesananWithLapak, Lapak } from '@/types/database';
import { Store, Truck, Package, TrendingUp, Users, PieChart, Layers } from 'lucide-react';

interface Props {
  pesananList: PesananWithLapak[];
  lapakList: (Lapak & { users?: any })[];
}

export function AdminVisualCharts({ pesananList, lapakList }: Props) {
  const totalOrders = pesananList.length;

  // 1. Peringkat Pemesanan Lapak (Horizontal Bar Chart seperti "Top 10 Stores by sales" di referensi)
  const stallPapanMap: { [stallName: string]: number } = {};

  // Inisialisasi seluruh nama lapak
  lapakList.forEach((l) => {
    stallPapanMap[l.nama_lapak] = 0;
  });

  // Hitung akumulasi papan per lapak dari pesanan riil
  pesananList.forEach((p) => {
    const name = p.lapak?.nama_lapak || 'Lapak Cabang';
    stallPapanMap[name] = (stallPapanMap[name] || 0) + Number(p.jumlah_papan);
  });

  // Urutkan lapak berdasarkan jumlah papan terbanyak
  const sortedStalls = Object.entries(stallPapanMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8); // Ambil top 8

  const maxPapanStall = Math.max(...sortedStalls.map((s) => s[1]), 1);

  // 2. Metode Penyerahan Tahu (Donut Chart seperti "Inventory Values" di referensi)
  const diantarCount = pesananList.filter((p) => p.metode_pengiriman === 'diantar').length;
  const ambilCount = pesananList.filter((p) => p.metode_pengiriman === 'ambil_sendiri').length;
  const diantarPct = totalOrders > 0 ? Math.round((diantarCount / totalOrders) * 100) : 50;
  const ambilPct = totalOrders > 0 ? 100 - diantarPct : 50;

  // Koordinat SVG Donut
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const diantarStrokeDash = (diantarPct / 100) * circumference;

  // 3. Tren Pemesanan Harian (Line/Curve Chart seperti "Expense vs Profit" di referensi)
  const dateVolumeMap: { [date: string]: number } = {};
  pesananList.forEach((p) => {
    dateVolumeMap[p.tanggal_pesanan] = (dateVolumeMap[p.tanggal_pesanan] || 0) + Number(p.jumlah_papan);
  });

  const sortedDates = Object.keys(dateVolumeMap).sort().slice(-6);
  const maxDayVolume = Math.max(...sortedDates.map((d) => dateVolumeMap[d]), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
      {/* Kolom Kiri Tengah: 2 Card Kecil (Metode Distribusi Donut & Lapak Mitra) */}
      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-5">
        {/* Card: Total Mitra Lapak Cabang */}
        <div className="sm:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold text-slate-800">Mitra Lapak</span>
              <span className="text-[11px] text-slate-400 font-medium">{lapakList.length} Cabang</span>
            </div>

            <div className="mt-3 flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-2xs">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">
                  {lapakList.filter((l) => l.status_aktif).length} Lapak
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Aktif Beroperasi</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Nonaktif:</span>
            <span className="font-semibold text-rose-600">
              {lapakList.filter((l) => !l.status_aktif).length} Cabang
            </span>
          </div>
        </div>

        {/* Card: Metode Distribusi Tahu (Donut Chart) */}
        <div className="sm:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800">Metode Penyerahan</span>
            <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
              {totalOrders} Pesanan
            </span>
          </div>

          <div className="flex items-center justify-around py-1">
            {/* SVG Donut */}
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring (Ambil Sendiri) */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="text-slate-200 stroke-current"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Active Ring (Diantar Armada Pabrik) */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="text-red-600 stroke-current"
                  strokeWidth="12"
                  strokeDasharray={`${diantarStrokeDash} ${circumference}`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-xs font-bold text-slate-900">{diantarPct}%</span>
                <span className="block text-[9px] text-slate-400 font-medium">Diantar</span>
              </div>
            </div>

            {/* Legend Donut */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-600 shrink-0" />
                <span className="text-slate-600 text-[11px]">Diantar Pabrik:</span>
                <strong className="text-slate-900 font-bold">{diantarCount}</strong>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 shrink-0" />
                <span className="text-slate-600 text-[11px]">Ambil Sendiri:</span>
                <strong className="text-slate-900 font-bold">{ambilCount}</strong>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            Distribusi armada antar langsung ke kios lapak
          </div>
        </div>

        {/* Card: Tren Harian Pemesanan (Wave / Trend Curve SVG) */}
        <div className="sm:col-span-12 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Tren Volume Pemesanan Harian</span>
              <span className="text-[11px] text-slate-400">Riwayat akumulasi papan tahu per tanggal transaksi</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Data Riil
            </span>
          </div>

          {sortedDates.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-xs text-slate-400">
              Belum ada riwayat transaksi untuk grafik tren.
            </div>
          ) : (
            <div className="pt-2">
              <div className="h-32 flex items-end justify-between gap-3 px-2">
                {sortedDates.map((date, idx) => {
                  const vol = dateVolumeMap[date];
                  const heightPct = Math.max(15, Math.round((vol / maxDayVolume) * 100));
                  const isMax = vol === maxDayVolume && vol > 0;
                  const dateParts = date.split('-');
                  const dateFmt = `${dateParts[2]}/${dateParts[1]}`;

                  return (
                    <div key={date} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {isMax && (
                        <span className="absolute -top-6 text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-xs">
                          Puncak: {vol} papan
                        </span>
                      )}

                      <span className="text-[10px] font-bold text-slate-700 mb-1">
                        {vol}
                      </span>

                      <div
                        className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                          isMax ? 'bg-red-600 shadow-xs' : 'bg-slate-700 hover:bg-slate-800'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />

                      <span className="text-[10px] text-slate-500 font-medium mt-1.5 truncate">
                        {dateFmt}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kolom Kanan: Peringkat Pemesanan Cabang Lapak (Horizontal Bar Chart gaya "Top 10 Stores by sales") */}
      <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Peringkat Pemesanan Cabang Lapak</span>
              <span className="text-[11px] text-slate-400">Akumulasi papan tahu yang telah dipesan</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              Top Cabang
            </span>
          </div>

          {sortedStalls.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada pesanan masuk dari cabang lapak.
            </div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {sortedStalls.map(([stallName, papanCount], idx) => {
                const widthPct = maxPapanStall > 0 ? Math.max(8, Math.round((papanCount / maxPapanStall) * 100)) : 8;
                const isTop1 = idx === 0 && papanCount > 0;

                return (
                  <div key={stallName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 truncate max-w-[180px] flex items-center">
                        <span className={`w-4 text-[10px] font-bold ${isTop1 ? 'text-red-600' : 'text-slate-400'}`}>
                          #{idx + 1}
                        </span>
                        <span className="truncate">{stallName}</span>
                      </span>
                      <span className="font-bold text-slate-900 shrink-0 text-[11px]">
                        {papanCount} papan
                      </span>
                    </div>

                    {/* Horizontal Bar */}
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isTop1 ? 'bg-red-600' : 'bg-slate-700'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 text-center">
          Monitoring seluruh cabang lapak mitra pabrik tahu
        </div>
      </div>
    </div>
  );
}
