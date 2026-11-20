'use client';

// ====================================================================
// ORGANA — Fast Friday Attendance & Spiritual Follow-up Module (/attendance)
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// Enhanced for Phase 2.4: Fast Mobile Roll-call & Offline Resilience
// ====================================================================

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { Meeting, AttendanceStatus, Family } from '@/types/organa';
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
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  Wifi,
  WifiOff,
  CloudUpload,
  RotateCcw,
  Clock,
  Filter
} from 'lucide-react';
import { getStagesForFamily, getStageBadgeStyle } from '@/lib/constants/stages';

function getClosestFriday(base: Date = new Date()): string {
  const d = new Date(base);
  const day = d.getDay(); // 0 = Sun, ... 5 = Fri, 6 = Sat
  const diff = day >= 5 ? day - 5 : day + 2;
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

function stepFriday(currentDateStr: string, direction: -1 | 1): string {
  if (!currentDateStr) return getClosestFriday();
  const [y, m, d] = currentDateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() + direction * 7);
  const newY = dateObj.getFullYear();
  const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
  const newD = String(dateObj.getDate()).padStart(2, '0');
  return `${newY}-${newM}-${newD}`;
}

const COMMON_EXCUSES = [
  { label: 'مرض 🤒', value: 'مرض' },
  { label: 'سفر 🚗', value: 'سفر' },
  { label: 'امتحانات 📚', value: 'امتحانات' },
  { label: 'ظرف عائلي 🏠', value: 'ظرف عائلي' },
  { label: 'أخرى 💬', value: '' },
];

