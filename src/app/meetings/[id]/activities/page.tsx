'use client';

// ====================================================================
// ORGANA — Dynamic Meeting Activity Planner & Multi-Servant Assignor
// CRITICAL REQUIREMENT: Unlimited Servants per Activity
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import {
  Meeting,
  MeetingActivity,
  MeetingActivityAssignment,
  Servant,
  ActivityResponsibility,
  ParticipationStatus
} from '@/types/organa';
import {
  Sparkles,
  Calendar,
  Clock,
  Plus,
  Trash2,
  UserPlus,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronLeft
} from 'lucide-react';

export default function MeetingActivitiesPage() {
  const params = useParams();
  const router = useRouter();
  const { currentRole, assignedFamilyId } = useAuth();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<(Meeting & { activities: MeetingActivity[] }) | null>(null);
  const [servants, setServants] = useState<Servant[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Activity Modal
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDesc, setNewActivityDesc] = useState('');

  // Assign Servant Modal
  const [assigningActivity, setAssigningActivity] = useState<MeetingActivity | null>(null);
  const [selectedServantId, setSelectedServantId] = useState('');
  const [selectedResponsibility, setSelectedResponsibility] = useState<ActivityResponsibility>('participant');
  const [selectedStatus, setSelectedStatus] = useState<ParticipationStatus>('assigned');
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    const famParam = assignedFamilyId ? `&userFamilyId=${assignedFamilyId}&familyId=${assignedFamilyId}` : '';
    Promise.all([
      fetch(`/api/meetings/${meetingId}?role=${currentRole}${famParam}`).then(r => r.json()),
      fetch(`/api/servants?role=${currentRole}${famParam}`).then(r => r.json()),
    ])
      .then(([mRes, sRes]) => {
        if (mRes.success) setMeeting(mRes.meeting);
        if (sRes.success) {
          setServants(sRes.servants);
          if (sRes.servants.length > 0) setSelectedServantId(sRes.servants[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [meetingId]);

  // Handle Add Activity
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityTitle.trim()) return;
    setSubmitting(true);

    try {
      const orderIndex = (meeting?.activities?.length || 0) + 1;
      const res = await fetch(`/api/meetings/${meetingId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newActivityTitle.trim(),
          description: newActivityDesc.trim(),
          order_index: orderIndex,
          actorRole: currentRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddActivityModal(false);
        setNewActivityTitle('');
        setNewActivityDesc('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Activity
  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفقرة وكافة تكليفات الخدام المرتبطة بها؟')) return;
    try {
      const res = await fetch(`/api/meetings/${meetingId}/activities?activityId=${activityId}&actorRole=${currentRole}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Assign Servant to Activity
  const handleAssignServant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningActivity || !selectedServantId) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/meetings/${meetingId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: assigningActivity.id,
          servant_id: selectedServantId,
          responsibility: selectedResponsibility,
          participation_status: selectedStatus,
          actorRole: currentRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAssigningActivity(null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Quick Toggle of Participation Status (Participated / Absent)
  const handleToggleParticipation = async (assignmentId: string, currentStatus: ParticipationStatus) => {
    const nextStatus: ParticipationStatus = 
      currentStatus === 'participated' ? 'not_participated' :
      currentStatus === 'not_participated' ? 'unconfirmed' : 'participated';

    try {
      await fetch(`/api/meetings/${meetingId}/assignments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          updates: { participation_status: nextStatus },
          actorRole: currentRole,
        }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Remove Servant Assignment
  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('هل تريد إلغاء تكليف هذا الخادم من الفقرة؟')) return;
    try {
      await fetch(`/api/meetings/${meetingId}/assignments?assignmentId=${assignmentId}&actorRole=${currentRole}`, {
        method: 'DELETE',
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !meeting) {
    return (
      <AppLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-28 bg-white rounded-2xl border border-[#EAE3E4]"></div>
          <div className="h-40 bg-white rounded-2xl border border-[#EAE3E4]"></div>
        </div>
      </AppLayout>
    );
  }

  const responsibilityLabels: Record<ActivityResponsibility, { ar: string; bg: string }> = {
    main_presenter: { ar: 'المقدم الرئيسي', bg: 'bg-purple-100 text-purple-900 border-purple-200' },
    assistant: { ar: 'مساعد', bg: 'bg-blue-100 text-blue-900 border-blue-200' },
    lesson_preparer: { ar: 'إعداد الدرس', bg: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
    presenter: { ar: 'شرح وتقديم', bg: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
    organizer: { ar: 'منظم', bg: 'bg-amber-100 text-amber-900 border-amber-200' },
    tech_support: { ar: 'دعم فني ووسائل', bg: 'bg-cyan-100 text-cyan-900 border-cyan-200' },
    participant: { ar: 'مشارك', bg: 'bg-gray-100 text-gray-800 border-gray-200' },
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back Link & Meeting Header */}
        <div className="flex items-center gap-2">
          <Link
            href="/meetings"
            className="text-xs text-[#702C3B] font-bold flex items-center gap-1 hover:underline"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لقائمة اللقاءات</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5F6] text-[#702C3B] border border-[#EAE3E4]">
                أسرة {meeting.family_name}
              </span>
              <span className="text-xs text-[#81777A]">بتاريخ: {meeting.date}</span>
              <span className="text-xs text-[#81777A]">الساعة: {meeting.start_time}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#421923]">{meeting.title}</h1>
            <div className="text-xs text-[#81777A] mt-1">
              الدرس: <strong className="text-[#282326]">{meeting.lesson_title}</strong> — {meeting.lesson_topic}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/attendance?meetingId=${meeting.id}`}
              className="px-3.5 py-2 rounded-xl border border-[#EAE3E4] text-[#282326] hover:bg-[#FAF5F6] text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4 text-[#10B981]" />
              <span>تسجيل الحضور</span>
            </Link>
            <Link
              href={`/notebooks/${meeting.id}`}
              className="px-3.5 py-2 rounded-xl bg-[#702C3B] text-white hover:bg-[#5A232F] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>الكشكول الأسبوعي</span>
            </Link>
            <button
              onClick={() => setShowAddActivityModal(true)}
              className="px-4 py-2 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4] text-[#702C3B] hover:bg-[#F0E4E7] text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة فقرة جديدة</span>
            </button>
          </div>
        </div>

        {/* Info Notification: Multiple Servants Supported */}
        <div className="p-4 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4] text-xs text-[#421923] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#702C3B] shrink-0" />
            <span>
              <strong>ملاحظة تنظيمية:</strong> تدعم منظومة أورجانا تكليف أكثر من خادم في نفس الفقرة وتحديد مسؤولية كل خادم وحالة مشاركته الفعلية.
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#702C3B] hidden sm:inline">
            إجمالي الفقرات: {meeting.activities.length}
          </span>
        </div>

        {/* Activities List */}
        <div className="space-y-4">
          {meeting.activities.map((act, idx) => (
            <div
              key={act.id}
              className="bg-white rounded-2xl border border-[#EAE3E4] p-5 shadow-sm hover:border-[#702C3B]/40 transition-all space-y-4"
            >
              {/* Activity Header */}
              <div className="flex items-start justify-between border-b border-[#EAE3E4] pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#FAF5F6] text-[#702C3B] font-bold text-xs flex items-center justify-center border border-[#EAE3E4]">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-[#282326]">{act.title}</h3>
                    {act.description && (
                      <p className="text-xs text-[#81777A] mt-0.5">{act.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAssigningActivity(act)}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4] text-[#702C3B] text-xs font-bold hover:bg-[#F0E4E7] transition-colors flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>تكليف خادم</span>
                  </button>

                  <button
                    onClick={() => handleDeleteActivity(act.id)}
                    className="p-1.5 rounded-xl border border-[#EAE3E4] text-[#81777A] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="حذف الفقرة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Assigned Servants Grid (CRITICAL REQUIREMENT) */}
              <div>
                <div className="text-[11px] font-bold text-[#81777A] mb-2 flex items-center justify-between">
                  <span>الخدام المكلفون بهذه الفقرة ({act.assignments?.length || 0}):</span>
                  <span className="text-[10px] text-[#81777A]">اضغط على علامة الحالة لتغييرها (شارك / لم يشارك)</span>
                </div>

                {!act.assignments || act.assignments.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#FAF5F6]/50 border border-dashed border-[#EAE3E4] text-center text-xs text-[#81777A]">
                    لم يتم تكليف خدام بهذه الفقرة بعد — اضغط "تكليف خادم" لإسناد خادم أو أكثر.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {act.assignments.map((asn) => {
                      const respInfo = responsibilityLabels[asn.responsibility] || { ar: asn.responsibility, bg: 'bg-gray-100 text-gray-800' };
                      const isParticipated = asn.participation_status === 'participated';
                      const isNotParticipated = asn.participation_status === 'not_participated';

                      return (
                        <div
                          key={asn.id}
                          className="p-3 rounded-xl border border-[#EAE3E4] bg-white flex items-center justify-between shadow-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-[#282326] truncate">
                              {asn.servant_name}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold border ${respInfo.bg}`}>
                                {respInfo.ar}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Participation Status Badge / Button */}
                            <button
                              onClick={() => handleToggleParticipation(asn.id, asn.participation_status)}
                              className={`p-1 rounded-lg text-xs font-bold transition-all ${
                                isParticipated
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isNotParticipated
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                              title="تغيير حالة المشاركة"
                            >
                              {isParticipated ? (
                                <span className="flex items-center gap-0.5 text-[10px] px-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>شارك</span>
                                </span>
                              ) : isNotParticipated ? (
                                <span className="flex items-center gap-0.5 text-[10px] px-1">
                                  <XCircle className="w-3 h-3" />
                                  <span>لم يشارك</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 text-[10px] px-1">
                                  <HelpCircle className="w-3 h-3" />
                                  <span>مكلف</span>
                                </span>
                              )}
                            </button>

                            <button
                              onClick={() => handleRemoveAssignment(asn.id)}
                              className="p-1 rounded-lg text-[#81777A] hover:text-rose-600 hover:bg-rose-50"
                              title="إلغاء التكليف"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Add New Activity */}
        {showAddActivityModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <h3 className="font-bold text-base text-[#421923]">إضافة فقرة جديدة باللقاء</h3>
                <button onClick={() => setShowAddActivityModal(false)} className="text-[#81777A]">✕</button>
              </div>

              <form onSubmit={handleAddActivity} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#282326] mb-1">عنوان الفقرة:</label>
                  <input
                    type="text"
                    required
                    value={newActivityTitle}
                    onChange={(e) => setNewActivityTitle(e.target.value)}
                    placeholder="مثال: ورشة تدريب الألحان القبطية"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">وصف أو تفاصيل الفقرة (اختياري):</label>
                  <textarea
                    rows={3}
                    value={newActivityDesc}
                    onChange={(e) => setNewActivityDesc(e.target.value)}
                    placeholder="تفاصيل الهدف من الفقرة والأدوات المستخدمة..."
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE3E4]">
                  <button
                    type="button"
                    onClick={() => setShowAddActivityModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#EAE3E4] text-[#81777A] font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-[#702C3B] text-white font-bold hover:bg-[#5A232F]"
                  >
                    {submitting ? 'جارٍ الإضافة...' : 'إضافة الفقرة'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Assign Servant to Activity */}
        {assigningActivity && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <div>
                  <h3 className="font-bold text-base text-[#421923]">تكليف خادم بالفقرة</h3>
                  <div className="text-xs text-[#81777A]">الفقرة: {assigningActivity.title}</div>
                </div>
                <button onClick={() => setAssigningActivity(null)} className="text-[#81777A]">✕</button>
              </div>

              <form onSubmit={handleAssignServant} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#282326] mb-1">اختر الخادم:</label>
                  <select
                    value={selectedServantId}
                    onChange={(e) => setSelectedServantId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  >
                    {servants.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name} ({s.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">المسؤولية الموكلة إليه:</label>
                  <select
                    value={selectedResponsibility}
                    onChange={(e) => setSelectedResponsibility(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  >
                    <option value="main_presenter">المقدم الرئيسي (Main Presenter)</option>
                    <option value="assistant">مساعد (Assistant)</option>
                    <option value="lesson_preparer">إعداد الدرس (Lesson Preparer)</option>
                    <option value="presenter">شرح وتقديم الدرس (Presenter)</option>
                    <option value="organizer">منظم النشاط (Organizer)</option>
                    <option value="tech_support">دعم فني ووسائل إيضاح (Tech Support)</option>
                    <option value="participant">مشارك في الفقرة (Participant)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">حالة التكليف / المشاركة المبدئية:</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  >
                    <option value="assigned">مكلف بالفقرة (Assigned)</option>
                    <option value="participated">شارك بالفعل (Participated)</option>
                    <option value="unconfirmed">قيد التأكيد (Unconfirmed)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE3E4]">
                  <button
                    type="button"
                    onClick={() => setAssigningActivity(null)}
                    className="px-4 py-2 rounded-xl border border-[#EAE3E4] text-[#81777A] font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-[#702C3B] text-white font-bold hover:bg-[#5A232F]"
                  >
                    {submitting ? 'جارٍ التكليف...' : 'تأكيد التكليف'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

