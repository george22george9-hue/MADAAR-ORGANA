'use client';

// ====================================================================
// ORGANA — متابعة الكشاكيل والتقارير (Dedicated Secretary & Priest Section)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPrintablePDF } from '@/lib/export/pdf';

export default function NotebooksTrackingPage() {
  const { currentRole, assignedFamilyId, canManageAllFamilies } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard?role=service_secretary')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const raw = res.data;
          if (!canManageAllFamilies && assignedFamilyId) {
            raw.notebookFollowup = (raw.notebookFollowup || []).filter((f: any) => f.family_id === assignedFamilyId);
            raw.pendingReports = (raw.pendingReports || []).filter((r: any) => r.family_id === assignedFamilyId);
          }
          setData(raw);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [canManageAllFamilies, assignedFamilyId]);

  if (loading || !data) {
    return (
      <AppLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-white rounded-2xl border border-[#EAE3E4]"></div>
          <div className="h-64 bg-white rounded-2xl border border-[#EAE3E4]"></div>
        </div>
      </AppLayout>
    );
  }

  const items = data.notebookFollowup || [];

  const handleExportExcel = () => {
    exportToExcel(
      'متابعة_تسليم_كشاكيل_الأسر_مارجرجس_سندبيس',
      'متابعة الكشاكيل',
      items.map((f: any) => ({
        family: f.family_name,
        leader: f.leader_name || '—',
        meetingsCount: f.meetings_count,
        approved: f.approved_count,
        pending: f.pending_count,
        returned: f.returned_count,
        drafts: f.draft_count,
        lastDate: f.last_report_date || '—',
      })),
      [
        { key: 'family', label: 'اسم الأسرة' },
        { key: 'leader', label: 'أمين الأسرة' },
        { key: 'meetingsCount', label: 'عدد اللقاءات' },
        { key: 'approved', label: 'معتمد' },
        { key: 'pending', label: 'قيد المراجعة' },
        { key: 'returned', label: 'مُعاد للتعديل' },
        { key: 'drafts', label: 'مسودات' },
        { key: 'lastDate', label: 'تاريخ آخر تسليم' },
      ]
    );
  };

  const handleExportPDF = () => {
    exportToPrintablePDF(
      'متابعة الكشاكيل والتقارير الأسبوعية',
      'كنيسة الشهيد العظيم مارجرجس بسندبيس — العام الكنسي 2026–2027',
      ['الأسرة', 'أمين الأسرة', 'اللقاءات', 'معتمد', 'قيد المراجعة', 'مُعاد', 'آخر تسليم'],
      items.map((f: any) => [
        f.family_name,
        f.leader_name || '—',
        f.meetings_count,
        f.approved_count,
        f.pending_count,
        f.returned_count,
        f.last_report_date || 'لم يسلم بعد',
      ]),
      [
        { label: 'إجمالي الأسر', value: items.length },
        { label: 'تقارير قيد المراجعة', value: items.reduce((acc: number, f: any) => acc + (f.pending_count || 0), 0) },
        { label: 'تقارير معتمدة', value: items.reduce((acc: number, f: any) => acc + (f.approved_count || 0), 0) },
      ]
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link
            href="/notebooks"
            className="text-xs text-[#702C3B] font-bold flex items-center gap-1 hover:underline"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لكافة الكشاكيل</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck2 className="w-5 h-5 text-[#702C3B]" />
              <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                متابعة الكشاكيل والتقارير الأسبوعية
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              قسم رقابي متخصص لأمين الخدمة والكاهن لمتابعة التزام الأسر بتسليم الكشاكيل ومراحل التدقيق
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl border border-[#EAE3E4] text-xs font-bold text-[#282326] hover:bg-[#FAF5F6] flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-2 rounded-xl border border-[#EAE3E4] text-xs font-bold text-[#282326] hover:bg-[#FAF5F6] flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-[#702C3B]" />
              <span>طباعة PDF</span>
            </button>
          </div>
        </div>

        {/* 10 Families Tracking Table */}
        <div className="bg-white rounded-2xl border border-[#EAE3E4] shadow-sm p-6">
          <h2 className="text-base font-bold text-[#421923] mb-4">
            حالة تسليم الكشاكيل لكل أسرة (10 أسر)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#EAE3E4] text-[#81777A] bg-[#FAF5F6]">
                  <th className="py-3 px-3">الأسرة</th>
                  <th className="py-3 px-3">أمين الأسرة</th>
                  <th className="py-3 px-3">إجمالي اللقاءات</th>
                  <th className="py-3 px-3">معتمد</th>
                  <th className="py-3 px-3">قيد المراجعة</th>
                  <th className="py-3 px-3">مُعاد للتعديل</th>
                  <th className="py-3 px-3">مسودات</th>
                  <th className="py-3 px-3">تاريخ آخر تسليم</th>
                  <th className="py-3 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE3E4]">
                {items.map((f: any) => (
                  <tr key={f.family_id} className="hover:bg-[#FAF5F6]/70 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-[#421923] text-sm">{f.family_name}</td>
                    <td className="py-3.5 px-3 text-[#282326]">{f.leader_name || '—'}</td>
                    <td className="py-3.5 px-3 font-semibold">{f.meetings_count}</td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {f.approved_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {f.pending_count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          {f.pending_count} ينتظر المراجعة
                        </span>
                      ) : (
                        <span className="text-[#81777A]">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {f.returned_count > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          {f.returned_count}
                        </span>
                      ) : (
                        <span className="text-[#81777A]">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-[#81777A]">{f.draft_count}</td>
                    <td className="py-3.5 px-3 text-[#81777A]">
                      {f.last_report_date || <span className="text-rose-600 font-semibold">لم يسلم بعد</span>}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <Link
                        href={`/notebooks?familyId=${f.family_id}`}
                        className="px-3 py-1 rounded-xl bg-[#FAF5F6] hover:bg-[#F0E4E7] text-[#702C3B] font-bold text-xs inline-flex items-center gap-1"
                      >
                        <span>الكشاكيل</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

