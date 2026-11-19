'use client';

// ====================================================================
// ORGANA — PWA Service Worker Registration & Mobile Install Prompt
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaRegistrationAndPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Check if already installed & running in standalone mode
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isRunningStandalone) {
      setIsStandalone(true);
      return; // Already installed, no need to show prompt
    }

    // 2. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[ORGANA PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[ORGANA PWA] Service Worker registration failed:', err);
        });
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    if (isIosDevice) {
      setIsIos(true);
      // Check if user dismissed iOS banner before
      const dismissed = localStorage.getItem('organa_ios_install_dismissed');
      if (!dismissed && isSafari) {
        // Show after 3 seconds of browsing
        const timer = setTimeout(() => setShowIosGuide(true), 3500);
        return () => clearTimeout(timer);
      }
    }

    // 4. Android / Chrome / Edge BeforeInstallPrompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if user dismissed prompt previously
      const dismissed = localStorage.getItem('organa_pwa_install_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Global custom event to trigger install prompt manually from Settings or Menu
    const handleManualTrigger = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      if (isIosDevice) {
        setShowIosGuide(true);
      } else if (deferredPrompt) {
        deferredPrompt.prompt();
      } else {
        setShowPrompt(true);
      }
    };
    window.addEventListener('organa-trigger-pwa-install', handleManualTrigger);

    window.addEventListener('appinstalled', () => {
      setInstalledSuccess(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      setTimeout(() => setInstalledSuccess(false), 4000);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('organa-trigger-pwa-install', handleManualTrigger);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
      }
    } catch (err) {
      console.error('Install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('organa_pwa_install_dismissed', 'true');
  };

  const handleDismissIos = () => {
    setShowIosGuide(false);
    localStorage.setItem('organa_ios_install_dismissed', 'true');
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Toast Notification When Installed Successfully */}
      {installedSuccess && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-sm mx-auto p-4 rounded-2xl bg-emerald-700 text-white shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-200" />
          <div className="text-xs">
            <strong className="block font-bold text-sm">تم تثبيت التطبيق بنجاح!</strong>
            يمكنك الآن فتح «أورجانا» مباشرة من الشاشة الرئيسية لهاتفك.
          </div>
        </div>
      )}

      {/* Android / Desktop Chrome PWA Install Banner */}
      {showPrompt && (
        <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:max-w-md z-40 bg-white/95 backdrop-blur-md border-2 border-[#702C3B]/20 p-4 rounded-3xl shadow-[0_10px_35px_rgba(66,25,35,0.18)] animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#702C3B] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm ring-2 ring-[#F0E4E7]">
              أ
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs md:text-sm text-[#421923]">
                  تثبيت «أورجانا» كتطبيق على هاتفك
                </h4>
                <button
                  onClick={handleDismiss}
                  className="p-1 text-[#81777A] hover:text-[#421923] rounded-lg"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-[#81777A] mt-0.5 leading-relaxed">
                يعمل كتطبيق أصلي سريع بدون شريط المتصفح، مع إمكانية الوصول السريع وسهولة التحضير.
              </p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#702C3B] hover:bg-[#5A1E2D] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>تثبيت التطبيق الآن</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="py-2 px-3 rounded-xl border border-[#EAE3E4] text-[#81777A] font-bold text-xs hover:bg-[#FAF5F6] transition-colors"
                >
                  لاحقاً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Guided Install Sheet */}
      {showIosGuide && (
        <div className="fixed bottom-20 left-3 right-3 z-40 bg-white/95 backdrop-blur-md border-2 border-[#702C3B]/20 p-4 rounded-3xl shadow-[0_10px_35px_rgba(66,25,35,0.18)] animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#702C3B] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                أ
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#421923]">تثبيت أورجانا على الآيفون</h4>
                <p className="text-[10px] text-[#81777A]">لإضافته كتطبيق على شاشتك الرئيسية</p>
              </div>
            </div>
            <button
              onClick={handleDismissIos}
              className="p-1 text-[#81777A] hover:text-[#421923] rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-[11px] text-[#421923] bg-[#FAF5F6] p-3 rounded-2xl border border-[#EAE3E4]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#702C3B] text-white flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
              <span>اضغط على زر المشاركة <strong>(Share)</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> في أسفل المتصفح.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#702C3B] text-white flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
              <span>اختر <strong>«إضافة إلى الصفحة الرئيسية»</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-gray-700" /> (Add to Home Screen).</span>
            </div>
          </div>

          <div className="mt-2.5 text-center">
            <button
              onClick={handleDismissIos}
              className="w-full py-1.5 rounded-xl bg-[#702C3B] text-white text-[11px] font-bold"
            >
              فهمت، حسناً
            </button>
          </div>
        </div>
      )}
    </>
  );
}
