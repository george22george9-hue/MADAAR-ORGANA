'use client';

// ====================================================================
// ORGANA — Digital Weekly Family Notebook (الكشكول الإلكتروني)
// Complete Submission & Review Workflow
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import {
  WeeklyNotebookReport,
  Meeting,
  MeetingActivity,
  ReportStatus
} from '@/types/organa';
import {
  BookOpen,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Save,
  Send,
  FileCheck2,
  Users,
  UserCheck,
  Sparkles,
  History,
  Printer
} from 'lucide-react';
import { exportToPrintablePDF } from '@/lib/export/pdf';

export default function SingleNotebookPage() {
  const params = useParams();
  const router = useRouter();
  const { currentRole, canReviewReports, assignedFamilyId } = useAuth();
  const targetId = params.id as string; // Can be reportId or meetingId

  const [report, setReport] = useState<any>(null);
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submittingWorkflow, setSubmittingWorkflow] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Form Fields
  const [openingNotes, setOpeningNotes] = useState('');
  const [visualNotes, setVisualNotes] = useState('');
  const [workshopNotes, setWorkshopNotes] = useState('');
  const [competitionNotes, setCompetitionNotes] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');

  // Review Dialog
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'returned_for_corrections'>('approved');
  const [reviewFeedback, setReviewFeedback] = useState('');

  const loadData = async () => {
    try {
      const famParam = assignedFamilyId ? `&role=${currentRole}&userFamilyId=${assignedFamilyId}` : `&role=${currentRole}`;
      // Find meeting first or try report
      let mRes = await fetch(`/api/meetings/${targetId}?${famParam}`).then(r => r.json());
      if (mRes.success && mRes.meeting) {
        setMeeting(mRes.meeting);
        if (mRes.meeting.report) {
          populateReport(mRes.meeting.report);
        } else {
          // Fetch report by meeting id
          const rRes = await fetch(`/api/reports?meetingId=${targetId}${famParam}`).then(r => r.json());
          if (rRes.success && rRes.reports.length > 0) {
            populateReport(rRes.reports[0]);
          }
        }
      } else {
        // Target might be report ID
        const rRes = await fetch(`/api/reports/${targetId}?${famParam}`).then(r => r.json());
        if (rRes.success && rRes.report) {
          populateReport(rRes.report);
          const m2Res = await fetch(`/api/meetings/${rRes.report.meeting_id}?${famParam}`).then(r => r.json());
          if (m2Res.success) setMeeting(m2Res.meeting);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const populateReport = (rep: any) => {
    setReport(rep);
    setOpeningNotes(rep.opening_paragraph_notes || '');
    setVisualNotes(rep.visual_aid_notes || '');
    setWorkshopNotes(rep.workshop_notes || '');
    setCompetitionNotes(rep.competition_notes || '');
    setGeneralNotes(rep.general_notes || '');
    setFollowupNotes(rep.followup_requirements || '');
  };

  useEffect(() => {
    loadData();
  }, [targetId]);

  // Handle Save Draft
  const handleSaveDraft = async () => {
    if (!report) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          opening_paragraph_notes: openingNotes,
          visual_aid_notes: visualNotes,
          workshop_notes: workshopNotes,
          competition_notes: competitionNotes,
          general_notes: generalNotes,
          followup_requirements: followupNotes,
          actorRole: currentRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setReport(json.report);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handle Submit for Review
  const handleSubmitReport = async () => {
    if (!report) return;
    if (!confirm('هل أنت متأكد من تسليم الكشكول لأمين الخدمة للمراجعة والاعتماد؟')) return;
    setSubmittingWorkflow(true);

    try {
      // Save draft first
      await fetch('/api/reports', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          opening_paragraph_notes: openingNotes,
          visual_aid_notes: visualNotes,
          workshop_notes: workshopNotes,
          competition_notes: competitionNotes,
          general_notes: generalNotes,
          followup_requirements: followupNotes,
          actorRole: currentRole,
        }),
      });

      // Submit
      const res = await fetch(`/api/reports/${report.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorRole: currentRole }),
      });
      const json = await res.json();
      if (json.success) {
        setReport(json.report);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingWorkflow(false);
    }
  };

  // Handle Review (Approve or Return)
  const handleReviewAction = async () => {
    if (!report) return;
    setSubmittingWorkflow(true);
    try {
      const res = await fetch(`/api/reports/${report.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewAction,
          reviewNotes: reviewFeedback || (reviewAction === 'approved' ? 'معتمد ومبارك، الرب يبارك خدمتكم' : 'يرجى مراجعة واستكمال الملاحظات'),
          actorRole: currentRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowReviewModal(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingWorkflow(false);
    }
  };

  const handlePrintPDF = () => {
    if (!report || !meeting) return;
    exportToPrintablePDF(
      `الكشكول الأسبوعي — أسرة ${report.family_name}`,
      `لقاء: ${meeting.title} — درس: ${report.lesson_title} (${report.meeting_date})`,
      ['البند / الفقرة', 'التفاصيل وملاحظات التنفيذ'],
      [
        ['موضوع الدرس والمحور', `${report.lesson_title} — ${report.lesson_topic}`],
        ['إحصائيات الحضور', `حضور المخدومين: ${report.present_members_count} من ${report.total_members_count} • حضور الخدام: ${report.present_servants_count}`],
        ['الفقرة الافتتاحية', openingNotes || '—'],
        ['وسيلة الإيضاح', visualNotes || '—'],
        ['ورشة العمل', workshopNotes || '—'],
        ['المسابقات والأنشطة', competitionNotes || '—'],
        ['ملاحظات عامة', generalNotes || '—'],
        ['متطلبات الافتقاد', followupNotes || '—'],
        ['حالة الاعتماد', report.status === 'approved' ? 'معتمد رسمياً' : (report.status === 'submitted' ? 'قيد المراجعة' : 'مسودة')],
      ],
      [
        { label: 'نسبة حضور المخدومين', value: `${report.total_members_count > 0 ? Math.round((report.present_members_count / report.total_members_count) * 100) : 0}%` },
        { label: 'تاريخ اللقاء', value: report.meeting_date },
        { label: 'أمين الأسرة', value: report.submitted_by_name || 'أمين الأسرة' },
      ]
    );
  };

  if (loading || !report) {
    return (
      <AppLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-white rounded-2xl border border-[#EAE3E4]"></div>
          <div className="h-64 bg-white rounded-2xl border border-[#EAE3E4]"></div>
        </div>
      </AppLayout>
    );
  }

  const isEditable = report.status === 'draft' || report.status === 'returned_for_corrections' || currentRole === 'priest';

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Breadcrumb Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/notebooks"
            className="text-xs text-[#702C3B] font-bold flex items-center gap-1 hover:underline"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لكافة الكشاكيل</span>
          </Link>

          <button
            onClick={handlePrintPDF}
            className="px-3 py-1.5 rounded-xl border border-[#EAE3E4] bg-white text-xs font-bold text-[#702C3B] hover:bg-[#FAF5F6] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة وتصدير الكشكول PDF</span>
          </button>
        </div>

        {/* Notebook Header Banner */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-bold text-sm text-[#421923]">{report.family_name}</span>
              <span className="text-xs text-[#81777A]">بتاريخ: {report.meeting_date}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                report.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                report.status === 'submitted' || report.status === 'under_review' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                report.status === 'returned_for_corrections' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                {report.status === 'approved' ? 'كشكول معتمد ومبارك' :
                 report.status === 'submitted' ? 'تم التسليم — قيد مراجعة أمين الخدمة' :
                 report.status === 'returned_for_corrections' ? 'مُعاد للتعديل واستكمال الملاحظات' : 'مسودة قيد الكتابة'}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-[#282326]">
              الكشكول الإلكتروني: {report.lesson_title}
            </h1>
            <div className="text-xs text-[#81777A] mt-1">
              المحور: {report.lesson_topic}
            </div>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isEditable && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="px-3.5 py-2 rounded-xl border border-[#EAE3E4] text-[#282326] hover:bg-[#FAF5F6] text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4 text-[#702C3B]" />
                  <span>{saving ? 'جارٍ الحفظ...' : (showSuccessToast ? 'تم الحفظ!' : 'حفظ كمسودة')}</span>
                </button>

                <button
                  onClick={handleSubmitReport}
                  disabled={submittingWorkflow}
                  className="px-4 py-2 rounded-xl bg-[#702C3B] text-white hover:bg-[#5A232F] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{submittingWorkflow ? 'جارٍ الإرسال...' : 'تسليم الكشكول رسمياً'}</span>
                </button>
              </>
            )}

            {/* Secretary / Priest Review Action */}
            {canReviewReports && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setReviewAction('returned_for_corrections');
                    setShowReviewModal(true);
                  }}
                  className="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                >
                  إعادة للتعديل
                </button>
                <button
                  onClick={() => {
                    setReviewAction('approved');
                    setShowReviewModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#10B981] text-white hover:bg-[#059669] text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد الكشكول</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Review Notes Alert if returned */}
        {report.review_notes && (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-start gap-2.5">
            <RotateCcw className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">ملاحظات وتعليق المراجعة:</strong>
              <div className="leading-relaxed">{report.review_notes}</div>
            </div>
          </div>
        )}

        {/* Attendance Statistics Strip */}
        <div className="bg-white rounded-2xl p-5 border border-[#EAE3E4] shadow-sm">
          <div className="font-bold text-xs text-[#421923] mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#702C3B]" />
            <span>إحصائيات حضور اللقاء المسجلة بالكشكول:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="p-3 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4]">
              <span className="text-[#81777A] text-[10px] block">المخدومين الحاضرين</span>
              <span className="text-lg font-bold text-[#10B981]">
                {report.present_members_count} من {report.total_members_count}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4]">
              <span className="text-[#81777A] text-[10px] block">الغائبين</span>
              <span className="text-lg font-bold text-[#EF4444]">{report.absent_members_count}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4]">
              <span className="text-[#81777A] text-[10px] block">المعتذرين</span>
              <span className="text-lg font-bold text-[#F59E0B]">{report.excused_members_count}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4]">
              <span className="text-[#81777A] text-[10px] block">الخدام الحاضرين</span>
              <span className="text-lg font-bold text-[#702C3B]">
                {report.present_servants_count} من {report.total_servants_count}
              </span>
            </div>
          </div>
        </div>

        {/* Notebook Content Sections */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm space-y-5 text-xs">
          <h2 className="text-base font-bold text-[#421923] border-b border-[#EAE3E4] pb-3">
            بنود وفقرات الكشكول الأسبوعي
          </h2>

          {/* 1. Opening Paragraph */}
          <div>
            <label className="block font-bold text-[#282326] mb-1.5">
              1. الفقرة الافتتاحية والصلاة والألحان:
            </label>
            <textarea
              rows={2}
              disabled={!isEditable}
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              placeholder="سجل تفاصيل صلاة الشكر، الترانيم، المزامير المرددة، ومدى تجاوب المخدومين..."
              className="w-full p-3 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] disabled:bg-[#FAF5F6]"
            />
          </div>

          {/* 2. Visual Aid */}
          <div>
            <label className="block font-bold text-[#282326] mb-1.5">
              2. وسيلة الإيضاح والمجسم التوضيحي:
            </label>
            <textarea
              rows={2}
              disabled={!isEditable}
              value={visualNotes}
              onChange={(e) => setVisualNotes(e.target.value)}
              placeholder="الأدوات المعينة المستخدمة (شاشات عرض، مجسمات تاريخية، صور، فيديو توضيحي)..."
              className="w-full p-3 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] disabled:bg-[#FAF5F6]"
            />
          </div>

          {/* 3. Workshop */}
          <div>
            <label className="block font-bold text-[#282326] mb-1.5">
              3. ورشة العمل والتطبيقات العملية:
            </label>
            <textarea
              rows={2}
              disabled={!isEditable}
              value={workshopNotes}
              onChange={(e) => setWorkshopNotes(e.target.value)}
              placeholder="تقسيم المجموعات، حفظ الآية، المناقشة التفاعلية..."
              className="w-full p-3 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] disabled:bg-[#FAF5F6]"
            />
          </div>

          {/* 4. Competition & Activities */}
          <div>
            <label className="block font-bold text-[#282326] mb-1.5">
              4. المسابقات والفقرات التشجيعية:
            </label>
            <textarea
              rows={2}
              disabled={!isEditable}
              value={competitionNotes}
              onChange={(e) => setCompetitionNotes(e.target.value)}
              placeholder="الأسئلة السريعة، الهدايا الموزعة، تكريم الفائزين..."
              className="w-full p-3 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] disabled:bg-[#FAF5F6]"
            />
          </div>

          {/* 5. General Notes */}
          <div>
            <label className="block font-bold text-[#282326] mb-1.5">
              5. ملاحظات عامة وسلوكيات اللقاء:
            </label>
            <textarea
              rows={2}
              disabled={!isEditable}
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="ملاحظات الانضباط، الهدوء، الالتزام بالموعد..."
              className="w-full p-3 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] disabled:bg-[#FAF5F6]"
            />
          </div>

          {/* 6. Follow-up Requirements */}
          <div>
            <label className="block font-bold text-[#282326] mb-1.5 text-amber-900">
              6. متطلبات الافتقاد والمتابعة العاجلة:
            </label>
            <textarea
              rows={2}
              disabled={!isEditable}
              value={followupNotes}
              onChange={(e) => setFollowupNotes(e.target.value)}
              placeholder="أسماء المخدومين الغائبين أو الذين يحتاجون لافتقاد أو زيارة منزلية..."
              className="w-full p-3 rounded-xl border border-amber-300 bg-amber-50/20 focus:outline-none focus:border-[#702C3B] disabled:bg-[#FAF5F6]"
            />
          </div>

          {/* Footer Save Button */}
          {isEditable && (
            <div className="pt-4 border-t border-[#EAE3E4] flex items-center justify-end gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-[#EAE3E4] text-[#282326] font-bold hover:bg-[#FAF5F6]"
              >
                {saving ? 'جارٍ الحفظ...' : 'حفظ كمسودة'}
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={submittingWorkflow}
                className="px-6 py-2 rounded-xl bg-[#702C3B] text-white font-bold hover:bg-[#5A232F] shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>تسليم الكشكول للمراجعة والاعتماد</span>
              </button>
            </div>
          )}
        </div>

        {/* Review Feedback Modal for Secretary / Priest */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <h3 className="font-bold text-base text-[#421923]">
                  {reviewAction === 'approved' ? 'اعتماد الكشكول رسمياً' : 'إعادة الكشكول للتعديل'}
                </h3>
                <button onClick={() => setShowReviewModal(false)} className="text-[#81777A]">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#282326] mb-1">
                    {reviewAction === 'approved' ? 'كلمة تشجيعية أو توجيه ختامي:' : 'ملاحظات وأسباب الإعادة للتعديل:'}
                  </label>
                  <textarea
                    rows={3}
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder={reviewAction === 'approved' ? 'الرب يبارك خدمتكم وتعب محبتكم...' : 'يرجى استكمال بنود وسيلة الإيضاح...'}
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE3E4]">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#EAE3E4] text-[#81777A] font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleReviewAction}
                  disabled={submittingWorkflow}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-sm ${
                    reviewAction === 'approved' ? 'bg-[#10B981] hover:bg-[#059669]' : 'bg-[#EF4444] hover:bg-[#DC2626]'
                  }`}
                >
                  {submittingWorkflow ? 'جارٍ التنفيذ...' : (reviewAction === 'approved' ? 'تأكيد الاعتماد' : 'إعادة للتعديل')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

