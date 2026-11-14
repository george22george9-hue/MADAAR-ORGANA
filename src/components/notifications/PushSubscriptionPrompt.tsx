'use client';

// ====================================================================
// ORGANA — Lock-Screen Push Notifications Enabler (PWA Web Push)
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { BellRing, Check, X, Smartphone, Loader2 } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushSubscriptionPrompt() {
  const { currentUser, isAuthenticated } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    // Check support for ServiceWorker and Push
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register SW if not already registered
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // If already granted, silently ensure backend has this user's subscription
        if (Notification.permission === 'granted') {
          reg.pushManager.getSubscription().then((sub) => {
            if (sub) {
              syncSubscriptionWithBackend(sub);
            }
          });
        }
      }).catch(console.warn);

      // If user hasn't made a choice or dismissed recently, prompt them
      const dismissedUntil = localStorage.getItem('organa_push_dismissed_until');
      const isPostponed = dismissedUntil && Number(dismissedUntil) > Date.now();

      if (Notification.permission === 'default' && !isPostponed) {
        // Show after a brief delay so page loads cleanly
        const timer = setTimeout(() => setShowPrompt(true), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, currentUser]);

  const syncSubscriptionWithBackend = async (sub: PushSubscription) => {
    if (!currentUser) return;
    try {
      const subJson = sub.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          subscription: subJson,
          userAgent: navigator.userAgent,
        }),
      });
    } catch (e) {
      console.warn('Failed to sync push subscription:', e);
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser) return;
    setIsSubscribing(true);

    try {
      // 1. Request permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') {
        setShowPrompt(false);
        return;
      }

      // 2. Fetch public VAPID key
      const keyRes = await fetch('/api/push/subscribe');
      const keyData = await keyRes.json();
      const publicKey = keyData.publicKey;

      if (!publicKey) {
        throw new Error('مفتاح الإشعارات غير متوفر حالياً');
      }

      // 3. Register push with Service Worker
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // 4. Save to Neon PostgreSQL
      await syncSubscriptionWithBackend(subscription);

      setSuccessNotice(true);
      setTimeout(() => {
        setShowPrompt(false);
        setSuccessNotice(false);
      }, 3000);
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      alert(err.message || 'تعذر تفعيل الإشعارات على هذا المتصفح');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    // Postpone prompt for 3 days
    localStorage.setItem(
      'organa_push_dismissed_until',
      String(Date.now() + 3 * 24 * 60 * 60 * 1000)
    );
  };

  if (!isSupported || !showPrompt || isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-40 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-[#702C3B]/20 p-4 relative overflow-hidden">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#702C3B]" />

        {successNotice ? (
          <div className="flex items-center gap-3 py-2 text-emerald-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm">تم تفعيل الإشعارات بنجاح! 🔔</p>
              <p className="text-[11px] text-emerald-700">ستصلك رسائل وتنبيهات الخدمة وشاشة الموبايل مقفولة.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-[#702C3B]">
                  <BellRing className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#421923] leading-tight">
                    تفعيل إشعارات شاشة الهاتف 📱
                  </h4>
                  <p className="text-[11px] text-[#81777A] mt-0.5">
                    كنيسة مارجرجس بسندبيس
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#421923] leading-relaxed">
              لتصلك رسائل قدس أبونا وتذكير كشكول الخدمة (الثلاثاء) مباشرة على شاشة قفل الموبايل بصوت واهتزاز حتى لو البرنامج مقفول.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className="flex-1 py-2 px-3 rounded-xl bg-[#702C3B] hover:bg-[#5b2330] disabled:bg-gray-300 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                {isSubscribing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جارٍ التفعيل...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>سماح بالإشعارات 🔔</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDismiss}
                className="py-2 px-3 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] hover:bg-gray-100 text-[#81777A] font-bold text-xs transition-colors"
              >
                لاحقاً
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
