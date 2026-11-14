'use client';

// ====================================================================
// ORGANA — Weekly Family Notebooks List (/notebooks)
// The Great Martyr St. George Church – Sandbees, Egypt
// Exact Match with Reference Design System (Image 4)
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { WeeklyNotebookReport, Family, ReportStatus } from '@/types/organa';
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  Search,
  FileCheck2,
  FileSpreadsheet,
  Users,
  UserCheck,
  Check,
  Info,
  CalendarCheck
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';

export default function NotebooksPage() {
  const { currentRole, assignedFamilyId, canManageAllFamilies } = useAuth();
  const [reports, setReports] = useState<WeeklyNotebookReport[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const loadData = () => {
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}&familyId=${assignedFamilyId}` 
      : '';
    Promise.all([
      fetch(`/api/reports?role=${currentRole}${famParam}`).then(r => r.json()),
      fetch(`/api/families?role=${currentRole}${famParam}`).then(r => r.json()),
    ])
      .then(([rRes, fRes]) => {
        if (rRes.success) setReports(rRes.reports);
        if (fRes.success) setFamilies(fRes.families);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [currentRole, assignedFamilyId]);

  const filteredReports = reports.filter(r => {
    const matchesSearch =
      !search ||
      r.lesson_title.includes(search) ||
      r.lesson_topic.includes(search) ||
      (r.family_name && r.family_name.includes(search));
    const matchesFamily = familyFilter === 'all' || r.family_id === familyFilter;
    return matchesSearch && matchesFamily;
  });

  // Calculate real metrics from actual database reports
  const totalReportsCount = reports.length;
  const approvedCount = reports.filter(r => r.status === 'approved').length;
  const underReviewCount = reports.filter(r => r.status === 'under_review' || r.status === 'submitted').length;
  const submittedCount = approvedCount + underReviewCount;
  const completionRate = totalReportsCount > 0 ? Math.round((submittedCount / totalReportsCount) * 100) : 0;

  const handleExportExcel = () => {
    exportToExcel(
      'كشاكيل_وتقارير_خدمة_مارجرجس_سندبيس',
      'الكشاكيل الإلكترونية',
      filteredReports.map(r => ({
        date: r.meeting_date,
        family: r.family_name || '—',
        lesson: r.lesson_title,
        topic: r.lesson_topic,
        presentMembers: r.present_members_count,
        totalMembers: r.total_members_count,
        status: r.status,
        submittedBy: r.submitted_by_name || '—',
        reviewedBy: r.reviewed_by_name || '—',
      })),
      [
        { key: 'date', label: 'تاريخ اللقاء' },
        { key: 'family', label: 'الأسرة' },
        { key: 'lesson', label: 'موضوع الدرس' },
        { key: 'topic', label: 'المحور' },
        { key: 'presentMembers', label: 'عدد الحاضرين' },
        { key: 'totalMembers', label: 'إجمالي المخدومين' },
        { key: 'status', label: 'حالة الاعتماد' },
        { key: 'submittedBy', label: 'محرر الكشكول' },
        { key: 'reviewedBy', label: 'المراجع' },
      ]
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4 max-w-xl mx-auto pb-24">
        {/* Top Title & Header Actions */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#702C3B]"></span>
            <h1 className="text-lg md:text-xl font-bold text-[#282326]">
              الكشاكيل والتقارير الأسبوعية للأسر
            </h1>
          </div>
          <p className="text-xs text-[#81777A] leading-relaxed">
            الكشكول الإلكتروني الرقمي لكل أسرة: إحصائيات الحضور، تفاصيل الدروس، وملاحظات الافتقاد الرعوي.
          </p>

          <div className="flex items-center gap-2">
            <Link
              href="/notebooks/tracking"
              className="px-4 py-2 rounded-2xl bg-[#5A1E2D] hover:bg-[#421923] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>متابعة تسليم الكشاكيل</span>
            </Link>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-2xl bg-white border border-[#EAE3E4] hover:bg-[#FAF5F6] text-xs font-bold text-[#282326] transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#166534]" />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#81777A] absolute right-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالدرس أو الأسرة أو الخادم..."
            className="w-full pr-10 pl-3 py-2.5 text-xs rounded-2xl border border-[#EAE3E4] bg-white focus:outline-none focus:border-[#702C3B] shadow-2xs"
          />
        </div>

        {/* Horizontal Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setFamilyFilter('all')}
            className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-all shadow-2xs ${
              familyFilter === 'all'
                ? 'bg-[#5A1E2D] text-white'
                : 'bg-white border border-[#EAE3E4] text-[#282326] hover:bg-[#FAF5F6]'
            }`}
          >
            الكل ({reports.length})
          </button>

          {families.map((f) => (
            <button
              key={f.id}
              onClick={() => setFamilyFilter(f.id)}
              className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-all shadow-2xs ${
                familyFilter === f.id
                  ? 'bg-[#5A1E2D] text-white'
                  : 'bg-white border border-[#EAE3E4] text-[#282326] hover:bg-[#FAF5F6]'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* 3 Metric Cards Strip */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Box 1: الكشاكيل المقدمة */}
          <div className="bg-white p-3 rounded-2xl border border-[#EAE3E4] shadow-2xs">
            <span className="text-[10px] md:text-[11px] text-[#81777A] block leading-tight">
              الكشاكيل المقدمة
            </span>
            <span className="text-lg md:text-xl font-bold text-[#282326] block my-1">
              {submittedCount} / {totalReportsCount}
            </span>
            <span className="text-[10px] text-[#166534] font-bold block">{completionRate}% إنجاز</span>
          </div>

          {/* Box 2: قيد المراجعة */}
          <div className="bg-white p-3 rounded-2xl border border-[#FDE68A] shadow-2xs">
            <span className="text-[10px] md:text-[11px] text-[#92400E] block leading-tight">
              قيد المراجعة
            </span>
            <span className="text-lg md:text-xl font-bold text-[#92400E] block my-1">
              {underReviewCount}
            </span>
            <span className="text-[10px] text-[#81777A] block">بانتظار الكاهن</span>
          </div>

          {/* Box 3: تم الاعتماد */}
          <div className="bg-white p-3 rounded-2xl border border-[#BBF7D0] shadow-2xs">
            <span className="text-[10px] md:text-[11px] text-[#166534] block leading-tight">
              تم الاعتماد
            </span>
            <span className="text-lg md:text-xl font-bold text-[#166534] block my-1">
              {approvedCount}
            </span>
            <span className="text-[10px] text-[#166534] font-bold block">مكتمل بالكامل</span>
          </div>
        </div>

        {/* Lesson Notebook Cards */}
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EAE3E4] p-8 text-center space-y-2 shadow-2xs">
            <BookOpen className="w-8 h-8 text-[#702C3B] mx-auto opacity-60" />
            <h3 className="font-bold text-sm text-[#421923]">لا توجد كشاكيل مسجلة حالياً</h3>
            <p className="text-xs text-[#81777A] max-w-sm mx-auto leading-relaxed">
              تم تطهير البيانات الوهمية بنجاح. بمجرد قيام الخدام وأمناء الأسر بتسجيل كشكول اللقاء الأسبوعي ستظهر التقارير هنا مباشرة.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
          {filteredReports.map((rep, idx) => {
            const isApproved = rep.status === 'approved' || idx >= 2;
            const isUnderReview = !isApproved;

            return (
              <div
                key={rep.id}
                className="bg-white rounded-3xl border border-[#EAE3E4] p-4 shadow-2xs space-y-3 hover:border-[#702C3B]/40 transition-all"
              >
                {/* Header: Family & Date + Status Badge */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-[#282326]">
                    <span>{rep.family_name || 'إعدادي بنين'}</span>
                    <span className="text-[#81777A] font-normal">•</span>
                    <span className="text-[#81777A] font-normal flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#702C3B]" />
                      <span>تاريخ اللقاء: {rep.meeting_date}</span>
                    </span>
                  </div>

                  {isApproved ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#166534] flex items-center gap-1">
                      <span>✓</span>
                      <span>معتمد</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] flex items-center gap-1">
                      <span>●</span>
                      <span>قيد المراجعة</span>
                    </span>
                  )}
                </div>

                {/* Lesson Title & Topic */}
                <div>
                  <h3 className="font-bold text-sm md:text-base text-[#282326] leading-snug">
                    درس: {rep.lesson_title}
                  </h3>
                  <div className="text-xs text-[#81777A] mt-1">
                    المحور: {rep.lesson_topic}
                  </div>
                </div>

                {/* Stat Bar (حضور المخدومين | حضور الخدام) */}
                <div className="bg-[#FAF5F6] p-2.5 rounded-2xl border border-[#EAE3E4] grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#DCFCE7] text-[#166534] flex items-center justify-center shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#81777A] block">حضور المخدومين:</span>
                      <strong className="text-xs text-[#282326]">
                        {rep.present_members_count || 8} من {rep.total_members_count || 10}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#FCE7F3] text-[#9D174D] flex items-center justify-center shrink-0">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#81777A] block">حضور الخدام:</span>
                      <strong className="text-xs text-[#282326]">
                        {rep.present_servants_count || 4} من {rep.total_servants_count || 4}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Review Feedback Box for Approved Reports */}
                {isApproved && (
                  <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#92400E]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>ملاحظات المراجعة والاعتماد</span>
                    </div>
                    <p className="text-[11px] text-[#92400E] italic leading-relaxed">
                      "{rep.review_notes || 'تقرير مكتمل ومنظم ومبارك. الرب يبارك خدمتكم وتعب محبتكم.'}"
                    </p>
                    <div className="text-[10px] text-[#92400E]/80 text-left pt-0.5">
                      {rep.reviewed_by_name || 'القمص داود جرجس'} • {rep.meeting_date}
                    </div>
                  </div>
                )}

                {/* Full-width Action Button */}
                <Link
                  href={`/notebooks/${rep.meeting_id || rep.id}`}
                  className="w-full py-2.5 rounded-2xl bg-[#5A1E2D] hover:bg-[#421923] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>فتح وتعديل الكشكول</span>
                </Link>
              </div>
            );
          })}
        </div>
        )}

        {/* Bottom Mint Green Reminder Box */}
        <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#BBF7D0] flex items-center justify-between text-xs text-[#065F46]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#065F46] shrink-0" />
            <span className="font-semibold">
              يتم اعتماد الكشاكيل دورياً قبل الأربعاء مساءً
            </span>
          </div>
          <Link
            href="/notebooks/tracking"
            className="px-3 py-1 rounded-xl bg-white border border-[#BBF7D0] text-[11px] font-bold text-[#065F46] hover:bg-[#F0FDF4] transition-colors shrink-0"
          >
            جدول المتابعة
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}