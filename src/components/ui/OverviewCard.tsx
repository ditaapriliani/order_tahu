import React, { ReactNode } from 'react';

interface OverviewCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  sublabel?: string;
  isAlert?: boolean;
  accentColor?: 'red' | 'emerald' | 'amber' | 'purple' | 'slate';
}

export function OverviewCard({
  label,
  value,
  icon,
  sublabel,
  isAlert = false,
  accentColor = 'slate',
}: OverviewCardProps) {
  const colorMap = {
    red: {
      card: isAlert ? 'bg-red-50/60 border-red-200' : 'bg-white border-slate-200/90',
      iconBox: 'bg-red-50 text-red-600 border border-red-100',
      text: 'text-red-700',
    },
    emerald: {
      card: 'bg-white border-slate-200/90',
      iconBox: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      text: 'text-slate-900',
    },
    amber: {
      card: isAlert ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200/90',
      iconBox: 'bg-amber-50 text-amber-600 border border-amber-100',
      text: 'text-amber-800',
    },
    purple: {
      card: 'bg-white border-slate-200/90',
      iconBox: 'bg-purple-50 text-purple-600 border border-purple-100',
      text: 'text-slate-900',
    },
    slate: {
      card: 'bg-white border-slate-200/90',
      iconBox: 'bg-slate-100 text-slate-700 border border-slate-200',
      text: 'text-slate-900',
    },
  };

  const currentTheme = colorMap[accentColor] || colorMap.slate;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 shadow-2xs hover:shadow-xs flex items-center space-x-3.5 ${currentTheme.card}`}
    >
      {/* Icon Box Rounded Square */}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${currentTheme.iconBox}`}
      >
        {icon}
      </div>

      {/* Value & Label */}
      <div className="min-w-0 flex-1">
        <div className={`text-xl sm:text-2xl font-bold tracking-tight truncate ${currentTheme.text}`}>
          {value}
        </div>
        <div className="text-xs font-medium text-slate-500 truncate mt-0.5">
          {label}
        </div>
        {sublabel && (
          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
