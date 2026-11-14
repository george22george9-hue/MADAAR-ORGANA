'use client';

// ====================================================================
// ORGANA Topbar — Production-Ready with Interactive Notification Center
// Developed by MADAAR Technologies
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import {
  Bell,
  Menu,
  UserPlus,
  LogOut,
  Radio,
  BookOpen,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChurchNotification } from '@/types/organa';
import { BroadcastModal } from '@/components/notifications/BroadcastModal';

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
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [notifications, setNotifications] = useState<ChurchNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canBroadcast = currentRole === 'admin' || currentRole === 'priest' || currentRole === 'service_secretary';

  const fetchNotifications = () => {
    if (!currentUser) return;
    fetch(`/api/notifications?userId=${currentUser.id}&familyId=${currentUser.assigned_family_id || ''}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnreadNotifsCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});
  };

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

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id }),
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadNotifsCount(prev => Math.max(0, prev - 1));
      // Trigger update on floating banner
      window.dispatchEvent(new CustomEvent('organa:refresh_notifications'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendTuesdayReminder = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tuesday_reminder', senderName: currentUser?.full_name || 'إدارة الخدمة' }),
      });
      fetchNotifications();
      window.dispatchEvent(new CustomEvent('organa:refresh_notifications'));
      alert('تم إرسال تذكير تحضير الكشكول لجميع الخدام بنجاح! 📓');
    } catch (err) {
      alert('تعذر إرسال التذكير');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
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
                {ROLE_LABELS[currentRole] || currentRole} • {currentUser?.full_name}
              </div>
            </div>
          </Link>
        </div>

        {/* Left: Actions */}
        <div className="flex items-center gap-1.5" ref={dropdownRef}>
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

          {/* Notifications Bell & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(prev => !prev)}
              className={`relative p-2 rounded-lg border transition-colors ${
                isNotifOpen
                  ? 'border-[#702C3B] bg-[#FAF5F6] text-[#702C3B]'
                  : 'border-[#EAE3E4] text-[#421923] hover:bg-[#FAF5F6]'
              }`}
              title="الإشعارات والرسائل"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifsCount > 9 ? '+9' : unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Notification Center Dropdown */}
            {isNotifOpen && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#EAE3E4] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="p-3 bg-[#FAF5F6] border-b border-[#EAE3E4] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#421923]">الإشعارات والرسائل</span>
                    {unreadNotifsCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                        {unreadNotifsCount} جديد
                      </span>
                    )}
                  </div>
                  {canBroadcast && (
                    <button
                      onClick={() => {
                        setIsNotifOpen(false);
                        setIsBroadcastOpen(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#702C3B] hover:underline"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>إرسال تعميم 📢</span>
                    </button>
                  )}
                </div>

                {/* Quick actions for Priest/Admin */}
                {canBroadcast && (
                  <div className="p-2 border-b border-[#EAE3E4] bg-white flex items-center gap-2">
                    <button
                      onClick={handleSendTuesdayReminder}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-[#702C3B] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#702C3B]" />
                      <span>تذكير الكشكول (الثلاثاء)</span>
                    </button>
                  </div>
                )}

                {/* Notifications List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-[#EAE3E4]/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#81777A]">
                      لا توجد رسائل جديدة حالياً 🕊️
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => {
                      const isUnread = !n.is_read;
                      return (
                        <div
                          key={n.id}
                          className={`p-3 transition-colors ${
                            isUnread ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-[#FAF5F6]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                {n.type === 'priest_broadcast' && <span className="text-xs">✝️</span>}
                                {n.type === 'tuesday_prep' && <span className="text-xs">📓</span>}
                                {n.type === 'servant_absence' && <span className="text-xs">💌</span>}
                                <span className="text-[11px] font-bold text-[#421923] truncate">
                                  {n.title}
                                </span>
                              </div>
                              <p className="text-xs text-[#421923] font-medium line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-[#81777A]">
                                <span>{n.sender_name}</span>
                                <span>•</span>
                                <span>{new Date(n.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>

                            {/* Mark read button */}
                            {isUnread && (
                              <button
                                onClick={(e) => handleMarkAsRead(n.id, e)}
                                className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0"
                                title="تحديد كمقروء"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer link to alerts */}
                <div className="p-2.5 bg-[#FAF5F6] border-t border-[#EAE3E4] text-center">
                  <Link
                    href="/alerts"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs font-bold text-[#702C3B] hover:underline flex items-center justify-center gap-1"
                  >
                    <span>عرض سجل التنبيهات والغياب الكامل</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

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

      {/* Broadcast Dialog for Priest / Admin */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        onSuccess={() => {
          fetchNotifications();
          window.dispatchEvent(new CustomEvent('organa:refresh_notifications'));
        }}
      />
    </>
  );
}
