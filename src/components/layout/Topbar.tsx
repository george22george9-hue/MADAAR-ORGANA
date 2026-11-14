'use client';

// ====================================================================
// ORGANA Topbar — Production-Ready, Simplified
// Developed by MADAAR Technologies
// ====================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import {
  Bell,
  Menu,
  UserPlus,
  LogOut
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface TopbarProps {
  onToggleMobileNav?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'إدارة المنظومة',
  priest: 'الكاهن',
  service_secretary: 'أمين الخدمة',
  family_leader: 'أمين الأسرة',
  servant: 'خادم',
};

export function Topbar({ onToggleMobileNav }: TopbarProps) {
  const { currentRole, currentUser, logout, canManageUsers } = useAuth();
  const router = useRouter();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    if (canManageUsers) {
      fetch('/api/join-requests')
        .then(r => r.json())
        .then(data => {
          if (data.success && typeof data.pendingCount === 'number') {
            setPendingRequestsCount(data.pendingCount);
          }
        })
        .catch(() => {});
    }
  }, [canManageUsers]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-[#EAE3E4] px-3 md:px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_2px_rgba(66,25,35,0.02)]">
      {/* Right: Hamburger + Logo */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMobileNav}
          className="p-2 rounded-xl border border-[#EAE3E4] md:hidden hover:bg-[#FAF5F6] text-[#421923] transition-colors"
          aria-label="القائمة"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#702C3B] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
            أ
          </div>
          <div className="hidden sm:block">
            <div className="font-bold text-sm text-[#421923] leading-tight">
              مارجرجس سندبيس
            </div>
            <div className="text-[10px] text-[#81777A] leading-tight">
              {ROLE_LABELS[currentRole] || currentRole} • {currentUser.full_name}
            </div>
          </div>
        </Link>
      </div>

      {/* Left: Actions */}
      <div className="flex items-center gap-1.5">
        {/* Pending Requests — admin/priest/secretary only */}
        {canManageUsers && pendingRequestsCount > 0 && (
          <Link
            href="/users?tab=requests"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-bold transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">طلبات</span>
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
              {pendingRequestsCount}
            </span>
          </Link>
        )}

        {/* Notifications */}
        <Link
          href="/alerts"
          className="relative p-2 rounded-lg border border-[#EAE3E4] text-[#421923] hover:bg-[#FAF5F6] transition-colors"
          title="التنبيهات"
        >
          <Bell className="w-4 h-4" />
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg border border-[#EAE3E4] text-[#81777A] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          title="تسجيل الخروج"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
