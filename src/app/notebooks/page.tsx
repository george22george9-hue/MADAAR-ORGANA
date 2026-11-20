'use client';

// ====================================================================
// ORGANA — Digital Weekly Family Notebooks (/notebooks)
// Interactive Friday Notebook Viewer & Archive
// The Great Martyr St. George Church – Sandbees, Egypt
// Designed for Maximum Simplicity & Ease of Use
// Developed by MADAAR Technologies
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { WeeklyNotebookReport, Family, Meeting } from '@/types/organa';
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  FileCheck2,
  FileSpreadsheet,
  Users,
  UserCheck,
  Check,
  Info,
  CalendarCheck,
  Printer,
  ChevronDown,
  Sparkles,
  Church,
  GraduationCap,
  MessageCircle,
  HelpCircle,
  Phone
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPrintablePDF } from '@/lib/export/pdf';

interface ServantAttItem {
  servant_id: string;
  servant_name: string;
  role_in_family?: string;
  status: string;
  attended_liturgy: number;
  did_opening: number;
  did_workshop: number;
  did_preparation: number;
  did_lesson: number;
}

interface MemberAttItem {
  member_id: string;
  member_name: string;
  code: string;
  stage?: string;
  status: string;
  attended_liturgy: number;
  attended_communion: number;
  attended_class: number;
  guardian_phone?: string;
  assigned_servant_name?: string;
}

