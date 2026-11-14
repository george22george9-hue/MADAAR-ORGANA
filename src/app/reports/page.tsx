'use client';

// ====================================================================
// ORGANA — Comprehensive Reports & Analytics (/reports)
// Real Database Queries, Excel & Printable PDF Exports
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Users,
  UserCheck,
  FolderTree,
  TrendingUp,
  Download
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPrintablePDF } from '@/lib/export/pdf';

export default function ReportsPage() {
  const { currentRole, assignedFamilyId, canManageAllFamilies } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<'service_wide' | 'families' | 'servants' | 'absence'>('service_wide');

  useEffect(() => {
    fetch('/api/dashboard?role=priest')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          const raw = res.data;
          if (!canManageAllFamilies && assignedFamilyId) {
            raw.familyStats = (raw.familyStats || []).filter((f: any) => f.id === assignedFamilyId);
            raw.familiesCount = raw.familyStats.length;
            if (raw.familyStats.length > 0) {
              raw.membersCount = raw.familyStats[0].members_count;
              raw.servantsCount = raw.familyStats[0].servants_count;
              raw.approvedReports = raw.familyStats[0].approved_reports;
            }
          }
          setData(raw);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [canManageAllFamilies, assignedFamilyId]);

  const handleExportExcel = () => {
    if (!data) return;

    if (reportType === 'service_wide' || reportType === 'families') {
      exportToExcel(
        'تقرير_الأسر_والحضور_الشامل_مارجرجس_سندبيس',
        'الأسر والحضور',
        (data.familyStats || []).map((f: any) => ({
          name: f.name,
          type: f.type === 'children_class' ? 'فصل أطفال' : (f.type === 'servants_group' ? 'خدام' : 'عائلات'),
          members: f.members_count || 0,
          servants: f.servants_count || 0,
          approvedReports: f.approved_reports || 0,
        })),
        [
          { key: 'name', label: 'الأسرة / القطاع' },
          { key: 'type', label: 'النوع' },
          { key: 'members', label: 'عدد المخدومين' },
          { key: 'servants', label: 'عدد الخدام' },
          { key: 'approvedReports', label: 'الكشاكيل المعتمدة' },
        ]
      );
    }
  };

  const handleExportPDF = () => {
    if (!data) return;

    exportToPrintablePDF(
      'التقرير الإحصائي الشامل للخدمة الكنسية',
      'كنيسة الشهيد العظيم مارجرجس بسندبيس — العام الكنسي 2026–2027',
      ['الأسرة / القطاع', 'النوع', 'المخدومين', 'الخدام', 'الكشاكيل المعتمدة'],
      (data.familyStats || []).map((f: any) => [
        f.name,
        f.type === 'children_class' ? 'فصل أطفال' : (f.type === 'servants_group' ? 'خدام' : 'عائلات'),
        f.members_count || 0,
        f.servants_count || 0,
        f.approved_reports || 0,
      ]),
      [
        { label: 'نسبة الحضور العام', value: `${data.attendanceRate || 0}%` },
        { label: 'إجمالي المخدومين', value: data.membersCount || 0 },
        { label: 'إجمالي الخدام', value: data.servantsCount || 0 },
        { label: 'إجمالي الأسر', value: data.familiesCount || 0 },
      ]
    );
  };

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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-5 h-5 text-[#702C3B]" />
              <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                التقارير والإحصائيات الكنسية المعتمدة
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              تقارير تحليلية مبنية على سجلات قاعدة البيانات الحقيقية قابلة للتصدير الفوري بصيغتي Excel و PDF
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl border border-[#EAE3E4] text-xs font-bold text-[#282326] hover:bg-[#FAF5F6] flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة وتصدير PDF</span>
            </button>
          </div>
        </div>

        {/* Global Performance Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#EAE3E4] shadow-sm text-center">
            <span className="text-xs text-[#81777A] block">نسبة الحضور العام</span>
            <span className="text-2xl font-bold text-[#10B981] mt-1 block">{data.attendanceRate}%</span>
            <span className="text-[10px] text-[#81777A] mt-0.5 block">عبر كافة الاجتماعات</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#EAE3E4] shadow-sm text-center">
            <span className="text-xs text-[#81777A] block">كشاكيل معتمدة</span>
            <span className="text-2xl font-bold text-[#702C3B] mt-1 block">{data.approvedReports}</span>
            <span className="text-[10px] text-[#81777A] mt-0.5 block">مكتملة ومراجعة بالكامل</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#EAE3E4] shadow-sm text-center">
            <span className="text-xs text-[#81777A] block">قيد المراجعة</span>
            <span className="text-2xl font-bold text-amber-700 mt-1 block">{data.awaitingReview}</span>
            <span className="text-[10px] text-[#81777A] mt-0.5 block">في انتظار أمين الخدمة</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#EAE3E4] shadow-sm text-center">
            <span className="text-xs text-[#81777A] block">تنبيهات الغياب النشطة</span>
            <span className="text-2xl font-bold text-rose-700 mt-1 block">{data.alertsCount}</span>
            <span className="text-[10px] text-[#81777A] mt-0.5 block">حالات تتطلب افتقاداً</span>
          </div>
        </div>

        {/* Breakdown Table: Family Performance Matrix */}
        <div className="bg-white rounded-2xl border border-[#EAE3E4] shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#421923]">
                {canManageAllFamilies ? 'مقارنة أداء الأسر وفصول الخدمة (10 أسر)' : 'إحصائيات وبيانات أسرتك المخصصة'}
              </h2>
              <p className="text-xs text-[#81777A]">
                {canManageAllFamilies ? 'توزيع المخدومين والخدام والكشاكيل المعتمدة لكل أسرة' : 'حصر المخدومين والخدام والكشاكيل المعتمدة الخاصة بأسرتك'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[#EAE3E4] text-[#81777A] bg-[#FAF5F6]">
                  <th className="py-3 px-3">الأسرة / القطاع</th>
                  <th className="py-3 px-3">النوع</th>
                  <th className="py-3 px-3 text-center">المخدومين المسجلين</th>
                  <th className="py-3 px-3 text-center">الخدام النشطين</th>
                  <th className="py-3 px-3 text-center">الكشاكيل المعتمدة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE3E4]">
                {(data.familyStats || []).map((f: any) => (
                  <tr key={f.id} className="hover:bg-[#FAF5F6]/70 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-[#421923] text-sm flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color_code || '#702C3B' }} />
                      <span>{f.name}</span>
                    </td>
                    <td className="py-3.5 px-3 text-[#81777A]">
                      {f.type === 'children_class' ? 'فصل أطفال' : (f.type === 'servants_group' ? 'مجموعة خدام' : 'أسرة عائلات')}
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-[#282326]">{f.members_count || 0}</td>
                    <td className="py-3.5 px-3 text-center font-bold text-[#282326]">{f.servants_count || 0}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {f.approved_reports || 0} كشاكيل
                      </span>
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

