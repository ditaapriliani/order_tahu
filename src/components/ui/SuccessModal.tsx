'use client';

import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  badgeInfo?: string;
  onClose: () => void;
  buttonText?: string;
}

export function SuccessModal({
  isOpen,
  title,
  message,
  badgeInfo,
  onClose,
  buttonText = 'Mengerti / Selesai',
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop redup lembut dengan efek blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fadeIn"
      />

      {/* Kontainer Modal Tengah Layar */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 text-center overflow-hidden z-10 animate-scaleUp">
        {/* Dekorasi Latar Halus */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Tombol Tutup X di Pojok Kanan Atas */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          aria-label="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lingkaran Ikon Centang Hijau Besar yang Elegan */}
        <div className="relative mx-auto mb-4 w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-25" />
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border-2 border-emerald-200 shadow-inner ring-8 ring-emerald-50/80">
            <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
          </div>
        </div>

        {/* Judul Tebal */}
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug mb-2">
          {title}
        </h3>

        {/* Deskripsi Singkat */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5 max-w-xs mx-auto">
          {message}
        </p>

        {/* Badge Info Tambahan Opsional */}
        {badgeInfo && (
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold mb-6 border border-slate-200/80">
            <span>{badgeInfo}</span>
          </div>
        )}

        {/* Tombol Utama Merah: "Mengerti / Selesai" */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition shadow-md hover:shadow-lg cursor-pointer"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