export default function NotebooksPage() {
  const { currentRole, currentUser, assignedFamilyId } = useAuth();
  const [activeTab, setActiveTab] = useState<'interactive' | 'archive'>('interactive');

  // Shared Data
  const [families, setFamilies] = useState<Family[]>([]);
  const [reports, setReports] = useState<WeeklyNotebookReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Interactive Friday Viewer State
  const isRestrictedRole = currentRole === 'servant' || currentRole === 'family_leader';
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState<{
    meeting: any;
    members: MemberAttItem[];
    servants: ServantAttItem[];
    report: any;
  } | null>(null);

  // Archive Filter State
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveFamilyFilter, setArchiveFamilyFilter] = useState<string>('all');

  // Format Arabic Date
  const formatArabicDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // 1. Initial Load: Families & Reports
  useEffect(() => {
    const famParam = isRestrictedRole && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}&familyId=${assignedFamilyId}` 
      : '';
    Promise.all([
      fetch(`/api/families?role=${currentRole}${famParam}`).then(r => r.json()),
      fetch(`/api/reports?role=${currentRole}${famParam}`).then(r => r.json()),
    ])
      .then(([fRes, rRes]) => {
        if (fRes.success && fRes.families) {
          setFamilies(fRes.families);
          const initialFamId = (isRestrictedRole && assignedFamilyId) 
            ? assignedFamilyId 
            : (fRes.families[0]?.id || 'fam-prep-boys');
          setSelectedFamilyId(initialFamId);
        }
        if (rRes.success && rRes.reports) {
          setReports(rRes.reports);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentRole, assignedFamilyId]);

  // 2. Load Meetings when selectedFamilyId changes
  useEffect(() => {
    if (!selectedFamilyId) return;
    const famParam = isRestrictedRole && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}` 
      : '';
    fetch(`/api/meetings?familyId=${selectedFamilyId}&role=${currentRole}${famParam}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.meetings) {
          const list: Meeting[] = res.meetings;
          setMeetings(list);
          if (list.length > 0) {
            // Find the most recent meeting today or before, or fallback to the latest
            const todayStr = new Date().toISOString().split('T')[0];
            const pastOrToday = list.filter(m => String(m.date).split('T')[0] <= todayStr);
            const defaultMtg = pastOrToday.length > 0 ? pastOrToday[pastOrToday.length - 1] : list[0];
            setSelectedMeetingId(defaultMtg.id);
          } else {
            setSelectedMeetingId('');
            setMeetingDetails(null);
          }
        }
      })
      .catch(console.error);
  }, [selectedFamilyId, currentRole, assignedFamilyId]);

  // 3. Load Meeting Attendance & Report Details when selectedMeetingId changes
  useEffect(() => {
    if (!selectedMeetingId) return;
    setDetailsLoading(true);
    const famParam = isRestrictedRole && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}` 
      : '';

    Promise.all([
      fetch(`/api/meetings/${selectedMeetingId}/attendance?role=${currentRole}${famParam}`).then(r => r.json()),
      fetch(`/api/reports?meetingId=${selectedMeetingId}&role=${currentRole}${famParam}`).then(r => r.json()),
    ])
      .then(([attRes, repRes]) => {
        if (attRes.success) {
          const rep = (repRes.success && repRes.reports && repRes.reports.length > 0)
            ? repRes.reports[0]
            : (attRes.meeting?.report || null);

          setMeetingDetails({
            meeting: attRes.meeting,
            members: attRes.members || [],
            servants: attRes.servants || [],
            report: rep,
          });
        } else {
          setMeetingDetails(null);
        }
        setDetailsLoading(false);
      })
      .catch(() => {
        setMeetingDetails(null);
        setDetailsLoading(false);
      });
  }, [selectedMeetingId, currentRole, assignedFamilyId]);

  // Archive Filter
  const filteredReports = reports.filter(r => {
    const matchesSearch =
      !archiveSearch ||
      r.lesson_title.includes(archiveSearch) ||
      r.lesson_topic.includes(archiveSearch) ||
      (r.family_name && r.family_name.includes(archiveSearch));
    const matchesFamily = archiveFamilyFilter === 'all' || r.family_id === archiveFamilyFilter;
    return matchesSearch && matchesFamily;
  });

  const totalReportsCount = reports.length;
  const approvedCount = reports.filter(r => r.status === 'approved').length;
  const underReviewCount = reports.filter(r => r.status === 'under_review' || r.status === 'submitted').length;
  const submittedCount = approvedCount + underReviewCount;
  const completionRate = totalReportsCount > 0 ? Math.round((submittedCount / totalReportsCount) * 100) : 0;

  // Selected Family Name
  const selectedFamily = families.find(f => f.id === selectedFamilyId);
  const currentMeeting = meetings.find(m => m.id === selectedMeetingId);

  // Servants Roles extraction
  const openingServant = meetingDetails?.servants?.find(s => Number(s.did_opening) > 0);
  const lessonServant = meetingDetails?.servants?.find(s => Number(s.did_lesson) > 0);
  const prepServant = meetingDetails?.servants?.find(s => Number(s.did_preparation) > 0);
  const workshopServant = meetingDetails?.servants?.find(s => Number(s.did_workshop) > 0);
  const liturgyServants = meetingDetails?.servants?.filter(s => Number(s.attended_liturgy) > 0) || [];

  // Members stats
  const presentMembers = meetingDetails?.members?.filter(m => m.status === 'present') || [];
  const absentMembers = meetingDetails?.members?.filter(m => m.status === 'absent') || [];
  const excusedMembers = meetingDetails?.members?.filter(m => m.status === 'excused') || [];
  const totalMembersCount = meetingDetails?.members?.length || 0;
  const attendanceRate = totalMembersCount > 0 ? Math.round((presentMembers.length / totalMembersCount) * 100) : 0;

  // Print PDF for Current Meeting Notebook
  const handlePrintNotebookPDF = () => {
    if (!meetingDetails) return;
    const mtg = meetingDetails.meeting || currentMeeting;
    const rep = meetingDetails.report;
    const rows = (meetingDetails.members || []).map((m, idx) => [
      m.member_name,
      m.stage || '—',
      m.status === 'present' ? 'حاضر' : m.status === 'absent' ? 'غائب' : m.status === 'excused' ? 'معتذر' : 'لم يسجل',
      m.attended_liturgy ? 'نعم ✓' : 'لا ✗',
      m.attended_communion ? 'نعم ✓' : 'لا ✗',
      m.assigned_servant_name || '—',
    ]);

    exportToPrintablePDF(
      `كشكول لقاء الجمعة — ${selectedFamily?.name || ''}`,
      `تاريخ اللقاء: ${mtg?.date ? String(mtg.date).split('T')[0] : ''} | موضوع الدرس: ${rep?.lesson_title || mtg?.title || 'لقاء الجمعة'}`,
      ['اسم المخدوم', 'المرحلة', 'حالة الحضور', 'حضور القداس', 'التناول', 'الخادم المسؤول'],
      rows,
      [
        { label: 'إجمالي المخدومين', value: totalMembersCount },
        { label: 'الحاضرون', value: `${presentMembers.length} (${attendanceRate}%)` },
        { label: 'شارح الدرس', value: lessonServant?.servant_name || 'لم يُحدد' },
        { label: 'مقدم الافتتاحية', value: openingServant?.servant_name || 'لم يُحدد' },
        { label: 'حضور قداس الخدام', value: `${liturgyServants.length} خادم` },
      ]
    );
  };

  // Direct WhatsApp contact with parent
  const handleParentWhatsApp = (member: MemberAttItem) => {
    const rawPhone = String(member.guardian_phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.startsWith('0') ? `2${rawPhone}` : rawPhone;
    if (!cleanPhone) return;

    let text = `سلام ونعمة لحضرتك.. بخصوص ابننا الحبيب ${member.member_name} في كنيسة الشهيد مارجرجس بسندبيس (أسرة ${selectedFamily?.name || 'مدارس الأحد'}). بنصلي تكونوا بكل خير 🙏`;
    if (member.status === 'absent') {
      text = `سلام ونعمة لحضرتك.. افتقدنا ابننا الحبيب ${member.member_name} في لقاء اليوم بكنيسة الشهيد مارجرجس بسندبيس. نرجو من الله أن تكونوا بكل خير وبانتظاره الجمعة القادمة! ✝️❤️`;
    }
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <AppLayout>
      <div className="space-y-4 max-w-2xl mx-auto pb-24">
        
        {/* Top Header */}
        <div className="bg-white rounded-3xl border border-[#EAE3E4] p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#702C3B] text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                <BookOpen className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-[#421923]">
                  الكشكول والتقرير الأسبوعي
                </h1>
                <p className="text-[11px] text-[#81777A]">
                  تفاصيل حضور المخدومين والخدام ووقائع لقاء الجمعة ببساطة تامة
                </p>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handlePrintNotebookPDF}
                disabled={!meetingDetails}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-gray-50 border border-[#EAE3E4] hover:bg-gray-100 text-xs font-bold text-[#421923] flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="طباعة الكشكول كتقرير رسمي"
              >
                <Printer className="w-4 h-4 text-[#702C3B]" />
                <span className="hidden sm:inline">طباعة PDF</span>
              </button>
            </div>
          </div>

          {/* Simple Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF5F6] rounded-2xl border border-[#EAE3E4]">
            <button
              onClick={() => setActiveTab('interactive')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'interactive'
                  ? 'bg-[#702C3B] text-white shadow-xs'
                  : 'text-[#81777A] hover:text-[#421923]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>استعراض كشكول الجمعة</span>
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'archive'
                  ? 'bg-[#702C3B] text-white shadow-xs'
                  : 'text-[#81777A] hover:text-[#421923]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>أرشيف وسجل الكشاكيل</span>
            </button>
          </div>
        </div>

        {/* =============================================================== */}
        {/* TAB 1: INTERACTIVE FRIDAY NOTEBOOK VIEWER (مبسط على الآخر) */}
        {/* =============================================================== */}
        {activeTab === 'interactive' && (
          <div className="space-y-4">
            {/* Step 1 & 2: Selectors Bar (Class + Friday) */}
            <div className="bg-white rounded-3xl border border-[#EAE3E4] p-4 shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Class / Family Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#421923] flex items-center gap-1.5">
                    <span>1. اختر الفصل / الأسرة:</span>
                    {isRestrictedRole && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-normal">
                        (خدمتك المخصصة)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFamilyId}
                      onChange={(e) => setSelectedFamilyId(e.target.value)}
                      disabled={isRestrictedRole}
                      className="w-full py-2.5 px-3 rounded-2xl border border-[#EAE3E4] bg-white text-xs font-bold text-[#282326] focus:outline-none focus:border-[#702C3B] shadow-2xs appearance-none disabled:bg-gray-50 disabled:text-gray-600"
                    >
                      {families.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    {!isRestrictedRole && (
                      <ChevronDown className="w-4 h-4 text-[#81777A] absolute left-3 top-3 pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* 2. Friday Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#421923] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#702C3B]" />
                    <span>2. اختر جمعة اللقاء:</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMeetingId}
                      onChange={(e) => setSelectedMeetingId(e.target.value)}
                      disabled={meetings.length === 0}
                      className="w-full py-2.5 px-3 rounded-2xl border border-[#EAE3E4] bg-white text-xs font-bold text-[#282326] focus:outline-none focus:border-[#702C3B] shadow-2xs appearance-none"
                    >
                      {meetings.length === 0 ? (
                        <option value="">لا توجد لقاءات مسجلة لهذه الأسرة</option>
                      ) : (
                        meetings.map((m) => {
                          const dateOnly = String(m.date).split('T')[0];
                          return (
                            <option key={m.id} value={m.id}>
                              الجمعة ({dateOnly}) — {m.title || 'لقاء أسبوعي'}
                            </option>
                          );
                        })
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#81777A] absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Loading Indicator */}
            {detailsLoading ? (
              <div className="bg-white rounded-3xl border border-[#EAE3E4] p-10 text-center space-y-2 shadow-xs">
                <div className="w-8 h-8 rounded-full border-2 border-[#702C3B] border-t-transparent animate-spin mx-auto"></div>
                <div className="text-xs font-bold text-[#702C3B]">جارٍ تحميل وقائع وتفاصيل كشكول اللقاء...</div>
              </div>
            ) : !meetingDetails ? (
              <div className="bg-white rounded-3xl border border-[#EAE3E4] p-8 text-center space-y-3 shadow-xs">
                <BookOpen className="w-10 h-10 text-[#81777A] mx-auto opacity-40" />
                <h3 className="font-bold text-sm text-[#421923]">لا توجد تفاصيل مسجلة لهذا اللقاء بعد</h3>
                <p className="text-xs text-[#81777A] max-w-sm mx-auto">
                  اختر جمعة أخرى من القائمة أعلاه أو ابدأ بتسجيل الحضور والكشكول لهذا الأسبوع الآن.
                </p>
                {selectedMeetingId && (
                  <Link
                    href={`/attendance?familyId=${selectedFamilyId}&meetingId=${selectedMeetingId}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#702C3B] text-white text-xs font-bold shadow-xs hover:bg-[#5A1E2D] transition-all"
                  >
                    <CalendarCheck className="w-4 h-4 text-amber-200" />
                    <span>تسجيل حضور هذا اللقاء الآن</span>
                  </Link>
                )}
              </div>
            ) : (
              /* THE COMPLETE FRIDAY NOTEBOOK (الكشكول الكنسي الشامل) */
              <div className="space-y-4">
                {/* 1. Header Card (Lesson Title, Family, Date & Status) */}
                <div className="bg-white rounded-3xl border border-[#EAE3E4] p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-bold text-[#282326]">
                      <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs">
                        أسرة {selectedFamily?.name || 'الفصل'}
                      </span>
                      <span className="text-[#81777A] flex items-center gap-1 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-[#702C3B]" />
                        <span>{formatArabicDate(meetingDetails.meeting?.date)}</span>
                      </span>
                    </div>

                    {/* Status Badge */}
                    {meetingDetails.report?.status === 'approved' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#166534] flex items-center gap-1 border border-[#BBF7D0]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>كشكول معتمد ✓</span>
                      </span>
                    ) : meetingDetails.report?.status === 'submitted' || meetingDetails.report?.status === 'under_review' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] flex items-center gap-1 border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>قيد المراجعة</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 flex items-center gap-1 border border-gray-200">
                        <span>مسودة لقاء</span>
                      </span>
                    )}
                  </div>

                  <div className="pt-1 border-t border-gray-100">
                    <h2 className="text-base sm:text-lg font-bold text-[#421923] leading-snug">
                      {meetingDetails.report?.lesson_title 
                        ? `درس: ${meetingDetails.report.lesson_title}`
                        : meetingDetails.meeting?.title || 'لقاء الجمعة الأسبوعي'}
                    </h2>
                    {meetingDetails.report?.lesson_topic && (
                      <div className="text-xs text-[#81777A] mt-0.5">
                        المحور والهدف: <strong>{meetingDetails.report.lesson_topic}</strong>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons Bar */}
                  <div className="pt-2 flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/notebooks/${meetingDetails.report?.id || selectedMeetingId}`}
                      className="px-3.5 py-2 rounded-xl bg-[#702C3B] hover:bg-[#5A1E2D] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-200" />
                      <span>تعديل ملاحظات الكشكول</span>
                    </Link>

                    <Link
                      href={`/attendance?familyId=${selectedFamilyId}&meetingId=${selectedMeetingId}`}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>تسجيل / تعديل كشف الحضور</span>
                    </Link>
                  </div>
                </div>

                {/* 2. Servants Performance & Roles Ribbon (من شرح ومن حضر القداس) */}
                <div className="bg-white rounded-3xl border border-[#EAE3E4] p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs sm:text-sm text-[#421923] flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#702C3B]" />
                      <span>خدام اللقاء ومشاركاتهم في الجمعة:</span>
                    </h3>
                    <span className="text-[11px] text-[#81777A]">
                      حضور القداس والافتتاحية والدرس
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {/* Opening */}
                    <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-1">
                      <div className="flex items-center justify-between text-sky-900 font-bold text-[11px]">
                        <span>🎤 الافتتاحية</span>
                        <Sparkles className="w-3.5 h-3.5 text-sky-700" />
                      </div>
                      <div className="font-bold text-xs text-[#282326] truncate">
                        {openingServant ? openingServant.servant_name : 'لم يُسجل'}
                      </div>
                    </div>

                    {/* Lesson */}
                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                      <div className="flex items-center justify-between text-emerald-900 font-bold text-[11px]">
                        <span>📖 شرح الدرس</span>
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="font-bold text-xs text-[#282326] truncate">
                        {lessonServant ? lessonServant.servant_name : 'لم يُسجل'}
                      </div>
                    </div>

                    {/* Notebook Prep */}
                    <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1">
                      <div className="flex items-center justify-between text-[#702C3B] font-bold text-[11px]">
                        <span>📓 محضر الكشكول</span>
                        <BookOpen className="w-3.5 h-3.5 text-[#702C3B]" />
                      </div>
                      <div className="font-bold text-xs text-[#282326] truncate">
                        {prepServant ? prepServant.servant_name : 'لم يُسجل'}
                      </div>
                    </div>

                    {/* Workshop */}
                    <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-1">
                      <div className="flex items-center justify-between text-purple-900 font-bold text-[11px]">
                        <span>👥 ورش العمل</span>
                        <Users className="w-3.5 h-3.5 text-purple-700" />
                      </div>
                      <div className="font-bold text-xs text-[#282326] truncate">
                        {workshopServant ? workshopServant.servant_name : 'لم يُسجل'}
                      </div>
                    </div>
                  </div>

                  {/* Servant Liturgy Attendance Details */}
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-amber-950">
                      <span className="flex items-center gap-1.5">
                        <Church className="w-4 h-4 text-amber-800" />
                        <span>خدام الفصل الحاضرون للقداس الإلهي:</span>
                      </span>
                      <span className="text-xs bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                        {liturgyServants.length} من {meetingDetails.servants?.length || 0} خادم
                      </span>
                    </div>

                    {liturgyServants.length === 0 ? (
                      <div className="text-[11px] text-[#81777A]">لم يتم تسجيل حضور قداس للخدام في هذا اللقاء.</div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {liturgyServants.map((srv) => (
                          <span
                            key={srv.servant_id}
                            className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 text-[#421923] text-[11px] font-bold shadow-2xs flex items-center gap-1"
                          >
                            <span>⛪ {srv.servant_name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Served Members Attendance Breakdown (مين حضر) */}
                <div className="bg-white rounded-3xl border border-[#EAE3E4] p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-[#421923] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#702C3B]" />
                        <span>كشف حضور وغياب المخدومين:</span>
                      </h3>
                      <p className="text-[10px] text-[#81777A] mt-0.5">
                        من حضر اللقاء، القداس، والتناول مع إمكانية المتابعة الفورية
                      </p>
                    </div>

                    <div className="text-left">
                      <span className="text-lg font-bold text-emerald-700">{attendanceRate}%</span>
                      <span className="text-[10px] text-[#81777A] block">نسبة الحضور</span>
                    </div>
                  </div>

                  {/* 3 Summary Stats Strip */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 block">الحاضرون</span>
                      <strong className="text-base text-emerald-900 block my-0.5">
                        {presentMembers.length}
                      </strong>
                      <span className="text-[9px] text-emerald-700">مخدوم</span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-red-50 border border-red-200">
                      <span className="text-[10px] text-red-800 block">الغائبون</span>
                      <strong className="text-base text-red-900 block my-0.5">
                        {absentMembers.length}
                      </strong>
                      <span className="text-[9px] text-red-700">بحاجة لافتقاد</span>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                      <span className="text-[10px] text-amber-800 block">المعتذرون</span>
                      <strong className="text-base text-amber-900 block my-0.5">
                        {excusedMembers.length}
                      </strong>
                      <span className="text-[9px] text-amber-700">بعذر مسبق</span>
                    </div>
                  </div>

                  {/* Members List Table / Cards */}
                  <div className="space-y-2 pt-2">
                    {meetingDetails.members?.length === 0 ? (
                      <div className="text-center py-6 text-xs text-[#81777A]">
                        لا يوجد مخدومون مسجلون في هذه الأسرة حالياً.
                      </div>
                    ) : (
                      meetingDetails.members.map((m) => {
                        const isPresent = m.status === 'present';
                        const isAbsent = m.status === 'absent';
                        const isExcused = m.status === 'excused';

                        return (
                          <div
                            key={m.member_id}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                              isPresent
                                ? 'bg-white border-[#EAE3E4] hover:border-emerald-300'
                                : isAbsent
                                ? 'bg-rose-50/50 border-rose-200'
                                : 'bg-amber-50/40 border-amber-200'
                            }`}
                          >
                            {/* Member info */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-[#282326]">
                                  {m.member_name}
                                </span>
                                {m.stage && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-[#81777A]">
                                    {m.stage}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#81777A] mt-0.5 flex items-center gap-2">
                                <span>كود: {m.code}</span>
                                {m.assigned_servant_name && (
                                  <>
                                    <span>•</span>
                                    <span>الخادم: {m.assigned_servant_name}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Status & Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Status Badge */}
                              <span
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                                  isPresent
                                    ? 'bg-[#DCFCE7] text-[#166534]'
                                    : isAbsent
                                    ? 'bg-[#FEE2E2] text-[#991B1B]'
                                    : isExcused
                                    ? 'bg-[#FEF3C7] text-[#92400E]'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {isPresent ? 'حاضر ✓' : isAbsent ? 'غائب ✗' : isExcused ? 'معتذر' : 'لم يسجل'}
                              </span>

                              {/* Liturgy */}
                              {Number(m.attended_liturgy) > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-bold" title="حضر القداس">
                                  ⛪
                                </span>
                              )}

                              {/* Communion */}
                              {Number(m.attended_communion) > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-red-100 text-red-900 font-bold" title="تناول من الأسرار">
                                  🍷
                                </span>
                              )}

                              {/* Direct WhatsApp Contact */}
                              {m.guardian_phone && (
                                <button
                                  onClick={() => handleParentWhatsApp(m)}
                                  className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                  title="مراسلة ولي الأمر عبر واتساب"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 4. Lesson Notes & Pastoral Reflections */}
                {meetingDetails.report && (
                  <div className="bg-white rounded-3xl border border-[#EAE3E4] p-4 sm:p-5 shadow-xs space-y-3 text-xs">
                    <h3 className="font-bold text-xs sm:text-sm text-[#421923] flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-[#702C3B]" />
                      <span>ملاحظات وفقرات الكشكول الأسبوعي:</span>
                    </h3>

                    {meetingDetails.report.opening_paragraph_notes && (
                      <div className="p-3 rounded-2xl bg-[#FAF5F6] border border-[#EAE3E4] space-y-1">
                        <strong className="text-[#702C3B] text-[11px] block">🎤 فقرة الافتتاحية:</strong>
                        <p className="text-[#282326] leading-relaxed">
                          {meetingDetails.report.opening_paragraph_notes}
                        </p>
                      </div>
                    )}

                    {meetingDetails.report.visual_aid_notes && (
                      <div className="p-3 rounded-2xl bg-[#FAF5F6] border border-[#EAE3E4] space-y-1">
                        <strong className="text-[#702C3B] text-[11px] block">🎨 الوسيلة الإيضاحية والأنشطة:</strong>
                        <p className="text-[#282326] leading-relaxed">
                          {meetingDetails.report.visual_aid_notes}
                        </p>
                      </div>
                    )}

                    {meetingDetails.report.review_notes && (
                      <div className="p-3 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1">
                        <strong className="text-[#92400E] text-[11px] block">✍️ ملاحظات الاعتماد الرعوي:</strong>
                        <p className="text-[#92400E] leading-relaxed italic">
                          "{meetingDetails.report.review_notes}"
                        </p>
                        <div className="text-[10px] text-[#92400E]/70 pt-0.5">
                          {meetingDetails.report.reviewed_by_name || 'قدس أبونا'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =============================================================== */}
        {/* TAB 2: ARCHIVE & PREVIOUS NOTEBOOKS (أرشيف الكشاكيل والتقارير) */}
        {/* =============================================================== */}
        {activeTab === 'archive' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-white rounded-3xl border border-[#EAE3E4] p-4 shadow-xs space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#81777A] absolute right-3.5 top-3" />
                <input
                  type="text"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder="بحث بعنوان الدرس أو اسم الأسرة..."
                  className="w-full pr-10 pl-3 py-2.5 text-xs rounded-2xl border border-[#EAE3E4] bg-white focus:outline-none focus:border-[#702C3B] shadow-2xs"
                />
              </div>

              {/* Families Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  onClick={() => setArchiveFamilyFilter('all')}
                  className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all shadow-2xs ${
                    archiveFamilyFilter === 'all'
                      ? 'bg-[#5A1E2D] text-white'
                      : 'bg-white border border-[#EAE3E4] text-[#282326] hover:bg-[#FAF5F6]'
                  }`}
                >
                  الكل ({reports.length})
                </button>

                {families.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setArchiveFamilyFilter(f.id)}
                    className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all shadow-2xs ${
                      archiveFamilyFilter === f.id
                        ? 'bg-[#5A1E2D] text-white'
                        : 'bg-white border border-[#EAE3E4] text-[#282326] hover:bg-[#FAF5F6]'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 3 Metric Cards Strip */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-3 rounded-2xl border border-[#EAE3E4] shadow-2xs">
                <span className="text-[10px] text-[#81777A] block leading-tight">الكشاكيل المقدمة</span>
                <span className="text-base sm:text-xl font-bold text-[#282326] block my-1">
                  {submittedCount} / {totalReportsCount}
                </span>
                <span className="text-[10px] text-[#166534] font-bold block">{completionRate}% إنجاز</span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-[#FDE68A] shadow-2xs">
                <span className="text-[10px] text-[#92400E] block leading-tight">قيد المراجعة</span>
                <span className="text-base sm:text-xl font-bold text-[#92400E] block my-1">
                  {underReviewCount}
                </span>
                <span className="text-[10px] text-[#81777A] block">بانتظار الاعتماد</span>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-[#BBF7D0] shadow-2xs">
                <span className="text-[10px] text-[#166534] block leading-tight">تم الاعتماد</span>
                <span className="text-base sm:text-xl font-bold text-[#166534] block my-1">
                  {approvedCount}
                </span>
                <span className="text-[10px] text-[#166534] font-bold block">مكتمل بالكامل</span>
              </div>
            </div>

            {/* Reports List */}
            {filteredReports.length === 0 ? (
              <div className="bg-white rounded-3xl border border-[#EAE3E4] p-8 text-center space-y-2 shadow-2xs">
                <BookOpen className="w-8 h-8 text-[#702C3B] mx-auto opacity-60" />
                <h3 className="font-bold text-sm text-[#421923]">لا توجد كشاكيل مسجلة</h3>
                <p className="text-xs text-[#81777A] max-w-sm mx-auto">
                  اختر تبويب "استعراض كشكول الجمعة" لتسجيل كشكول جديد لأي أسبوع.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((rep) => {
                  const isApproved = rep.status === 'approved';

                  return (
                    <div
                      key={rep.id}
                      className="bg-white rounded-3xl border border-[#EAE3E4] p-4 shadow-2xs space-y-3 hover:border-[#702C3B]/40 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-[#282326]">
                          <span>{rep.family_name || 'الفصل'}</span>
                          <span className="text-[#81777A]">•</span>
                          <span className="text-[#81777A] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#702C3B]" />
                            <span>{rep.meeting_date}</span>
                          </span>
                        </div>

                        {isApproved ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] flex items-center gap-1">
                            <span>✓</span>
                            <span>معتمد</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] flex items-center gap-1">
                            <span>●</span>
                            <span>قيد المراجعة</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-[#282326]">
                          درس: {rep.lesson_title}
                        </h4>
                        <div className="text-xs text-[#81777A] mt-0.5">
                          المحور: {rep.lesson_topic}
                        </div>
                      </div>

                      <div className="bg-[#FAF5F6] p-2.5 rounded-2xl border border-[#EAE3E4] grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-[#81777A] block">حضور المخدومين:</span>
                          <strong className="text-xs text-[#282326]">
                            {rep.present_members_count} من {rep.total_members_count}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#81777A] block">حضور الخدام:</span>
                          <strong className="text-xs text-[#282326]">
                            {rep.present_servants_count} من {rep.total_servants_count}
                          </strong>
                        </div>
                      </div>

                      <Link
                        href={`/notebooks/${rep.meeting_id || rep.id}`}
                        className="w-full py-2.5 rounded-2xl bg-[#5A1E2D] hover:bg-[#421923] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <BookOpen className="w-4 h-4 text-amber-200" />
                        <span>عرض وتعديل الكشكول</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
