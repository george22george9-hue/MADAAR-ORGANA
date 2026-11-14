'use client';

// ====================================================================
// ORGANA Root Route (/) — Authentication Guard & Entry Redirect
// Default entry point is /login for unauthenticated visitors
// Developed by MADAAR Technologies
// ====================================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';

export default function HomePage() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, isLoadingAuth, router]);

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
