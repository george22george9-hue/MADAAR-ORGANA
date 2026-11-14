'use client';

// ====================================================================
// ORGANA — 1-Sentence Smart Floating Notification Banner
// "انا عايز تجيله نوتفكيشن صغيرة فيها جملة واحده"
// Developed by MADAAR Technologies
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { ChurchNotification } from '@/types/organa';
import {
  Bell,
  BookOpen,
  Heart,
  Sparkles,
  X,
  Check,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';

export function NotificationBanner() {
  const { currentUser, isAuthenticated } = useAuth();
  const [activeNotification, setActiveNotification] = useState<ChurchNotification | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    let isMounted = true;

    async function loadNotifications() {
      try {
        // 1. Tuesday Automated Check: If today is Tuesday (getDay() === 2), ensure Tuesday reminder is created for this week
        const today = new Date();
        const isTuesday = today.getDay() === 2;

        if (isTuesday) {
          const tuesdayKey = `organa_tuesday_sent_${today.getFullYear()}_${today.getMonth()}_${today.getDate()}`;
          if (!localStorage.getItem(tuesdayKey)) {
            fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'tuesday_reminder', senderName: 'خدمة مارجرجس بسندبيس' }),
            })
              .then(() => localStorage.setItem(tuesdayKey, 'true'))
              .catch(() => {});
          }
        }

        // 2. Fetch notifications for current user
        const res = await fetch(`/api/notifications?userId=${currentUser.id}&familyId=${currentUser.assigned_family_id || ''}`);
        const data = await res.json();

        if (isMounted && data.success && Array.isArray(data.notifications)) {
          // Read dismissed list from localStorage
          const dismissedLocal: string[] = JSON.parse(localStorage.getItem('organa_dismissed_notifs') || '[]');

          // Find the first unread and non-dismissed notification
          const unread = data.notifications.find(
            (n: ChurchNotification) => !n.is_read && !dismissedLocal.includes(n.id)
          );

          if (unread) {
            setActiveNotification(unread);
          }
        }
      } catch (err) {
        console.error('Failed to load notification banner:', err);
      }
    }

    loadNotifications();

    // Listen to custom event for immediate updates when a broadcast is sent
    const handleRefresh = () => loadNotifications();
    window.addEventListener('organa:refresh_notifications', handleRefresh);

    return () => {
      isMounted = false;
      window.removeEventListener('organa:refresh_notifications', handleRefresh);
    };
  }, [isAuthenticated, currentUser]);

  const handleDismiss = async () => {
    if (!activeNotification) return;

    const notifId = activeNotification.id;
    setIsDismissed(true);

    // Save in localStorage immediately so it doesn't flash again
    try {
      const dismissedLocal: string[] = JSON.parse(localStorage.getItem('organa_dismissed_notifs') || '[]');
      if (!dismissedLocal.includes(notifId)) {
        dismissedLocal.push(notifId);
        localStorage.setItem('organa_dismissed_notifs', JSON.stringify(dismissedLocal));
      }
    } catch {}

    // Mark as read in Neon PostgreSQL DB
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', id: notifId }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!activeNotification || isDismissed) return null;

  // Icon & theme styling by notification type
  const isPriest = activeNotification.type === 'priest_broadcast' || activeNotification.sender_name?.includes('أبونا');
  const isTuesday = activeNotification.type === 'tuesday_prep';
  const isAbsence = activeNotification.type === 'servant_absence';
  const isAppAdmin = activeNotification.sender_name === 'إدارة الأبلكيشن' || activeNotification.title?.includes('إدارة الأبلكيشن');

  let bannerStyle = 'bg-[#FAF5F6] border-[#E8D9DC] text-[#421923]';
  let badgeStyle = 'bg-[#702C3B] text-white';
  let icon = <Bell className="w-4 h-4 text-[#702C3B]" />;
  let senderPrefix = activeNotification.sender_name;

  if (isAppAdmin) {
    bannerStyle = 'bg-sky-50/95 border-sky-200 text-sky-950 shadow-sm';
    badgeStyle = 'bg-sky-700 text-white';
    icon = <span className="text-sm">📱</span>;
    senderPrefix = 'إدارة الأبلكيشن';
  } else if (isPriest) {
    bannerStyle = 'bg-amber-50/95 border-amber-200 text-amber-950 shadow-sm';
    badgeStyle = 'bg-amber-600 text-white';
    icon = <span className="text-sm">✝️</span>;
    senderPrefix = 'قدس أبونا';
  } else if (isTuesday) {
    bannerStyle = 'bg-rose-50/95 border-rose-200 text-[#421923] shadow-sm';
    badgeStyle = 'bg-[#702C3B] text-white';
    icon = <span className="text-sm">📓</span>;
    senderPrefix = 'تذكير الثلاثاء';
  } else if (isAbsence) {
    bannerStyle = 'bg-purple-50/95 border-purple-200 text-purple-950 shadow-sm';
    badgeStyle = 'bg-purple-700 text-white';
    icon = <span className="text-sm">💌</span>;
    senderPrefix = 'افتقاد المحبة';
  }

  return (
    <div className="w-full px-3 md:px-6 pt-2 pb-1 animate-in slide-in-from-top-2 duration-300">
      <div className={`flex items-center justify-between gap-2.5 p-2.5 sm:px-4 rounded-xl border ${bannerStyle} backdrop-blur-sm transition-all`}>
        {/* Right side: Icon + Sender badge + Single sentence */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="shrink-0 flex items-center justify-center">
            {icon}
          </div>

          <span className={`hidden sm:inline-block px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 ${badgeStyle}`}>
            {senderPrefix}
          </span>

          <p className="text-xs sm:text-sm font-semibold truncate leading-tight">
            {activeNotification.message}
          </p>
        </div>

        {/* Left side: Dismiss action button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleDismiss}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 active:scale-95 text-xs font-bold transition-all"
            title="تم وقراءة الإشعار"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="text-[11px]">حسناً</span>
          </button>
        </div>
      </div>
    </div>
  );
}
