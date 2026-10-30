import React from 'react';
import { StatusPesanan } from '@/types/database';
import { Clock, CheckCircle, Truck, CheckCheck, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: StatusPesanan | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'menunggu_konfirmasi':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs ${sizeClasses}`}
        >
          <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
          <span>Menunggu Konfirmasi</span>
        </span>
      );
    case 'dikonfirmasi':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs ${sizeClasses}`}
        >
          <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
          <span>Dikonfirmasi Pabrik</span>
        </span>
      );
    case 'dikirim':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-purple-50 text-purple-800 border border-purple-200/80 shadow-2xs ${sizeClasses}`}
        >
          <Truck className="w-3.5 h-3.5 mr-1.5 text-purple-600 shrink-0" />
          <span>Dalam Pengiriman</span>
        </span>
      );
    case 'selesai':
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs ${sizeClasses}`}
        >
          <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
          <span>Selesai / Lunas</span>
        </span>
      );
    case 'dibatalkan':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 shadow-2xs ${sizeClasses}`}
        >
          <XCircle className="w-3.5 h-3.5 mr-1.5 text-rose-600 shrink-0" />
          <span>Dibatalkan</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
}