function AttendanceContent() {
  const searchParams = useSearchParams();
  const meetingParamId = searchParams.get('meetingId');
  const { currentRole, currentUser, assignedFamilyId, canManageAllFamilies } = useAuth();

  const [families, setFamilies] = useState<Family[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoaded, setMeetingsLoaded] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>(assignedFamilyId || 'fam-prep-boys');
  const [selectedDate, setSelectedDate] = useState<string>(getClosestFriday());
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');

  // Calendar Modal State
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  const [activeTab, setActiveTab] = useState<'members' | 'servants'>('members');
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unrecorded' | 'present' | 'absent' | 'excused'>('all');

  // Attendance Records
  const [membersAttendance, setMembersAttendance] = useState<any[]>([]);
  const [servantsAttendance, setServantsAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Network & Offline Resilience
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [syncBannerMessage, setSyncBannerMessage] = useState<string>('');
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const pendingDraftRef = useRef<any>(null);

  // Quick Excuse Modal State
  const [excuseModalData, setExcuseModalData] = useState<{
    memberId: string;
    memberName: string;
    currentReason: string;
  } | null>(null);
  const [customExcuse, setCustomExcuse] = useState('');

  const getDraftKey = (mId: string) => `organa_att_draft_${mId}`;
  const OFFLINE_QUEUE_KEY = 'organa_att_offline_queue';

  // Monitor network status
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const checkQueue = () => {
      try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        if (raw) {
          const q = JSON.parse(raw);
          setOfflineQueueCount(Array.isArray(q) ? q.length : 0);
        } else {
          setOfflineQueueCount(0);
        }
      } catch (e) {
        setOfflineQueueCount(0);
      }
    };

    checkQueue();

    const handleOnline = () => {
      setIsOnline(true);
      setSyncBannerMessage('تم استعادة الاتصال بالإنترنت! جارٍ المزامنة السحابية... 🟢');
      flushOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncBannerMessage('أنت الآن غير متصل بالإنترنت. وضع الحفظ المحلي في ذاكرة الهاتف مفعل 🟡');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Flush Offline Queue on Reconnect
  const flushOfflineQueue = async () => {
    try {
      const rawQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!rawQueue) return;
      const queue = JSON.parse(rawQueue);
      if (!Array.isArray(queue) || queue.length === 0) return;

      for (const item of queue) {
        await fetch(`/api/meetings/${item.meetingId}/attendance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser?.id || '',
            'x-user-role': currentRole || 'priest',
            'x-user-family-id': assignedFamilyId || selectedFamilyId || '',
          },
          body: JSON.stringify(item.payload),
        });
        localStorage.removeItem(getDraftKey(item.meetingId));
      }

      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      setOfflineQueueCount(0);
      setSyncBannerMessage('تمت مزامنة كافة كشوف الحضور المحفوظة محلياً بنجاح! ☁️');
      setTimeout(() => setSyncBannerMessage(''), 4000);
      if (selectedMeetingId) loadAttendance(selectedMeetingId);
    } catch (err) {
      console.warn('Offline queue flush attempt postponed:', err);
    }
  };

  // 1. Load Families
  useEffect(() => {
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId 
      ? `?role=${currentRole}&userFamilyId=${assignedFamilyId}&familyId=${assignedFamilyId}` 
      : `?role=${currentRole || 'priest'}`;
    fetch(`/api/families${famParam}`, {
      headers: {
        'x-user-id': currentUser?.id || '',
        'x-user-role': currentRole || 'priest',
        'x-user-family-id': assignedFamilyId || '',
      },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.families.length > 0) {
          setFamilies(res.families);
          if (assignedFamilyId) {
            setSelectedFamilyId(assignedFamilyId);
          } else if (!selectedFamilyId) {
            setSelectedFamilyId(res.families[0].id);
          }
        }
      })
      .catch(console.error);
  }, [assignedFamilyId, currentRole, currentUser]);

  // 2. Load Meetings
  useEffect(() => {
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}&familyId=${assignedFamilyId}` 
      : '';
    fetch(`/api/meetings?role=${currentRole || 'priest'}${famParam}`, {
      headers: {
        'x-user-id': currentUser?.id || '',
        'x-user-role': currentRole || 'priest',
        'x-user-family-id': assignedFamilyId || selectedFamilyId || '',
      },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.meetings) {
          const sorted = [...res.meetings].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setMeetings(sorted);

          if (meetingParamId) {
            const foundParam = sorted.find((m: any) => m.id === meetingParamId);
            if (foundParam) {
              setSelectedFamilyId(foundParam.family_id);
              setSelectedDate(foundParam.date);
              setSelectedMeetingId(foundParam.id);
            }
          }
        }
        setMeetingsLoaded(true);
        setLoading(false);
      })
      .catch(() => {
        setMeetingsLoaded(true);
        setLoading(false);
      });
  }, [currentRole, meetingParamId, assignedFamilyId]);

  // 3. Resolve Meeting when selectedFamilyId or selectedDate changes
  useEffect(() => {
    if (!meetingsLoaded || !selectedFamilyId || !selectedDate) return;
    const match = meetings.find(m => m.family_id === selectedFamilyId && String(m.date).split('T')[0] === selectedDate);
    if (match) {
      setSelectedMeetingId(match.id);
    } else {
      fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
          'x-user-role': currentRole || 'priest',
          'x-user-family-id': assignedFamilyId || selectedFamilyId || '',
        },
        body: JSON.stringify({
          family_id: selectedFamilyId,
          date: selectedDate,
          title: `لقاء الجمعة (${selectedDate})`,
          actorRole: currentRole || 'priest',
        }),
      })
        .then(r => r.json())
        .then(res => {
          if (res.success && res.meeting) {
            setMeetings(prev => [res.meeting, ...prev]);
            setSelectedMeetingId(res.meeting.id);
          }
        })
        .catch(console.error);
    }
  }, [meetingsLoaded, selectedFamilyId, selectedDate, meetings, currentRole, currentUser, assignedFamilyId]);

  // Load Attendance for selected meeting
  const loadAttendance = (mId: string) => {
    if (!mId) return;
    setLoading(true);
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}` 
      : '';
    fetch(`/api/meetings/${mId}/attendance?role=${currentRole || 'priest'}${famParam}`, {
      headers: {
        'x-user-id': currentUser?.id || '',
        'x-user-role': currentRole || 'priest',
        'x-user-family-id': assignedFamilyId || selectedFamilyId || '',
      },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setMembersAttendance(res.members || []);
          setServantsAttendance(res.servants || []);
          setHasUnsavedChanges(false);

          // Check for existing local draft
          try {
            const rawDraft = localStorage.getItem(getDraftKey(mId));
            if (rawDraft) {
              const draft = JSON.parse(rawDraft);
              if (draft && draft.timestamp && (Date.now() - draft.timestamp < 48 * 3600 * 1000)) {
                pendingDraftRef.current = draft;
                setHasPendingDraft(true);
              }
            }
          } catch (e) {}
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

  // Auto-save draft to local storage on changes
  useEffect(() => {
    if (!selectedMeetingId || membersAttendance.length === 0) return;
    if (hasUnsavedChanges) {
      try {
        localStorage.setItem(getDraftKey(selectedMeetingId), JSON.stringify({
          timestamp: Date.now(),
          members: membersAttendance,
          servants: servantsAttendance,
        }));
      } catch (e) {}
    }
  }, [membersAttendance, servantsAttendance, hasUnsavedChanges, selectedMeetingId]);

  // Restore Draft
  const handleRestoreDraft = () => {
    if (!pendingDraftRef.current) return;
    if (pendingDraftRef.current.members) setMembersAttendance(pendingDraftRef.current.members);
    if (pendingDraftRef.current.servants) setServantsAttendance(pendingDraftRef.current.servants);
    setHasPendingDraft(false);
    setHasUnsavedChanges(true);
    setSyncBannerMessage('تمت استعادة المسودة المحلية بنجاح! لا تنسَ الحفظ السحابي ✓');
    setTimeout(() => setSyncBannerMessage(''), 4000);
  };

  const handleDiscardDraft = () => {
    if (selectedMeetingId) localStorage.removeItem(getDraftKey(selectedMeetingId));
    setHasPendingDraft(false);
    pendingDraftRef.current = null;
  };

  // Member Status Change with Undo / Toggle
  const handleMemberStatusChange = (memberId: string, targetStatus: AttendanceStatus) => {
    setHasUnsavedChanges(true);
    setMembersAttendance(prev =>
      prev.map(m => {
        if (m.member_id !== memberId) return m;
        // If clicking the currently active status, toggle back to 'not_recorded'
        const newStatus = m.status === targetStatus ? 'not_recorded' : targetStatus;
        return {
          ...m,
          status: newStatus,
          attended_class: newStatus === 'present' ? 1 : (newStatus === 'absent' ? 0 : m.attended_class),
        };
      })
    );

    // If marked excused, trigger excuse prompt
    if (targetStatus === 'excused') {
      const targetMember = membersAttendance.find(m => m.member_id === memberId);
      setExcuseModalData({
        memberId,
        memberName: targetMember?.member_name || '',
        currentReason: targetMember?.excuse_reason || '',
      });
      setCustomExcuse(targetMember?.excuse_reason || '');
    }
  };

  // Set Excuse Reason
  const handleSetExcuseReason = (reason: string) => {
    if (!excuseModalData) return;
    setHasUnsavedChanges(true);
    setMembersAttendance(prev =>
      prev.map(m => (m.member_id === excuseModalData.memberId ? {
        ...m,
        status: 'excused',
        excuse_reason: reason
      } : m))
    );
    setExcuseModalData(null);
    setCustomExcuse('');
  };

  // Member Spiritual Checkbox Toggle
  const handleMemberCheckboxToggle = (memberId: string, field: 'attended_liturgy' | 'attended_communion' | 'attended_class' | 'attended_confession') => {
    setHasUnsavedChanges(true);
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
  const handleServantStatusChange = (servantId: string, targetStatus: AttendanceStatus) => {
    setHasUnsavedChanges(true);
    setServantsAttendance(prev =>
      prev.map(s => {
        if (s.servant_id !== servantId) return s;
        const newStatus = s.status === targetStatus ? 'not_recorded' : targetStatus;
        return { ...s, status: newStatus };
      })
    );
  };

  // Servant Role Checkbox Toggle
  const handleServantCheckboxToggle = (servantId: string, field: 'attended_liturgy' | 'did_opening' | 'did_workshop' | 'did_preparation' | 'did_lesson') => {
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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

  // Reset / Clear All to Not Recorded
  const handleResetAll = () => {
    setHasUnsavedChanges(true);
    if (activeTab === 'members') {
      setMembersAttendance(prev => prev.map(m => ({ 
        ...m, 
        status: 'not_recorded',
        attended_class: 0
      })));
    } else {
      setServantsAttendance(prev => prev.map(s => ({ ...s, status: 'not_recorded' })));
    }
  };

  // Save All Changes (Online & Offline Support)
  const handleSaveAll = async () => {
    if (!selectedMeetingId) return;
    setSaving(true);
    setSaveSuccess(false);

    const membersPayload = {
      type: 'bulk_members',
      records: membersAttendance.map(m => ({
        memberId: m.member_id,
        status: m.status || 'not_recorded',
        attended_liturgy: m.attended_liturgy ? 1 : 0,
        attended_communion: m.attended_communion ? 1 : 0,
        attended_class: m.attended_class ? 1 : 0,
        attended_confession: m.attended_confession ? 1 : 0,
        excuseReason: m.excuse_reason || null,
      })),
      actorRole: currentRole,
    };

    const servantsPayload = {
      type: 'bulk_servants',
      records: servantsAttendance.map(s => ({
        servantId: s.servant_id,
        status: s.status || 'not_recorded',
        attended_liturgy: s.attended_liturgy ? 1 : 0,
        did_opening: s.did_opening ? 1 : 0,
        did_workshop: s.did_workshop ? 1 : 0,
        did_preparation: s.did_preparation ? 1 : 0,
        did_lesson: s.did_lesson ? 1 : 0,
        excuseReason: s.excuse_reason || null,
      })),
      actorRole: currentRole,
    };

    // If offline, save directly to offline queue
    if (!navigator.onLine) {
      try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]';
        const queue = JSON.parse(raw);
        queue.push({ meetingId: selectedMeetingId, timestamp: Date.now(), payload: membersPayload });
        queue.push({ meetingId: selectedMeetingId, timestamp: Date.now(), payload: servantsPayload });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        setOfflineQueueCount(queue.length);
        setHasUnsavedChanges(false);
        setSaveSuccess(true);
        setSyncBannerMessage('تم حفظ الكشف في ذاكرة الهاتف مؤقتاً لعدم توفر الإنترنت! ستتم المزامنة تلقائياً بمجرد عودة الاتصال 💾');
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        console.error('Offline save failed:', err);
      } finally {
        setSaving(false);
      }
      return;
    }

    // If online, perform network save
    try {
      const authHeaders = {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || '',
        'x-user-role': currentRole || 'priest',
        'x-user-family-id': assignedFamilyId || selectedFamilyId || '',
      };

      await fetch(`/api/meetings/${selectedMeetingId}/attendance`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(membersPayload),
      });

      await fetch(`/api/meetings/${selectedMeetingId}/attendance`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(servantsPayload),
      });

      // Clear draft after successful remote commit
      localStorage.removeItem(getDraftKey(selectedMeetingId));
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadAttendance(selectedMeetingId);
    } catch (err) {
      console.warn('Network save failed, falling back to offline queue:', err);
      // Fallback save to offline queue
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]';
      const queue = JSON.parse(raw);
      queue.push({ meetingId: selectedMeetingId, timestamp: Date.now(), payload: membersPayload });
      queue.push({ meetingId: selectedMeetingId, timestamp: Date.now(), payload: servantsPayload });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      setOfflineQueueCount(queue.length);
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setSyncBannerMessage('تعذر الوصول للسحابة – تم تأمين الكشف في ذاكرة الهاتف مؤقتاً 💾');
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Stats calculation
  const totalMembers = membersAttendance.length;
  const presentMembers = membersAttendance.filter(m => m.status === 'present').length;
  const absentMembers = membersAttendance.filter(m => m.status === 'absent').length;
  const excusedMembers = membersAttendance.filter(m => m.status === 'excused').length;
  const unrecordedMembers = membersAttendance.filter(m => !m.status || m.status === 'not_recorded').length;
  const memberRate = totalMembers > 0 ? Math.round((presentMembers / totalMembers) * 100) : 0;

  const totalServants = servantsAttendance.length;
  const presentServants = servantsAttendance.filter(s => s.status === 'present').length;
  const absentServants = servantsAttendance.filter(s => s.status === 'absent').length;
  const excusedServants = servantsAttendance.filter(s => s.status === 'excused').length;
  const unrecordedServants = servantsAttendance.filter(s => !s.status || s.status === 'not_recorded').length;

  const selectedFamily = families.find(f => f.id === selectedFamilyId);
  const currentFamilyStages = selectedFamily?.stages || getStagesForFamily(selectedFamilyId, selectedFamily?.name);

  // Filtered members by search, stage, and recording status
  const filteredMembers = membersAttendance.filter(m => {
    const matchesSearch = !search || m.member_name?.includes(search) || m.code?.includes(search);
    const matchesStage = stageFilter === 'all' || m.stage === stageFilter;
    let matchesStatus = true;
    if (statusFilter === 'unrecorded') matchesStatus = !m.status || m.status === 'not_recorded';
    else if (statusFilter === 'present') matchesStatus = m.status === 'present';
    else if (statusFilter === 'absent') matchesStatus = m.status === 'absent';
    else if (statusFilter === 'excused') matchesStatus = m.status === 'excused';

    return matchesSearch && matchesStage && matchesStatus;
  });

  const filteredServants = servantsAttendance.filter(s => {
    const matchesSearch = !search || s.servant_name?.includes(search) || s.phone?.includes(search);
    let matchesStatus = true;
    if (statusFilter === 'unrecorded') matchesStatus = !s.status || s.status === 'not_recorded';
    else if (statusFilter === 'present') matchesStatus = s.status === 'present';
    else if (statusFilter === 'absent') matchesStatus = s.status === 'absent';
    else if (statusFilter === 'excused') matchesStatus = s.status === 'excused';
    return matchesSearch && matchesStatus;
  });

  const currentCalYear = calendarMonth.getFullYear();
  const currentCalMonth = calendarMonth.getMonth();
  const firstDayOfMonth = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const startOffset = (firstDayOfMonth + 1) % 7;
  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
  const monthNameArabic = calendarMonth.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

  const formattedDateArabic = (() => {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  })();

  return (
    <AppLayout>
      <div className="space-y-3.5 max-w-xl mx-auto pb-32 px-1 sm:px-0">
        
        {/* Network & Offline Status Banner */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-[#EAE3E4] px-3.5 py-2 shadow-2xs text-xs">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>متصل بالإنترنت</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>وضع عدم الاتصال (Offline)</span>
              </span>
            )}

            {offlineQueueCount > 0 && (
              <span className="flex items-center gap-1 font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[10px]">
                <CloudUpload className="w-3 h-3 text-rose-600" />
                <span>{offlineQueueCount} معلق للمزامنة</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {hasUnsavedChanges && (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-100/60 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                تعديلات غير محفوظة
              </span>
            )}
          </div>
        </div>

        {/* Sync / Notification Toast */}
        {syncBannerMessage && (
          <div className="bg-[#702C3B] text-white p-2.5 rounded-2xl text-xs font-bold shadow-md flex items-center justify-between animate-in fade-in">
            <span>{syncBannerMessage}</span>
            <button onClick={() => setSyncBannerMessage('')} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pending Local Draft Banner */}
        {hasPendingDraft && (
          <div className="bg-amber-50 border border-amber-300 p-3 rounded-2xl flex items-center justify-between gap-2 shadow-xs text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold text-amber-900 block">توجد مسودة حضور غير محفوظة على هذا الجهاز</span>
                <span className="text-[10px] text-amber-800">هل ترغب في استعادة آخر تعديلات قمت بها؟</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs"
              >
                استعادة ✓
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="px-2 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs"
              >
                تجاهل
              </button>
            </div>
          </div>
        )}

        {/* Top Title & Live Badge */}
        <div className="flex items-center justify-between pt-0.5">
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

        {/* DUAL SELECTOR BAR: 1) FAMILY BUTTON, 2) FRIDAY CALENDAR PICKER */}
        {canManageAllFamilies ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* 1. الأسرة الكنسية */}
            <div className="bg-white rounded-2xl border border-[#EAE3E4] p-2.5 shadow-xs flex items-center justify-between gap-2">
              <span className="font-bold flex items-center gap-1.5 text-xs text-[#421923] shrink-0">
                <Users className="w-4 h-4 text-[#702C3B]" />
                الأسرة:
              </span>
              <select
                value={selectedFamilyId}
                onChange={(e) => setSelectedFamilyId(e.target.value)}
                className="w-full max-w-[220px] p-1.5 pr-2 pl-6 text-xs font-bold rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-[#421923] focus:outline-none focus:border-[#702C3B] cursor-pointer"
              >
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. موعد لقاء الجمعة */}
            <div className="bg-white rounded-2xl border border-[#EAE3E4] p-2 shadow-xs flex items-center justify-between gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDate(prev => stepFriday(prev, -1))}
                className="p-1.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-[#421923] hover:bg-[#EAE3E4] transition-all"
                title="الجمعة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = selectedDate.split('-').map(Number);
                  setCalendarMonth(new Date(y, m - 1, d));
                  setShowCalendarModal(true);
                }}
                className="flex-1 py-1.5 px-3 rounded-xl bg-[#702C3B] hover:bg-[#5A232F] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs truncate"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{formattedDateArabic}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(prev => stepFriday(prev, 1))}
                className="p-1.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-[#421923] hover:bg-[#EAE3E4] transition-all"
                title="الجمعة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#EAE3E4] p-2.5 shadow-xs flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="px-3 py-1.5 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4] text-[#702C3B] text-xs font-extrabold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{families.find(f => f.id === selectedFamilyId)?.name || 'إعدادي بنين'}</span>
              </span>
            </div>

            <div className="flex items-center gap-1 mr-auto">
              <button
                type="button"
                onClick={() => setSelectedDate(prev => stepFriday(prev, -1))}
                className="p-1.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-[#421923] hover:bg-[#EAE3E4] transition-all"
                title="الجمعة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = selectedDate.split('-').map(Number);
                  setCalendarMonth(new Date(y, m - 1, d));
                  setShowCalendarModal(true);
                }}
                className="py-1.5 px-3 rounded-xl bg-[#702C3B] hover:bg-[#5A232F] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDateArabic}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(prev => stepFriday(prev, 1))}
                className="p-1.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-[#421923] hover:bg-[#EAE3E4] transition-all"
                title="الجمعة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* MODAL: FRIDAY CALENDAR PICKER */}
        {showCalendarModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#702C3B]/10 text-[#702C3B] flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#421923]">تقويم لقاءات الجمعة</h3>
                    <div className="text-[10px] text-[#81777A]">اختر تاريخ الجمعة لتسجيل حضور مدارس الأحد</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between bg-[#FAF5F6] p-2 rounded-2xl border border-[#EAE3E4]">
                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date(currentCalYear, currentCalMonth - 1, 1))}
                  className="p-1.5 rounded-xl hover:bg-white text-[#702C3B] font-bold text-xs flex items-center gap-1"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>الشهر السابق</span>
                </button>

                <span className="font-bold text-xs text-[#421923]">
                  {monthNameArabic}
                </span>

                <button
                  type="button"
                  onClick={() => setCalendarMonth(new Date(currentCalYear, currentCalMonth + 1, 1))}
                  className="p-1.5 rounded-xl hover:bg-white text-[#702C3B] font-bold text-xs flex items-center gap-1"
                >
                  <span>الشهر التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedDate(getClosestFriday());
                  setShowCalendarModal(false);
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>الذهاب لأقرب جمعة ({getClosestFriday()})</span>
              </button>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#81777A] border-b border-gray-100 pb-1.5">
                {['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'].map((dayName, idx) => (
                  <div
                    key={idx}
                    className={`py-1 rounded-lg ${idx === 6 ? 'text-[#702C3B] font-black bg-rose-50 border border-rose-100' : ''}`}
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {Array.from({ length: startOffset }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-9" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateObj = new Date(currentCalYear, currentCalMonth, dayNum);
                  const isFriday = dateObj.getDay() === 5;
                  const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setShowCalendarModal(false);
                      }}
                      className={`h-9 rounded-xl font-bold transition-all flex flex-col items-center justify-center text-xs relative ${
                        isSelected
                          ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300 font-black'
                          : isFriday
                            ? 'bg-[#702C3B] text-white hover:bg-[#5A232F] shadow-xs'
                            : 'bg-white hover:bg-gray-100 text-[#282326]'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {isFriday && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 mt-0.5" />
                      )}
                      {isSelected && (
                        <span className="text-[8px] leading-none">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#EAE3E4] flex items-center justify-between gap-2 text-xs">
                <span className="text-[10px] text-[#81777A]">أو اكتب تاريخاً يدوياً:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      setShowCalendarModal(false);
                    }
                  }}
                  className="p-1.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-xs font-bold text-[#421923] focus:outline-none focus:border-[#702C3B]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4 Interactive Stats Cards (Click to Filter) */}
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`p-2 rounded-2xl border text-center transition-all ${
              statusFilter === 'all'
                ? 'bg-[#702C3B]/5 border-[#702C3B] ring-2 ring-[#702C3B] shadow-sm'
                : 'bg-white border-[#EAE3E4] hover:bg-gray-50'
            }`}
          >
            <span className="text-[10px] text-[#81777A] block">إجمالي</span>
            <span className="text-lg font-bold text-[#282326] block leading-tight my-0.5">
              {activeTab === 'members' ? totalMembers : totalServants}
            </span>
            <span className="text-[9px] text-[#81777A] block">
              {activeTab === 'members' ? 'مخدوم' : 'خادم'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'present' ? 'all' : 'present')}
            className={`p-2 rounded-2xl border text-center transition-all ${
              statusFilter === 'present'
                ? 'bg-[#ECFDF5] border-[#10B981] ring-2 ring-[#10B981] shadow-sm'
                : 'bg-[#F0FDF4] border-[#BBF7D0] hover:bg-emerald-100/60'
            }`}
          >
            <span className="text-[10px] text-[#166534] block">الحاضرون</span>
            <span className="text-lg font-bold text-[#166534] block leading-tight my-0.5">
              {activeTab === 'members' ? presentMembers : presentServants}
            </span>
            <span className="text-[9px] font-bold text-[#166534] block">
              ({activeTab === 'members' ? memberRate : (totalServants > 0 ? Math.round((presentServants / totalServants) * 100) : 0)}%)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent')}
            className={`p-2 rounded-2xl border text-center transition-all ${
              statusFilter === 'absent'
                ? 'bg-[#FFE4E6] border-[#F43F5E] ring-2 ring-[#F43F5E] shadow-sm'
                : 'bg-[#FFF1F2] border-[#FECDD3] hover:bg-rose-100/60'
            }`}
          >
            <span className="text-[10px] text-[#991B1B] block">الغائبون</span>
            <span className="text-lg font-bold text-[#991B1B] block leading-tight my-0.5">
              {activeTab === 'members' ? absentMembers : absentServants}
            </span>
            <span className="text-[9px] font-bold text-[#991B1B] block">
              افتقاد
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'excused' ? 'all' : 'excused')}
            className={`p-2 rounded-2xl border text-center transition-all ${
              statusFilter === 'excused'
                ? 'bg-[#FEF3C7] border-[#F59E0B] ring-2 ring-[#F59E0B] shadow-sm'
                : 'bg-[#FFFBEB] border-[#FDE68A] hover:bg-amber-100/60'
            }`}
          >
            <span className="text-[10px] text-[#92400E] block">المعتذرون</span>
            <span className="text-lg font-bold text-[#92400E] block leading-tight my-0.5">
              {activeTab === 'members' ? excusedMembers : excusedServants}
            </span>
            <span className="text-[9px] font-bold text-[#92400E] block">
              بعذر
            </span>
          </button>
        </div>

        {/* Main Tab Switcher: المخدومين vs الخدام */}
        <div className="bg-[#EAE3E4]/60 p-1 rounded-2xl flex items-center gap-1">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'members'
                ? 'bg-[#702C3B] text-white shadow-xs'
                : 'text-[#421923] hover:text-[#702C3B]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>حضور المخدومين ({totalMembers})</span>
          </button>

          <button
            onClick={() => setActiveTab('servants')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'servants'
                ? 'bg-[#702C3B] text-white shadow-xs'
                : 'text-[#421923] hover:text-[#702C3B]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>مشاركات الخدام ({totalServants})</span>
          </button>
        </div>

        {/* Unified Simplified Toolbar */}
        <div className="bg-white p-2.5 rounded-2xl border border-[#EAE3E4] shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#81777A] absolute right-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الكود..."
                className="w-full pr-9 pl-7 py-2 text-xs rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B] focus:bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute left-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Bulk Present */}
            <button
              type="button"
              onClick={handleBulkMarkPresent}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 shrink-0"
              title="تعليم الكل حاضر"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">الكل حاضر</span>
            </button>

            {/* Reset All */}
            <button
              type="button"
              onClick={handleResetAll}
              className="p-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 text-xs font-bold transition-colors shrink-0"
              title="إعادة ضبط الحضور"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Status Filter Indicator (if filtered) */}
          {statusFilter !== 'all' && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl text-xs">
              <span className="text-amber-900 font-bold flex items-center gap-1">
                <span>تصفية: </span>
                <span>
                  {statusFilter === 'present' && 'الحاضرون فقط'}
                  {statusFilter === 'absent' && 'الغائبون فقط (افتقاد)'}
                  {statusFilter === 'excused' && 'المعتذرون فقط'}
                  {statusFilter === 'unrecorded' && 'لم يُسجل بعد'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="text-amber-800 hover:text-amber-950 font-bold text-[11px] underline"
              >
                إلغاء التصفية (عرض الكل)
              </button>
            </div>
          )}

          {/* Compact Stage Filter (فصول ومراحل الأسرة) */}
          {activeTab === 'members' && currentFamilyStages.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-[#EAE3E4]/60">
              <span className="text-[10px] text-[#81777A] font-bold shrink-0 ml-1">الفصل:</span>
              <button
                type="button"
                onClick={() => setStageFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  stageFilter === 'all'
                    ? 'bg-[#702C3B] text-white shadow-2xs'
                    : 'bg-[#FAF5F6] text-[#81777A] hover:text-[#421923]'
                }`}
              >
                الكل ({membersAttendance.length})
              </button>
              {currentFamilyStages.map(st => {
                const count = membersAttendance.filter(m => m.stage === st).length;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStageFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      stageFilter === st
                        ? 'bg-[#702C3B] text-white shadow-2xs'
                        : 'bg-[#FAF5F6] text-[#81777A] hover:text-[#421923]'
                    }`}
                  >
                    {st} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* LIST 1: SERVED MEMBERS LIST */}
        {activeTab === 'members' && (
          <div className="space-y-2.5">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 bg-white rounded-3xl border border-[#EAE3E4] text-xs text-[#81777A] p-4">
                لا توجد نتائج مطابقة لبحثك أو لتصفية الحضور الحالية.
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isPresent = m.status === 'present';
                const isAbsent = m.status === 'absent';
                const isExcused = m.status === 'excused';
                const isUnrecorded = !m.status || m.status === 'not_recorded';

                // ==========================================
                // DETAILED SPIRITUAL CARD (كشف المتابعة الروحية المفصل الافتراضي)
                // ==========================================
                return (
                  <div
                    key={m.member_id}
                    className="bg-white rounded-3xl border border-[#EAE3E4] p-4 shadow-2xs space-y-3 hover:border-[#702C3B]/40 transition-all"
                  >
                    {/* Top Row: Code Pill + Name + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-mono font-bold border border-gray-200">
                            {m.code ? (m.code.includes('-') ? m.code.split('-')[1] : m.code) : '—'}
                          </span>
                          <h3 className="font-bold text-sm md:text-base text-[#282326]">
                            {m.member_name}
                          </h3>
                          {m.stage && m.stage !== 'عام' && (() => {
                            const badge = getStageBadgeStyle(m.stage);
                            return (
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                                {m.stage}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Confession Father & Servant & Town */}
                        <div className="text-[11px] text-[#81777A] mt-1 flex items-center gap-2 flex-wrap">
                          {m.address && (
                            <>
                              <span>البلد: <strong className="text-[#421923]">{m.address}</strong></span>
                              <span>•</span>
                            </>
                          )}
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
                          ● معتذر {m.excuse_reason ? `(${m.excuse_reason})` : ''}
                        </span>
                      )}
                      {isUnrecorded && (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 shrink-0">
                          لم يُسجل بعد
                        </span>
                      )}
                    </div>

                    {/* 4 CHECKBOXES FOR SERVED MEMBER */}
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
                            ? 'bg-[#15803D] text-white shadow-xs ring-2 ring-emerald-300'
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
                            ? 'bg-[#B91C1C] text-white shadow-xs ring-2 ring-rose-300'
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
                            ? 'bg-[#854D0E] text-white shadow-xs ring-2 ring-amber-300'
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

        {/* LIST 2: SERVANTS LIST */}
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

                    {/* 5 CHECKBOXES FOR SERVANT */}
                    <div className="p-2.5 rounded-2xl bg-[#FAF5F6] border border-[#EAE3E4] space-y-1.5">
                      <span className="text-[10px] font-bold text-[#81777A] block">
                        مهام ومشاركات الخادم في لقاء الجمعة (يملأها أمين الأسرة):
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => handleServantCheckboxToggle(s.servant_id, 'attended_liturgy')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            s.attended_liturgy
                              ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-amber-50'
                          }`}
                        >
                          <span className="text-[11px]">⛪ حضور القداس</span>
                          <span className="text-[9px]">{s.attended_liturgy ? '✓ تم' : '—'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleServantCheckboxToggle(s.servant_id, 'did_opening')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            s.did_opening
                              ? 'bg-[#702C3B] text-white border-[#5A1E2D] shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-rose-50'
                          }`}
                        >
                          <span className="text-[11px]">🎤 تقديم افتتاحية</span>
                          <span className="text-[9px]">{s.did_opening ? '✓ تم' : '—'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleServantCheckboxToggle(s.servant_id, 'did_lesson')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            s.did_lesson
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-emerald-50'
                          }`}
                        >
                          <span className="text-[11px]">📖 إلقاء الدرس</span>
                          <span className="text-[9px]">{s.did_lesson ? '✓ تم' : '—'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleServantCheckboxToggle(s.servant_id, 'did_preparation')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                            s.did_preparation
                              ? 'bg-sky-700 text-white border-sky-800 shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-sky-50'
                          }`}
                        >
                          <span className="text-[11px]">📓 تحضير كشكول</span>
                          <span className="text-[9px]">{s.did_preparation ? '✓ تم' : '—'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleServantCheckboxToggle(s.servant_id, 'did_workshop')}
                          className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all col-span-2 sm:col-span-1 ${
                            s.did_workshop
                              ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                              : 'bg-white text-[#421923] border-[#EAE3E4] hover:bg-purple-50'
                          }`}
                        >
                          <span className="text-[11px]">👥 ورش عمل</span>
                          <span className="text-[9px]">{s.did_workshop ? '✓ تم' : '—'}</span>
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

        {/* MODAL: QUICK EXCUSE REASON SELECTOR */}
        {excuseModalData && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#421923]">سبب الاعتذار</h3>
                    <div className="text-[11px] text-[#81777A]">{excuseModalData.memberName}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExcuseModalData(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Excuse Chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 block">اختر سبباً شائعاً:</label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_EXCUSES.map((exc) => (
                    <button
                      key={exc.label}
                      type="button"
                      onClick={() => handleSetExcuseReason(exc.value)}
                      className="p-2 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {exc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Excuse Input */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-700 block">أو اكتب سبباً مخصصاً:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customExcuse}
                    onChange={(e) => setCustomExcuse(e.target.value)}
                    placeholder="اكتب سبب العذر هنا..."
                    className="flex-1 p-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-[#702C3B]"
                  />
                  <button
                    type="button"
                    onClick={() => handleSetExcuseReason(customExcuse.trim())}
                    disabled={!customExcuse.trim()}
                    className="px-3 py-2 bg-[#702C3B] text-white rounded-xl font-bold text-xs disabled:opacity-50"
                  >
                    تأكيد
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Bottom Action Bar */}
        <div className="fixed bottom-16 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-[#EAE3E4] z-20 shadow-xl">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-[#81777A]">
              {saveSuccess ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  تم الحفظ بنجاح!
                </span>
              ) : hasUnsavedChanges ? (
                <span className="text-amber-700 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                  تعديلات غير محفوظة
                </span>
              ) : (
                <span className="text-gray-500">
                  {isOnline ? 'الكشف متزامن مع السحابة ✓' : 'الحفظ المحلي مؤمن 💾'}
                </span>
              )}
            </div>

            <button
              onClick={handleSaveAll}
              disabled={saving}
              className={`px-6 py-2.5 rounded-2xl font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50 text-white ${
                hasUnsavedChanges
                  ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-300 animate-pulse'
                  : 'bg-[#702C3B] hover:bg-[#5A232F]'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? 'جارٍ الحفظ...'
                  : isOnline
                  ? 'حفظ السجل السحابي'
                  : 'حفظ محلي (Offline)'}
              </span>
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
