'use client';

// ====================================================================
// ORGANA — Weekly Meetings Management (/meetings)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { Meeting, Family } from '@/types/organa';
import {
  Calendar,
  Clock,
  BookOpen,
  CalendarCheck,
  Plus,
  Search,
  ChevronLeft,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPrintablePDF } from '@/lib/export/pdf';

export default function MeetingsPage() {
  const { currentRole, assignedFamilyId, canManageAllFamilies } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const loadData = () => {
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}&familyId=${assignedFamilyId}` 
      : '';
    Promise.all([
      fetch(`/api/meetings?role=${currentRole}${famParam}`).then(r => r.json()),
      fetch(`/api/families?role=${currentRole}${famParam}`).then(r => r.json()),
    ])
      .then(([mRes, fRes]) => {
        if (mRes.success) setMeetings(mRes.meetings);
        if (fRes.success) setFamilies(fRes.families);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [currentRole, assignedFamilyId]);

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = !search || m.title.includes(search) || m.lesson_title.includes(search) || m.lesson_topic.includes(search);
    const matchesFamily = familyFilter === 'all' || m.family_id === familyFilter;
    return matchesSearch && matchesFamily;
  });

  const handleExportExcel = () => {
    exportToExcel(
      'جدول_لقاءات_كنيسة_مارجرجس_سندبيس',
      'اللقاءات الأسبوعية',
      filteredMeetings.map(m => ({
        date: m.date,
        family: m.family_name || '—',
        title: m.title,
        lesson: m.lesson_title,
        topic: m.lesson_topic,
        time: `${m.start_time} - ${m.end_time || ''}`,
        status: m.status === 'completed' ? 'منعقد' : 'مجدول',
      })),
      [
        { key: 'date', label: 'التاريخ' },
        { key: 'family', label: 'الأسرة' },
        { key: 'title', label: 'عنوان اللقاء' },
        { key: 'lesson', label: 'موضوع الدرس' },
        { key: 'topic', label: 'المحور الروحي' },
        { key: 'time', label: 'التوقيت' },
        { key: 'status', label: 'الحالة' },
      ]
    );
  };

  const handleExportPDF = () => {
    exportToPrintablePDF(
      'جدول اللقاءات الأسبوعية وموضوعات الدروس',
      'كنيسة الشهيد العظيم مارجرجس بسندبيس — العام الكنسي 2026–2027',
      ['التاريخ', 'الأسرة', 'عنوان اللقاء', 'موضوع الدرس', 'التوقيت'],
      filteredMeetings.map(m => [
        m.date,
        m.family_name || '—',
        m.title,
        m.lesson_title,
        `${m.start_time} - ${m.end_time || ''}`,
      ]),
      [
        { label: 'عدد اللقاءات المعروضة', value: filteredMeetings.length },
      ]
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#702C3B]"></span>
              <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                اللقاءات الأسبوعية والأنشطة
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              جدول لقاءات الأسر، تخطيط الفقرات، وتوزيع مهام الخدام (تحضير، شرح، وسائل، ورش)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl border border-[#EAE3E4] text-xs font-bold text-[#282326] hover:bg-[#FAF5F6] flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-xl border border-[#EAE3E4] text-xs font-bold text-[#282326] hover:bg-[#FAF5F6] flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-[#702C3B]" />
              <span>طباعة PDF</span>
            </button>
            {currentRole !== 'servant' && (
              <Link
                href="/meetings/new"
                className="px-4 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء لقاء جديد</span>
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-[#EAE3E4] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {canManageAllFamilies ? (
              <>
                <span className="text-xs font-bold text-[#81777A]">تصفية بالأسرة:</span>
                <select
                  value={familyFilter}
                  onChange={(e) => setFamilyFilter(e.target.value)}
                  className="p-1.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-xs font-semibold focus:outline-none focus:border-[#702C3B]"
                >
                  <option value="all">كافة الأسر</option>
                  {families.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </>
            ) : (
              <span className="px-3 py-1 rounded-lg bg-[#FAF5F6] text-xs font-bold text-[#702C3B] border border-[#EAE3E4]">
                🔒 لقاءات أسرتك المخصصة ({families[0]?.name || 'إعدادي بنين'})
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#81777A] absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باللقاء أو موضوع الدرس..."
              className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:bg-white focus:outline-none focus:border-[#702C3B]"
            />
          </div>
        </div>

        {/* Meetings List Cards */}
        <div className="space-y-3">
          {filteredMeetings.map((mtg) => (
            <div
              key={mtg.id}
              className="bg-white rounded-2xl border border-[#EAE3E4] p-5 shadow-sm hover:border-[#702C3B]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-bold text-sm text-[#421923]">{mtg.family_name}</span>
                  <span className="text-xs text-[#81777A]">بتاريخ: {mtg.date}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5F6] text-[#702C3B] border border-[#EAE3E4]">
                    الساعة {mtg.start_time} {mtg.end_time ? `إلى ${mtg.end_time}` : ''}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    mtg.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {mtg.status === 'completed' ? 'منعقد' : 'مجدول'}
                  </span>
                </div>

                <h3 className="font-bold text-base text-[#282326] mb-1">{mtg.title}</h3>
                <div className="text-xs text-[#81777A]">
                  <strong className="text-[#282326]">الدرس: </strong>
                  <span>{mtg.lesson_title}</span>
                  <span className="mx-2">•</span>
                  <span>{mtg.lesson_topic}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Link
                  href={`/meetings/${mtg.id}/activities`}
                  className="px-3.5 py-2 rounded-xl bg-[#FAF5F6] hover:bg-[#F0E4E7] text-[#702C3B] text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تخطيط الفقرات والخدام</span>
                </Link>

                <Link
                  href={`/attendance?meetingId=${mtg.id}`}
                  className="px-3.5 py-2 rounded-xl border border-[#EAE3E4] text-[#282326] hover:bg-[#FAF5F6] text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>تسجيل الحضور</span>
                </Link>

                <Link
                  href={`/notebooks/${mtg.id}`}
                  className="px-3.5 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>الكشكول</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

