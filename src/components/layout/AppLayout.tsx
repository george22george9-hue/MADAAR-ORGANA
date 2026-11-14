'use client';

// ====================================================================
// ORGANA App Layout Shell — Secured Route Protection
// Developed by MADAAR Technologies
// ====================================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { NotificationBanner } from '@/components/notifications/NotificationBanner';
import { PushSubscriptionPrompt } from '@/components/notifications/PushSubscriptionPrompt';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoadingAuth, isAuthenticated, router]);

  // Show clean splash while checking saved login session
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#F7F4F3] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#702C3B] text-white flex items-center justify-center font-bold text-xl mx-auto shadow-md animate-pulse">
            أ
          </div>
          <div className="text-xs font-bold text-[#421923]">مارجرجس سندبيس — أورجانا</div>
        </div>
      </div>
    );
  }

  // Not authenticated: wait for redirect
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#F7F4F3]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onToggleMobileNav={() => setMobileNavOpen(true)} />
        <NotificationBanner />

        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Navigation Drawer & Fixed Bottom Bar */}
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        {/* Lock-Screen Web Push Prompt */}
        <PushSubscriptionPrompt />
      </div>
    </div>
  );
}
