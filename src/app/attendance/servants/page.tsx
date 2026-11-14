'use client';

// ====================================================================
// ORGANA — Servants Pastoral Absence & Attendance Roll (/attendance/servants)
// "ابونا هيظهر قدامه غياب كل الخدام في صفحه علشان يتابع كل حاجه"
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PriestServantsReport } from '@/components/dashboard/PriestServantsReport';
import { UserCheck, ShieldCheck, Heart, Sparkles, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ServantsAttendancePage() {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-20">
        {/* Pastoral Header Banner */}
        <div className="bg-gradient-to-l from-[#5A1E2D] to-[#421923] text-white rounded-2xl p-6 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 text-xs text-white/80">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>سجل المتابعة الرعوية الشاملة • كنيسة مارجرجس بسندبيس</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold leading-tight flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-amber-300" />
                <span>سجل حضور وغياب الخدام</span>
              </h1>
              <p className="text-xs text-white/80 mt-1.5 leading-relaxed max-w-2xl">
                متابعة حضور القداس الإلهي، تحضير الكشكول، إلقاء الدروس، ورصد الغياب والاعتذارات لجميع الخدام عبر كافة أسر الخدمة.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/alerts"
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all flex items-center gap-1.5 shrink-0"
              >
                <span>غياب المخدومين (الافتقاد)</span>
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Live Servants Pastoral Report Component */}
        <PriestServantsReport />
      </div>
    </AppLayout>
  );
}
