import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: 'red' | 'emerald' | 'amber' | 'purple' | 'slate';
  badge?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'slate',
  badge,
}: StatCardProps) {
  const variantStyles = {
    red: {
      border: 'border-slate-200/90 hover:border-red-300',
      iconBg: 'bg-red-50 text-red-600 border border-red-100',
      valueColor: 'text-slate-900',
    },
    emerald: {
      border: 'border-slate-200/90 hover:border-emerald-300',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      valueColor: 'text-slate-900',
    },
    amber: {
      border: 'border-slate-200/90 hover:border-amber-300',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      valueColor: 'text-amber-700',
    },
    purple: {
      border: 'border-slate-200/90 hover:border-purple-300',
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
      valueColor: 'text-purple-700',
    },
    slate: {
      border: 'border-slate-200/90 hover:border-slate-300',
      iconBg: 'bg-slate-100 text-slate-700 border border-slate-200',
      valueColor: 'text-slate-900',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`bg-white p-5 rounded-2xl shadow-xs border ${style.border} transition-all duration-200 hover:shadow-sm flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            {title}
          </span>
          <div className={`text-2xl font-bold tracking-tight ${style.valueColor}`}>
            {value}
          </div>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.iconBg}`}>
          {icon}
        </div>
      </div>

      {(subtitle || badge) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {subtitle && <span>{subtitle}</span>}
          {badge && (
            <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 text-slate-700">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
