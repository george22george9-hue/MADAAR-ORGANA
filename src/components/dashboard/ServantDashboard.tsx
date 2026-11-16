'use client';

// ====================================================================
// ORGANA — Servant Dashboard (لوحة الخادم) — Simplified
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import {
  Users,
  CalendarCheck,
  HeartHandshake,
  Phone,
  Check,
  ChevronLeft,
  MessageCircle
} from 'lucide-react';

export function ServantDashboard() {
  const { currentUser, assignedFamilyId } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    const sId = currentUser.id || '';
    const fId = assignedFamilyId || '';
    fetch(`/api/dashboard?role=servant&servantId=${sId}&familyId=${fId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id, assignedFamilyId]);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          result: 'successful_contact',
          notes: 'تم الاتصال بالأسرة والاطمئنان على المخدوم.',
          actorRole: 'servant',
        }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-pulse max-w-lg mx-auto">
        <div className="h-24 bg-white rounded-2xl border border-[#EAE3E4]"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-white rounded-2xl border border-[#EAE3E4]"></div>
          <div className="h-24 bg-white rounded-2xl border border-[#EAE3E4]"></div>
        </div>
      </div>
    );
  }

  const members = data.assignedMembers || [];
  const tasks = data.pendingTasks || [];

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24">
      {/* Greeting */}
      <div className="bg-gradient-to-l from-[#702C3B] to-[#421923] text-white rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xs text-white/80">✝️ سلام ونعمة • خادم معتمد</div>
          <a
            href={`https://wa.me/201202074649?text=${encodeURIComponent(
              `بتواصل معاك بخصوص منظومة اورجانا الكنسية انا (${currentUser?.full_name || 'خادم'})`
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
        <h1 className="text-xl font-bold">{currentUser.full_name}</h1>
        <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-col gap-0.5">
          <span className="text-[11px] text-white/80 font-medium">مطرانية شبرا الخيمة وتوابعها</span>
          <span className="text-xs text-amber-200 font-bold">كنيسة الشهيد العظيم مارجرجس بسندبيس</span>
        </div>
      </div>

      {/* 3 Big Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/attendance"
          className="p-4 rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-[0.98] flex flex-col col-span-2"
        >
          <CalendarCheck className="w-7 h-7 mb-2 opacity-90" />
          <span className="font-bold text-base">تسجيل حضور اللقاء</span>
          <span className="text-[11px] text-white/70 mt-0.5">اضغط لرصد حضور المخدومين</span>
        </Link>

        <Link
          href="/members"
          className="p-4 rounded-2xl bg-[#702C3B] text-white shadow-sm hover:bg-[#5A232F] transition-all active:scale-[0.98] flex flex-col"
        >
          <Users className="w-6 h-6 mb-2 opacity-90" />
          <span className="font-bold text-sm">مخدوميني</span>
          <span className="text-[10px] text-white/70 mt-0.5">{members.length} مخدوم</span>
        </Link>

        <Link
          href="/tasks"
          className="p-4 rounded-2xl bg-amber-600 text-white shadow-sm hover:bg-amber-700 transition-all active:scale-[0.98] flex flex-col"
        >
          <HeartHandshake className="w-6 h-6 mb-2 opacity-90" />
          <span className="font-bold text-sm">مهام الافتقاد</span>
          <span className="text-[10px] text-white/70 mt-0.5">{tasks.length} مهام</span>
        </Link>
      </div>

      {/* Pending Tasks */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-[#EAE3E4] shadow-sm">
          <h2 className="font-bold text-sm text-[#421923] mb-3">
            مهام افتقاد مطلوبة ({tasks.length})
          </h2>
          <div className="space-y-2">
            {tasks.map((tsk: any) => (
              <div key={tsk.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#421923]">{tsk.member_name}</div>
                  <div className="text-[11px] text-[#81777A] truncate">{tsk.notes}</div>
                </div>
                <button
                  onClick={() => handleCompleteTask(tsk.id)}
                  className="shrink-0 px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>تم</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Served Members */}
      {members.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-[#EAE3E4] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-[#421923]">مخدوميني ({members.length})</h2>
            <Link href="/members" className="text-xs text-[#702C3B] font-bold hover:underline flex items-center gap-0.5">
              <span>الكل</span>
              <ChevronLeft className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {members.map((m: any) => (
              <div key={m.id} className="p-3 rounded-xl border border-[#EAE3E4] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#282326]">{m.full_name}</div>
                  <div className="text-[11px] text-[#81777A]">
                    {m.guardian_name} • {m.guardian_phone}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(m.consecutive_absences || 0) > 0 ? (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      غائب {m.consecutive_absences}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      منتظم ✓
                    </span>
                  )}
                  <a
                    href={`tel:${m.guardian_phone}`}
                    className="p-2 rounded-lg bg-emerald-600 text-white active:scale-95"
                    title="اتصال"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-3 pb-6 flex flex-col items-center gap-2">
        <a
          href={`https://wa.me/201202074649?text=${encodeURIComponent(
            `بتواصل معاك بخصوص منظومة اورجانا الكنسية انا (${currentUser?.full_name || 'خادم'})`
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
