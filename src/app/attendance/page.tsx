'use client';

// ====================================================================
// ORGANA — Fast Friday Attendance & Spiritual Follow-up Module (/attendance)
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { Meeting, AttendanceStatus } from '@/types/organa';
import {
  CalendarCheck,
  Users,
  UserCheck,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Save,
  Check,
  Calendar,
  ChevronDown,
  User,
  CheckCheck,
  Heart,
  Church,
  BookOpen,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

function AttendanceContent() {
  const searchParams = useSearchParams();
  const meetingParamId = searchParams.get('meetingId');
  const { currentRole, assignedFamilyId } = useAuth();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'members' | 'servants'>('members');
  const [search, setSearch] = useState('');

  // Attendance Records
  const [membersAttendance, setMembersAttendance] = useState<any[]>([]);
  const [servantsAttendance, setServantsAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load Meetings
  useEffect(() => {
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}&familyId=${assignedFamilyId}` 
      : '';
    fetch(`/api/meetings?role=${currentRole}${famParam}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.meetings.length > 0) {
          // Sort by date descending (nearest/upcoming first)
          const sorted = [...res.meetings].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setMeetings(sorted);
          const initialMeetingId = meetingParamId && sorted.some((m: any) => m.id === meetingParamId)
            ? meetingParamId
            : sorted[0].id;
          setSelectedMeetingId(initialMeetingId);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentRole, meetingParamId, assignedFamilyId]);

  // Load Attendance for selected meeting
  const loadAttendance = (mId: string) => {
    if (!mId) return;
    setLoading(true);
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId 
      ? `?role=${currentRole}&userFamilyId=${assignedFamilyId}` 
      : '';
    fetch(`/api/meetings/${mId}/attendance${famParam}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setMembersAttendance(res.members || []);
          setServantsAttendance(res.servants || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedMeetingId) {
      loadAttendance(selectedMeetingId);
    }
  }, [selectedMeetingId]);

  // Member Status Change
  const handleMemberStatusChange = (memberId: string, newStatus: AttendanceStatus) => {
    setMembersAttendance(prev =>
      prev.map(m => (m.member_id === memberId ? { 
        ...m, 
        status: newStatus,
        attended_class: newStatus === 'present' ? 1 : (newStatus === 'absent' ? 0 : m.attended_class)
      } : m))
    );
  };

  // Member Spiritual Checkbox Toggle (قداس - تناول - فصل - اعتراف)
  const handleMemberCheckboxToggle = (memberId: string, field: 'attended_liturgy' | 'attended_communion' | 'attended_class' | 'attended_confession') => {
    setMembersAttendance(prev =>
      prev.map(m => {
        if (m.member_id !== memberId) return m;
        const currentVal = m[field] ? 1 : 0;
        const newVal = currentVal ? 0 : 1;
        
        let newStatus = m.status;
        if (field === 'attended_class') {
          newStatus = newVal ? 'present' : (m.status === 'present' ? 'absent' : m.status);
        }

        return {
          ...m,
          [field]: newVal,
          status: newStatus,
        };
      })
    );
  };

  // Servant Status Change
  const handleServantStatusChange = (servantId: string, newStatus: AttendanceStatus) => {
    setServantsAttendance(prev =>
      prev.map(s => (s.servant_id === servantId ? { ...s, status: newStatus } : s))
    );
  };

  // Servant Role Checkbox Toggle (شرح افتتاحية - ورش عمل - تحضير - شرح الدرس)
  const handleServantCheckboxToggle = (servantId: string, field: 'did_opening' | 'did_workshop' | 'did_preparation' | 'did_lesson') => {
    setServantsAttendance(prev =>
      prev.map(s => {
        if (s.servant_id !== servantId) return s;
        const currentVal = s[field] ? 1 : 0;
        const newVal = currentVal ? 0 : 1;
        return {
          ...s,
          [field]: newVal,
          status: newVal && s.status === 'not_recorded' ? 'present' : s.status,
        };
      })
    );
  };

  // Bulk Mark All Present
  const handleBulkMarkPresent = () => {
    if (activeTab === 'members') {
      setMembersAttendance(prev => prev.map(m => ({ 
        ...m, 
        status: 'present',
        attended_class: 1
      })));
    } else {
      setServantsAttendance(prev => prev.map(s => ({ ...s, status: 'present' })));
    }
  };

  // Save All Changes
  const handleSaveAll = async () => {
    if (!selectedMeetingId) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Save members
      await fetch(`/api/meetings/${selectedMeetingId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bulk_members',
          records: membersAttendance.map(m => ({
            memberId: m.member_id,
            status: m.status,
            attended_liturgy: m.attended_liturgy ? 1 : 0,
            attended_communion: m.attended_communion ? 1 : 0,
            attended_class: m.attended_class ? 1 : 0,
            attended_confession: m.attended_confession ? 1 : 0,
            excuseReason: m.excuse_reason || null,
          })),
          actorRole: currentRole,
        }),
      });

      // 2. Save servants
      await fetch(`/api/meetings/${selectedMeetingId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bulk_servants',
          records: servantsAttendance.map(s => ({
            servantId: s.servant_id,
            status: s.status,
            did_opening: s.did_opening ? 1 : 0,
            did_workshop: s.did_workshop ? 1 : 0,
            did_preparation: s.did_preparation ? 1 : 0,
            did_lesson: s.did_lesson ? 1 : 0,
            excuseReason: s.excuse_reason || null,
          })),
          actorRole: currentRole,
        }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadAttendance(selectedMeetingId);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Stats calculation
  const totalMembers = membersAttendance.length;
  const presentMembers = membersAttendance.filter(m => m.status === 'present').length;
  const absentMembers = membersAttendance.filter(m => m.status === 'absent').length;
  const excusedMembers = membersAttendance.filter(m => m.status === 'excused').length;
  const memberRate = totalMembers > 0 ? Math.round((presentMembers / totalMembers) * 100) : 0;

  const totalServants = servantsAttendance.length;
  const presentServants = servantsAttendance.filter(s => s.status === 'present').length;
  const absentServants = servantsAttendance.filter(s => s.status === 'absent').length;
  const excusedServants = servantsAttendance.filter(s => s.status === 'excused').length;

  const filteredMembers = membersAttendance.filter(m =>
    !search || m.member_name?.includes(search) || m.code?.includes(search)
  );

  const filteredServants = servantsAttendance.filter(s =>
    !search || s.servant_name?.includes(search) || s.phone?.includes(search)
  );

  const currentMeetingObj = meetings.find(m => m.id === selectedMeetingId);

  const formattedMeetingDate = currentMeetingObj
    ? new Date(currentMeetingObj.date).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <AppLayout>
      <div className="space-y-4 max-w-xl mx-auto pb-28">
        {/* Top Title & Live Badge */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
            <h1 className="text-lg md:text-xl font-bold text-[#282326]">
              تسجيل حضور اللقاء الأسبوعي
            </h1>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FCE7F3] text-[#9D174D]">
            مدارس الأحد
          </span>
        </div>

        {/* Meeting Dropdown Selector Card */}
        <div className="bg-white rounded-2xl border border-[#EAE3E4] p-3 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-[#81777A]">
            <span className="font-bold flex items-center gap-1.5 text-[#421923]">
              <Calendar className="w-4 h-4 text-[#702C3B]" />
              اختر موعد الجمعة والأسرة:
            </span>
            <span className="text-[11px] font-mono text-[#702C3B]">
              {formattedMeetingDate}
            </span>
          </div>

          <div className="relative">
            <select
              value={selectedMeetingId}
              onChange={(e) => setSelectedMeetingId(e.target.value)}
              className="w-full p-2.5 pr-3 pl-8 text-xs font-bold rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-[#421923] focus:outline-none focus:border-[#702C3B] cursor-pointer"
            >
              {meetings.map((m) => {
                const dateStr = new Date(m.date).toLocaleDateString('ar-EG', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });
                return (
                  <option key={m.id} value={m.id}>
                    {dateStr} — {m.family_name}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* 4 Stats Pill Cards Row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white p-2.5 rounded-2xl border border-[#EAE3E4] text-center shadow-xs">
            <span className="text-[10px] text-[#81777A] block">إجمالي</span>
            <span className="text-lg font-bold text-[#282326] block leading-tight my-0.5">
              {activeTab === 'members' ? totalMembers : totalServants}
            </span>
            <span className="text-[9px] text-[#81777A] block">
              {activeTab === 'members' ? 'مخدوم' : 'خادم'}
            </span>
          </div>

          <div className="bg-[#F0FDF4] p-2.5 rounded-2xl border border-[#BBF7D0] text-center shadow-xs">
            <span className="text-[10px] text-[#166534] block">الحاضرون</span>
            <span className="text-lg font-bold text-[#166534] block leading-tight my-0.5">
              {activeTab === 'members' ? presentMembers : presentServants}
            </span>
            <span className="text-[9px] font-bold text-[#166534] block">
              ({activeTab === 'members' ? memberRate : (totalServants > 0 ? Math.round((presentServants / totalServants) * 100) : 0)}%)
            </span>
          </div>

          <div className="bg-[#FFF1F2] p-2.5 rounded-2xl border border-[#FECDD3] text-center shadow-xs">
            <span className="text-[10px] text-[#991B1B] block">الغائبون</span>
            <span className="text-lg font-bold text-[#991B1B] block leading-tight my-0.5">
              {activeTab === 'members' ? absentMembers : absentServants}
            </span>
            <span className="text-[9px] font-bold text-[#991B1B] block">
              افتقاد
            </span>
          </div>

          <div className="bg-[#FFFBEB] p-2.5 rounded-2xl border border-[#FDE68A] text-center shadow-xs">
            <span className="text-[10px] text-[#92400E] block">المعتذرون</span>
            <span className="text-lg font-bold text-[#92400E] block leading-tight my-0.5">
              {activeTab === 'members' ? excusedMembers : excusedServants}
            </span>
            <span className="text-[9px] font-bold text-[#92400E] block">
              بعذر
            </span>
          </div>
        </div>

        {/* Segmented Switch (حضور المخدومين vs مشاركات الخدام) */}
        <div className="bg-[#EAE3E4]/60 p-1 rounded-2xl flex items-center gap-1">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'members'
                ? 'bg-[#702C3B] text-white shadow-xs'
                : 'text-[#421923] hover:text-[#702C3B]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>حضور المخدومين والمتابعة الروحية ({totalMembers})</span>
          </button>

          <button
            onClick={() => setActiveTab('servants')}
            className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'servants'
                ? 'bg-[#702C3B] text-white shadow-xs'
                : 'text-[#421923] hover:text-[#702C3B]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>مشاركات الخدام والفقرات ({totalServants})</span>
          </button>
        </div>

        {/* Search & Bulk Mark Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#81777A] absolute right-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="w-full pr-10 pl-3 py-2.5 text-xs rounded-2xl border border-[#EAE3E4] bg-white focus:outline-none focus:border-[#702C3B] shadow-2xs"
            />
          </div>

          <button
            onClick={handleBulkMarkPresent}
            className="px-3.5 py-2.5 rounded-2xl border border-emerald-300 bg-[#ECFDF5] text-[#047857] hover:bg-emerald-100 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <CheckCheck className="w-4 h-4" />
            <span>تعليم الكل "حاضر"</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* LIST 1: SERVED MEMBERS LIST WITH 4 SPIRITUAL CHECKBOXES         */}
        {/* ============================================================== */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-3xl border border-[#EAE3E4] text-xs text-[#81777A] p-4">
                لا يوجد مخدومين مسجلين في هذه الأسرة حالياً. يمكنك إضافة مخدومين من صفحة «المخدومون».
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isPresent = m.status === 'present';
                const isAbsent = m.status === 'absent';
                const isExcused = m.status === 'excused';

                return (
                  <div
                    key={m.member_id}
                    className="bg-white rounded-3xl border border-[#EAE3E4] p-4 shadow-2xs space-y-3 hover:border-[#702C3B]/40 transition-all"
                  >
                    {/* Top Row: Code Pill + Name + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-mono font-bold border border-gray-200">
                            {m.code ? (m.code.includes('-') ? m.code.split('-')[1] : m.code) : '—'}
                          </span>
                          <h3 className="font-bold text-sm md:text-base text-[#282326]">
                            {m.member_name}
                          </h3>
                        </div>

                        {/* Confession Father & Servant */}
                        <div className="text-[11px] text-[#81777A] mt-1 flex items-center gap-2 flex-wrap">
                          <span>الخادم: <strong className="text-[#421923]">{m.assigned_servant_name || 'خادم الأسرة'}</strong></span>
                          <span>•</span>
                          <span>أب الاعتراف: <strong className="text-[#702C3B]">{m.confession_father || 'لم يُحدد'}</strong></span>
                        </div>
                      </div>

                      {/* Status Pill */}
                      {isPresent && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#166534] shrink-0">
                          ● حاضر
                        </span>
                      )}
                      {isAbsent && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#991B1B] shrink-0">
                          ● غائب
                        </span>
                      )}
                      {isExcused && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] shrink-0">
                          ● معتذر
                        </span>
                      )}
                    </div>

                    {/* 4 CHECKBOXES FOR SERVED MEMBER: (قداس - تناول - فصل - الاعتراف) */}
                    <div className="p-2.5 rounded-2xl bg-[#FAF5F6] border border-[#EAE3E4] space-y-1.5">
                      <div className="text-[10px] font-bold text-[#81777A] flex items-center justify-between">
                        <span>المتابعة الروحية وحضور الجمعة:</span>
                        {Boolean(m.attended_confession) && (
                          <span className="text-[10px] font-bold text-emerald-700">معترف هذا الأسبوع ✓</span>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                        {/* 1. قداس */}
                        <button
                          type="button"
                          onClick={() => handleMemberCheckboxToggle(m.member_id, 'attended_liturgy')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            m.attended_liturgy
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-emerald-50'
                          }`}
                        >
                          <Church className="w-4 h-4" />
                          <span className="text-[11px]">قداس</span>
                          <span className="text-[9px]">{m.attended_liturgy ? '✓ نعم' : 'لم يحضر'}</span>
                        </button>

                        {/* 2. تناول */}
                        <button
                          type="button"
                          onClick={() => handleMemberCheckboxToggle(m.member_id, 'attended_communion')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            m.attended_communion
                              ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-purple-50'
                          }`}
                        >
                          <Heart className="w-4 h-4" />
                          <span className="text-[11px]">تناول</span>
                          <span className="text-[9px]">{m.attended_communion ? '✓ نعم' : 'لم يتناول'}</span>
                        </button>

                        {/* 3. فصل (مدارس الأحد) */}
                        <button
                          type="button"
                          onClick={() => handleMemberCheckboxToggle(m.member_id, 'attended_class')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            m.attended_class
                              ? 'bg-[#702C3B] text-white border-[#5A1E2D] shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-rose-50'
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                          <span className="text-[11px]">فصل</span>
                          <span className="text-[9px]">{m.attended_class ? '✓ حاضر' : 'غائب'}</span>
                        </button>

                        {/* 4. الاعتراف */}
                        <button
                          type="button"
                          onClick={() => handleMemberCheckboxToggle(m.member_id, 'attended_confession')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            m.attended_confession
                              ? 'bg-sky-700 text-white border-sky-800 shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-sky-50'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span className="text-[11px]">الاعتراف</span>
                          <span className="text-[9px]">{m.attended_confession ? '✓ اعترف' : 'لم يعترف'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Attendance Selector (حاضر | غائب | معتذر) */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => handleMemberStatusChange(m.member_id, 'present')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isPresent
                            ? 'bg-[#15803D] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#81777A] border border-[#EAE3E4] hover:bg-emerald-50'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>حاضر</span>
                      </button>

                      <button
                        onClick={() => handleMemberStatusChange(m.member_id, 'absent')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isAbsent
                            ? 'bg-[#B91C1C] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#81777A] border border-[#EAE3E4] hover:bg-rose-50'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>غائب</span>
                      </button>

                      <button
                        onClick={() => handleMemberStatusChange(m.member_id, 'excused')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isExcused
                            ? 'bg-[#854D0E] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#81777A] border border-[#EAE3E4] hover:bg-amber-50'
                        }`}
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>معتذر</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* LIST 2: SERVANTS LIST WITH 4 ROLE CHECKBOXES                   */}
        {/* ============================================================== */}
        {activeTab === 'servants' && (
          <div className="space-y-3">
            {filteredServants.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-3xl border border-[#EAE3E4] text-xs text-[#81777A] p-4">
                لا يوجد خدام مسجلين في هذه الأسرة حالياً. يمكنك تسكين الخدام من صفحة «الخدام».
              </div>
            ) : (
              filteredServants.map((s) => {
                const isPresent = s.status === 'present';
                const isAbsent = s.status === 'absent';
                const isExcused = s.status === 'excused';

                return (
                  <div
                    key={s.servant_id}
                    className="bg-white rounded-3xl border border-[#EAE3E4] p-4 shadow-2xs space-y-3 hover:border-[#702C3B]/40 transition-all"
                  >
                    {/* Servant Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm md:text-base text-[#282326]">
                          {s.servant_name}
                        </h3>
                        <div className="text-[11px] text-[#81777A] mt-0.5 flex items-center gap-2">
                          <span>هاتف: {s.phone || '—'}</span>
                          <span>•</span>
                          <span>أب الاعتراف: <strong className="text-[#702C3B]">{s.confession_father || 'لم يُحدد'}</strong></span>
                        </div>
                      </div>

                      {/* Status */}
                      {isPresent && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#166534]">
                          ● حاضر
                        </span>
                      )}
                      {isAbsent && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#991B1B]">
                          ● غائب
                        </span>
                      )}
                      {isExcused && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E]">
                          ● معتذر
                        </span>
                      )}
                    </div>

                    {/* 4 CHECKBOXES FOR SERVANT: (شرح افتتاحية - ورش عمل - تحضير - شرح الدرس) */}
                    <div className="p-2.5 rounded-2xl bg-[#FAF5F6] border border-[#EAE3E4] space-y-1.5">
                      <span className="text-[10px] font-bold text-[#81777A] block">
                        مهام ومشاركات الخادم في لقاء الجمعة (يملأها أمين الأسرة):
                      </span>

                      <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                        {/* 1. شرح افتتاحية */}
                        <button
                          type="button"
                          onClick={() => handleServantCheckboxToggle(s.servant_id, 'did_opening')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            s.did_opening
                              ? 'bg-[#702C3B] text-white border-[#5A1E2D] shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-rose-50'
                          }`}
                        >
                          <span className="text-[11px]">شرح افتتاحية</span>
                          <span className="text-[9px]">{s.did_opening ? '✓ تم' : '—'}</span>
                        </button>

                        {/* 2. ورش عمل */}
                        <button
                          type="button"
                          onClick={() => handleServantCheckboxToggle(s.servant_id, 'did_workshop')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            s.did_workshop
                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-amber-50'
                          }`}
                        >
                          <span className="text-[11px]">ورش عمل</span>
                          <span className="text-[9px]">{s.did_workshop ? '✓ تم' : '—'}</span>
                        </button>

                        {/* 3. تحضير */}
                        <button
                          type="button"
                          onClick={() => handleServantCheckboxToggle(s.servant_id, 'did_preparation')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            s.did_preparation
                              ? 'bg-sky-700 text-white border-sky-800 shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-sky-50'
                          }`}
                        >
                          <span className="text-[11px]">تحضير</span>
                          <span className="text-[9px]">{s.did_preparation ? '✓ تم' : '—'}</span>
                        </button>

                        {/* 4. شرح الدرس */}
                        <button
                          type="button"
                          onClick={() => handleServantCheckboxToggle(s.servant_id, 'did_lesson')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            s.did_lesson
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-emerald-50'
                          }`}
                        >
                          <span className="text-[11px]">شرح الدرس</span>
                          <span className="text-[9px]">{s.did_lesson ? '✓ تم' : '—'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Servant Attendance Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => handleServantStatusChange(s.servant_id, 'present')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isPresent
                            ? 'bg-[#15803D] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#81777A] border border-[#EAE3E4] hover:bg-emerald-50'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>حاضر</span>
                      </button>

                      <button
                        onClick={() => handleServantStatusChange(s.servant_id, 'absent')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isAbsent
                            ? 'bg-[#B91C1C] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#81777A] border border-[#EAE3E4] hover:bg-rose-50'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>غائب</span>
                      </button>

                      <button
                        onClick={() => handleServantStatusChange(s.servant_id, 'excused')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isExcused
                            ? 'bg-[#854D0E] text-white shadow-xs'
                            : 'bg-[#F8F9FA] text-[#81777A] border border-[#EAE3E4] hover:bg-amber-50'
                        }`}
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>معتذر</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Floating Bottom Save Action Bar */}
        <div className="fixed bottom-16 left-0 right-0 p-3 bg-white/90 backdrop-blur-md border-t border-[#EAE3E4] z-20 shadow-lg">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-[#81777A]">
              {saveSuccess ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  تم حفظ سجل الجمعة بنجاح!
                </span>
              ) : (
                <span>تأكد من حفظ التعديلات بعد تسجيل الملاحظات</span>
              )}
            </div>

            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl bg-[#702C3B] hover:bg-[#5A232F] text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جارٍ الحفظ...' : 'حفظ سجل اللقاء والأنشطة'}</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AttendancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F4F3] flex items-center justify-center">
        <div className="text-center font-bold text-[#702C3B]">جارٍ تحميل سجل اللقاء...</div>
      </div>
    }>
      <AttendanceContent />
    </Suspense>
  );
}
