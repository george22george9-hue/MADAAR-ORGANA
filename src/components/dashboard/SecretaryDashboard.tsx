'use client';

// ====================================================================
// ORGANA — Secretary Dashboard (لوحة أمين الخدمة) — Simplified
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import {
  CalendarCheck,
  BookOpen,
  Users,
  UserCheck,
  Clock,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  MessageCircle
} from 'lucide-react';
import { PriestServantsReport } from '@/components/dashboard/PriestServantsReport';

export function SecretaryDashboard() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any>({
    pendingReports: [],
    approvedReports: 0,
    servantsCount: 0,
    notebookFollowup: [],
  });
  const [loading, setLoading] = useState(true);
  const [reviewModalReport, setReviewModalReport] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = () => {
    fetch('/api/dashboard?role=service_secretary')
      .then(r => r.json())
      .then(res => {
        if (res && res.success && res.data) {
          setData(res.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load secretary dashboard:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewAction = async (status: 'approved' | 'returned_for_corrections') => {
    if (!reviewModalReport) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/reports/${reviewModalReport.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewNotes: reviewNotes || (status === 'approved' ? 'معتمد' : 'يرجى التعديل'),
          actorRole: 'service_secretary',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReviewModalReport(null);
        setReviewNotes('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#5A1E2D] to-[#421923] text-white rounded-2xl p-5 shadow-md">
        <div className="text-xs text-white/80 mb-2">أمين الخدمة • {currentUser?.full_name}</div>
        <h1 className="text-lg font-bold">متابعة الكشاكيل والخدام</h1>
        <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-col gap-0.5">
          <span className="text-xs text-white/90 font-bold tracking-wide">
            مطرانية شبرا الخيمة وتوابعها
          </span>
          <span className="text-sm text-amber-300 font-extrabold tracking-wide">
            كنيسة الشهيد العظيم مارجرجس بسندبيس
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/notebooks"
          className="p-4 rounded-2xl bg-[#702C3B] text-white shadow-sm hover:bg-[#5A232F] transition-all active:scale-[0.98] flex flex-col col-span-2"
        >
          <BookOpen className="w-7 h-7 mb-2 opacity-90" />
          <span className="font-bold text-base">مراجعة الكشاكيل</span>
          <span className="text-[11px] text-white/70 mt-0.5">
            {data.pendingReports?.length || 0} كشكول في انتظار المراجعة
          </span>
        </Link>

        <Link
          href="/attendance"
          className="p-4 rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-[0.98] flex flex-col"
        >
          <CalendarCheck className="w-6 h-6 mb-2 opacity-90" />
          <span className="font-bold text-sm">تسجيل الحضور</span>
        </Link>

        <Link
          href="/servants"
          className="p-4 rounded-2xl bg-sky-700 text-white shadow-sm hover:bg-sky-800 transition-all active:scale-[0.98] flex flex-col"
        >
          <UserCheck className="w-6 h-6 mb-2 opacity-90" />
          <span className="font-bold text-sm">إدارة الخدام</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-xl border border-amber-200 text-center">
          <div className="text-xl font-bold text-amber-700">{data.pendingReports?.length || 0}</div>
          <div className="text-[10px] text-[#81777A]">قيد المراجعة</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
          <div className="text-xl font-bold text-emerald-700">{data.approvedReports || 0}</div>
          <div className="text-[10px] text-[#81777A]">معتمدة</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#EAE3E4] text-center">
          <div className="text-xl font-bold text-[#421923]">{data.servantsCount}</div>
          <div className="text-[10px] text-[#81777A]">خادم نشط</div>
        </div>
      </div>

      {/* Pending Reviews */}
      {data.pendingReports && data.pendingReports.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
          <h2 className="font-bold text-sm text-[#421923] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            كشاكيل تنتظر مراجعتك
          </h2>
          <div className="space-y-2">
            {data.pendingReports.map((rep: any) => (
              <div key={rep.id} className="p-3 rounded-xl border border-[#EAE3E4] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-[#421923]">{rep.family_name}</div>
                  <div className="text-[11px] text-[#81777A]">{rep.lesson_title} • {rep.meeting_date}</div>
                </div>
                <button
                  onClick={() => setReviewModalReport(rep)}
                  className="shrink-0 px-3 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F]"
                >
                  مراجعة
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Servants Pastoral & Attendance Report */}
      <PriestServantsReport />

      {/* Footer */}
      <div className="text-center pt-3 pb-6 flex flex-col items-center gap-2">
        <a
          href={`https://wa.me/201202074649?text=${encodeURIComponent(
            `بتواصل معاك بخصوص منظومة اورجانا الكنسية انا (${currentUser?.full_name || 'أمين الخدمة'})`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-all shadow-sm active:scale-95"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>تواصل مع المطور عبر واتساب 💬</span>
        </a>
        <div className="text-[10px] text-[#81777A]">
          منظومة أورجانا • MADAAR Technologies • مطرانية شبرا الخيمة وتوابعها
        </div>
      </div>

      {/* Review Modal */}
      {reviewModalReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#EAE3E4] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#421923]">مراجعة: {reviewModalReport.family_name}</h3>
                <div className="text-[11px] text-[#81777A]">{reviewModalReport.meeting_date}</div>
              </div>
              <button onClick={() => setReviewModalReport(null)} className="text-[#81777A] text-lg">✕</button>
            </div>

            <div className="p-3 bg-[#FAF5F6] rounded-xl text-xs">
              <div className="font-bold text-[#421923]">الدرس: {reviewModalReport.lesson_title}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#282326] mb-1">ملاحظات:</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="اكتب ملاحظاتك..."
                rows={3}
                className="w-full p-2.5 rounded-xl border border-[#EAE3E4] text-xs focus:outline-none focus:border-[#702C3B]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={submittingReview}
                onClick={() => handleReviewAction('returned_for_corrections')}
                className="flex-1 py-2.5 rounded-xl border border-red-300 text-red-700 text-xs font-bold hover:bg-red-50"
              >
                إعادة للتعديل
              </button>
              <button
                disabled={submittingReview}
                onClick={() => handleReviewAction('approved')}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                اعتماد ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
