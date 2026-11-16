'use client';

// ====================================================================
// ORGANA — Family Leader Dashboard (لوحة أمين الأسرة) — Simplified
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import {
  Users,
  CalendarCheck,
  BookOpen,
  AlertTriangle,
  ChevronLeft,
  MessageCircle
} from 'lucide-react';

export function FamilyLeaderDashboard() {
  const { currentUser, assignedFamilyId } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fId = assignedFamilyId || 'fam-prep-boys';
    fetch(`/api/dashboard?role=family_leader&familyId=${fId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assignedFamilyId]);

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-pulse max-w-lg mx-auto">
        <div className="h-24 bg-white rounded-2xl border border-[#EAE3E4]"></div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-[#EAE3E4]"></div>
          ))}
        </div>
      </div>
    );
  }

  const fam = data.family;

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#702C3B] to-[#421923] text-white rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs text-white/80">{currentUser?.full_name} • أمين أسرة</div>
          <a
            href={`https://wa.me/201202074649?text=${encodeURIComponent(
              `بتواصل معاك بخصوص منظومة اورجانا الكنسية انا (${currentUser?.full_name || 'أمين أسرة'})`
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
        <h1 className="text-lg font-bold">أسرة {fam?.name}</h1>
        <p className="text-[11px] text-white/80 mt-0.5">
          {fam?.meeting_day === 'Friday' ? 'الجمعة' : fam?.meeting_day} — {fam?.meeting_time}
        </p>
        <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-0.5">
          <span className="text-[11px] text-white/80 font-medium">مطرانية شبرا الخيمة وتوابعها</span>
          <span className="text-xs text-amber-200 font-bold">كنيسة الشهيد العظيم مارجرجس بسندبيس</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/attendance"
          className="p-4 rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-[0.98] flex flex-col"
        >
          <CalendarCheck className="w-7 h-7 mb-2 opacity-90" />
          <span className="font-bold text-sm">تسجيل الحضور</span>
          <span className="text-[10px] text-white/70 mt-0.5">حضور اللقاء</span>
        </Link>

        <Link
          href="/notebooks"
          className="p-4 rounded-2xl bg-[#702C3B] text-white shadow-sm hover:bg-[#5A232F] transition-all active:scale-[0.98] flex flex-col"
        >
          <BookOpen className="w-7 h-7 mb-2 opacity-90" />
          <span className="font-bold text-sm">الكشكول</span>
          <span className="text-[10px] text-white/70 mt-0.5">كتابة وتسليم التقرير</span>
        </Link>

        <Link
          href="/members"
          className="p-4 rounded-2xl bg-purple-700 text-white shadow-sm hover:bg-purple-800 transition-all active:scale-[0.98] flex flex-col"
        >
          <Users className="w-7 h-7 mb-2 opacity-90" />
          <span className="font-bold text-sm">مخدومو الأسرة</span>
          <span className="text-[10px] text-white/70 mt-0.5">{data.membersCount} مخدوم</span>
        </Link>

        <Link
          href="/alerts"
          className="p-4 rounded-2xl bg-amber-600 text-white shadow-sm hover:bg-amber-700 transition-all active:scale-[0.98] flex flex-col"
        >
          <AlertTriangle className="w-7 h-7 mb-2 opacity-90" />
          <span className="font-bold text-sm">تنبيهات الغياب</span>
          <span className="text-[10px] text-white/70 mt-0.5">{data.alerts?.length || 0} تنبيه</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-xl border border-[#EAE3E4] text-center">
          <div className="text-xl font-bold text-[#421923]">{data.membersCount}</div>
          <div className="text-[10px] text-[#81777A]">مخدوم</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#EAE3E4] text-center">
          <div className="text-xl font-bold text-[#421923]">{data.servantsCount}</div>
          <div className="text-[10px] text-[#81777A]">خادم</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#EAE3E4] text-center">
          <div className="text-xl font-bold text-[#421923]">{data.meetingsCount}</div>
          <div className="text-[10px] text-[#81777A]">لقاء</div>
        </div>
      </div>

      {/* Latest Meeting Quick Access */}
      {data.latestMeeting && (
        <div className="bg-white rounded-2xl p-4 border border-[#EAE3E4] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#702C3B] bg-[#FAF5F6] px-2 py-1 rounded-lg">
              آخر لقاء
            </span>
            <span className="text-[11px] text-[#81777A]">{data.latestMeeting.date}</span>
          </div>
          <h3 className="font-bold text-sm text-[#421923] mb-2">{data.latestMeeting.title}</h3>
          <div className="flex items-center gap-2">
            <Link
              href={`/notebooks/${data.latestMeeting.id}`}
              className="flex-1 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold text-center hover:bg-[#5A232F] transition-colors"
            >
              فتح الكشكول
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-3 pb-6 flex flex-col items-center gap-2">
        <a
          href={`https://wa.me/201202074649?text=${encodeURIComponent(
            `بتواصل معاك بخصوص منظومة اورجانا الكنسية انا (${currentUser?.full_name || 'أمين أسرة'})`
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
