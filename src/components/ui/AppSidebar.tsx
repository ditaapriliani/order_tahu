'use client';

import React, { ReactNode } from 'react';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;
}

interface AppSidebarProps {
  userName: string;
  userRoleLabel: string;
  userSubLabel?: string;
  navItems: NavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  brandTitle?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function AppSidebar({
  userName,
  userRoleLabel,
  userSubLabel,
  navItems,
  activeId,
  onSelect,
  brandTitle = 'Pabrik Tahu',
  isOpenMobile = false,
  onCloseMobile,
}: AppSidebarProps) {
  // Ambil inisial huruf nama
  const initials = userName.slice(0, 2).toUpperCase() || 'PT';

  return (
    <>
      {/* Overlay Backdrop Mobile */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#18222d] text-white flex flex-col justify-between p-5 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:rounded-3xl lg:my-3 lg:ml-3 lg:shadow-xl ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Header Profil User seperti di Referensi */}
          <div className="flex flex-col items-center text-center pt-2 pb-6 border-b border-white/10">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 to-red-700 flex items-center justify-center font-bold text-white text-lg shadow-md ring-4 ring-white/10">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#18222d] flex items-center justify-center" />
            </div>

            <h2 className="text-sm font-bold text-white tracking-tight">{userName}</h2>
            <div className="inline-flex items-center space-x-1 text-[11px] font-medium text-red-300 mt-0.5">
              <Shield className="w-3 h-3 text-red-400" />
              <span>{userRoleLabel}</span>
            </div>
            {userSubLabel && (
              <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                {userSubLabel}
              </span>
            )}
          </div>

          {/* Navigasi Menu berbentuk Kapsul (Pill Style) */}
          <nav className="mt-5 space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-md font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={isActive ? 'text-red-600' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        isActive
                          ? 'bg-red-100 text-red-700'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar: Tombol Logout */}
        <div className="pt-4 border-t border-white/10">
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400" />
              <span>Keluar (Logout)</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
