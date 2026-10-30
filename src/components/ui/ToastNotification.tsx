'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  show: boolean;
  type: 'success' | 'error';
  title: string;
  message?: string;
  onClose: () => void;
  duration?: number;
}

export function ToastNotification({
  show,
  type,
  title,
  message,
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

  if (!show) return null;

  const isSuccess = type === 'success';

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 transition-all duration-300 ease-out animate-fadeIn">
      <div
        className={`bg-white rounded-2xl shadow-xl border p-4 flex items-start space-x-3.5 ${
          isSuccess ? 'border-emerald-200/80 shadow-emerald-500/10' : 'border-rose-200/80 shadow-rose-500/10'
        }`}
      >
        {/* Icon Box */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            isSuccess
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-rose-50 text-rose-600 border-rose-100'
          }`}
        >
          {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>

        {/* Text Content */}
        <div className="flex-1 pt-0.5 min-w-0">
          <h4 className="text-sm font-bold text-slate-900 leading-snug">{title}</h4>
          {message && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{message}</p>}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
