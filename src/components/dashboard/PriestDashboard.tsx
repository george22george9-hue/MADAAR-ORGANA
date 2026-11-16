'use client';

// ====================================================================
// ORGANA — Admin/Priest Dashboard (لوحة الإدارة الشاملة)
// Simplified & Clean
// ====================================================================

import React, { useEffect, useState } from 'react';
import {
  Users,
  FolderTree,
  UserCheck,
  AlertTriangle,
  CalendarCheck,
  BookOpen,
  ShieldCheck,
  ChevronLeft,
  BarChart3,
  MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import { PriestServantsReport } from '@/components/dashboard/PriestServantsReport';

export function PriestDashboard() {
  const { currentRole, currentUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard?role=priest')
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-4 max-w-lg mx-auto animate-pulse pb-20">
        <div className="h-32 bg-white rounded-2xl border border-[#EAE3E4]"></div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-[#EAE3E4]"></div>
          ))}
        </div>
      </div>
    );
  }

  const roleLabel = currentRole === 'admin' ? 'إدارة المنظومة' : 'الكاهن';

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-24">
      {/* Hero Card */}
      <div className="bg-gradient-to-l from-[#5A1E2D] to-[#421923] text-white rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-white/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>{roleLabel} • {currentUser?.full_name}</span>
          </div>

          {/* Chic WhatsApp Contact Developer Button */}
          <a
            href={`https://wa.me/201202074649?text=${encodeURIComponent(
              `بتواصل معاك بخصوص منظومة اورجانا الكنسية انا (${currentUser?.full_name || 'مستخدم المنظومة'})`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 text-emerald-200 border border-emerald-400/40 text-[11px] font-bold transition-all shadow-sm backdrop-blur-sm"
            title="تواصل مع المطور على واتساب"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
            <span>تواصل مع المطور 💬</span>
          </a>
        </div>

        <h1 className="text-lg font-bold leading-tight">
          لوحة المتابعة الشاملة
        </h1>

        <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-0.5">
          <span className="text-[11px] text-white/80 font-medium">مطرانية شبرا الخيمة وتوابعها</span>
          <span className="text-xs text-amber-200 font-bold">كنيسة الشهيد العظيم مارجرجس بسندبيس</span>
        </div>
      </div>

      {/* Quick Actions — Big Friendly Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {currentRole === 'priest' ? (
          <>
            <Link
              href="/attendance/servants"
              className="p-4 rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-[0.98] flex flex-col"
            >
              <UserCheck className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">غياب ومتابعة الخدام</span>
              <span className="text-[10px] text-white/80 mt-0.5">القداس، الكشكول، والدرس</span>
            </Link>

            <Link
              href="/alerts"
              className="p-4 rounded-2xl bg-amber-600 text-white shadow-sm hover:bg-amber-700 transition-all active:scale-[0.98] flex flex-col"
            >
              <Users className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">غياب المخدومين والافتقاد</span>
              <span className="text-[10px] text-white/80 mt-0.5">رعاية الحالات الغائبة</span>
            </Link>

            <Link
              href="/notebooks"
              className="p-4 rounded-2xl bg-[#702C3B] text-white shadow-sm hover:bg-[#5A232F] transition-all active:scale-[0.98] flex flex-col"
            >
              <BookOpen className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">الكشاكيل والتقارير</span>
              <span className="text-[10px] text-white/80 mt-0.5">متابعة تقارير الأسر</span>
            </Link>

            <Link
              href="/users?tab=requests"
              className="p-4 rounded-2xl bg-sky-700 text-white shadow-sm hover:bg-sky-800 transition-all active:scale-[0.98] flex flex-col"
            >
              <ShieldCheck className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">الخدام الجدد والصلاحيات</span>
              <span className="text-[10px] text-white/80 mt-0.5">اعتماد وتسكين الخدام</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/attendance"
              className="p-4 rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-[0.98] flex flex-col"
            >
              <CalendarCheck className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">تسجيل الحضور</span>
              <span className="text-[10px] text-white/70 mt-0.5">رصد حضور اللقاء</span>
            </Link>

            <Link
              href="/attendance/servants"
              className="p-4 rounded-2xl bg-teal-700 text-white shadow-sm hover:bg-teal-800 transition-all active:scale-[0.98] flex flex-col"
            >
              <UserCheck className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">سجل غياب الخدام</span>
              <span className="text-[10px] text-white/70 mt-0.5">القداس والكشاكيل</span>
            </Link>

            <Link
              href="/notebooks"
              className="p-4 rounded-2xl bg-[#702C3B] text-white shadow-sm hover:bg-[#5A232F] transition-all active:scale-[0.98] flex flex-col"
            >
              <BookOpen className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">الكشاكيل</span>
              <span className="text-[10px] text-white/70 mt-0.5">تقارير الأسبوع</span>
            </Link>

            <Link
              href="/users"
              className="p-4 rounded-2xl bg-sky-700 text-white shadow-sm hover:bg-sky-800 transition-all active:scale-[0.98] flex flex-col"
            >
              <ShieldCheck className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">إدارة المستخدمين</span>
              <span className="text-[10px] text-white/70 mt-0.5">الحسابات والطلبات</span>
            </Link>
          </>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3E4] shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#81777A]">الخدام</span>
            <UserCheck className="w-4 h-4 text-[#702C3B]" />
          </div>
          <span className="text-2xl font-bold text-[#282326]">{data.servantsCount || 0}</span>
          <div className="text-[10px] text-[#81777A] mt-0.5">بجميع الأسر</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3E4] shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#81777A]">المخدومون</span>
            <Users className="w-4 h-4 text-[#702C3B]" />
          </div>
          <span className="text-2xl font-bold text-[#282326]">{data.membersCount || 0}</span>
          <div className="text-[10px] text-[#81777A] mt-0.5">إجمالي المخدومين</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3E4] shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#81777A]">الكشاكيل</span>
            <BookOpen className="w-4 h-4 text-[#702C3B]" />
          </div>
          <span className="text-2xl font-bold text-[#282326]">{data.submittedReports || 0}</span>
          <div className="text-[10px] text-[#81777A] mt-0.5">تم تسليمها</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3E4] border-r-4 border-r-red-500 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#81777A]">تنبيهات غياب</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-2xl font-bold text-red-600">{data.alertsCount || 0}</span>
          <Link href="/alerts" className="text-[10px] font-bold text-red-600 hover:underline mt-0.5 block">
            متابعة الافتقاد ←
          </Link>
        </div>
      </div>

      {/* Pastoral Servants Performance & Attendance Report */}
      <PriestServantsReport />

      {/* Families Grid */}
      {data.familyStats && data.familyStats.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#282326]">قطاعات وأسر الكنيسة</h2>
            <Link href="/families" className="text-xs font-bold text-[#702C3B] flex items-center gap-0.5 hover:underline">
              <span>عرض الكل</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {data.familyStats.map((fam: any) => (
              <Link
                key={fam.id}
                href="/families"
                className="bg-white p-3 rounded-xl border border-[#EAE3E4] shadow-sm hover:border-[#702C3B]/40 transition-all"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${(fam.members_count || 0) > 0 ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  <h3 className="font-bold text-xs text-[#282326] truncate">{fam.name}</h3>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#81777A]">
                  <span>{fam.members_count || 0} مخدوم</span>
                  <span>{fam.servants_count || 0} خادم</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-3 pb-6 flex flex-col items-center gap-2">
        <a
          href={`https://wa.me/201202074649?text=${encodeURIComponent(
            `بتواصل معاك بخصوص منظومة اورجانا الكنسية انا (${currentUser?.full_name || 'مستخدم المنظومة'})`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-all shadow-sm active:scale-95"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>تواصل مع المطور (واتساب 01202074649) 💬</span>
        </a>
        <div className="text-[10px] text-[#81777A]">
          منظومة أورجانا • MADAAR Technologies • مطرانية شبرا الخيمة وتوابعها
        </div>
      </div>
    </div>
  );
}
