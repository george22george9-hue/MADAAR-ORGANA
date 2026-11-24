'use client';

// ====================================================================
// ORGANA — Pastoral Visitations & Follow-up Tasks Module (/tasks)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { FollowupTask, PastoralVisitation, VisitationMethod } from '@/types/organa';
import { RecordVisitationModal } from '@/components/visitations/RecordVisitationModal';
import {
  HeartHandshake,
  CheckCircle2,
  Clock,
  Phone,
  Home,
  MessageCircle,
  Check,
  Search,
  Filter,
  Plus,
  Church,
  Calendar,
  Users,
  User,
  MapPin,
  Trash2,
  PhoneCall,
  Loader2,
  Sparkles,
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import { getWhatsAppUrl, getPastoralVisitationMessage } from '@/lib/utils/whatsapp';

export default function TasksPage() {
  const { currentRole, currentUser, assignedFamilyId } = useAuth();
  const isPriest = currentRole === 'priest';
  const isAdmin = currentRole === 'admin';
  const isFamilyLeader = currentRole === 'family_leader';

  // Navigation tab: 'visitations' (سجل الافتقادات الميدانية) or 'tasks' (مهام المتابعة)
  const [activeMainTab, setActiveMainTab] = useState<'visitations' | 'tasks'>('visitations');

  // Follow-up tasks state
  const [tasks, setTasks] = useState<FollowupTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Pastoral visitations state
  const [visitations, setVisitations] = useState<PastoralVisitation[]>([]);
  const [loadingVisitations, setLoadingVisitations] = useState(true);
  const [visitationMethodFilter, setVisitationMethodFilter] = useState<string>('all');
  const [visitationSearch, setVisitationSearch] = useState('');

  // Modal
  const [showVisitationModal, setShowVisitationModal] = useState(false);

  // Load Tasks
  const loadTasks = () => {
    setLoadingTasks(true);
    fetch('/api/tasks')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setTasks(res.tasks || []);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoadingTasks(false));
  };

  // Load Visitations
  const loadVisitations = () => {
    setLoadingVisitations(true);
    const famParam = assignedFamilyId ? `?familyId=${assignedFamilyId}` : '';
    fetch(`/api/visitations${famParam}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setVisitations(res.visitations || []);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoadingVisitations(false));
  };

  useEffect(() => {
    loadTasks();
    loadVisitations();
  }, [assignedFamilyId]);

  // Complete a task
  const handleCompleteTask = async (taskId: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          result: 'successful_contact',
          notes: 'تم الافتقاد والتواصل بنجاح وتم التأكيد على الحضور.',
          actorRole: currentRole,
        }),
      });
      loadTasks();
      loadVisitations();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete a recorded visitation
  const handleDeleteVisitation = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف سجل هذا الافتقاد؟ لا يمكن التراجع عن ذلك.')) return;
    try {
      const res = await fetch(`/api/visitations?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setVisitations((prev) => prev.filter((v) => v.id !== id));
      } else {
        alert(data.error || 'حدث خطأ أثناء الحذف');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم');
    }
  };

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskFilter === 'pending') return !t.is_completed;
      if (taskFilter === 'completed') return t.is_completed;
      return true;
    });
  }, [tasks, taskFilter]);

  // Filter Visitations
  const filteredVisitations = useMemo(() => {
    return visitations.filter((v) => {
      // Method filter
      if (visitationMethodFilter !== 'all' && v.method !== visitationMethodFilter) {
        return false;
      }
      // Search filter
      if (visitationSearch.trim()) {
        const q = visitationSearch.toLowerCase();
        const memberMatch = v.member_name?.toLowerCase().includes(q);
        const codeMatch = v.member_code?.toLowerCase().includes(q);
        const notesMatch = v.notes?.toLowerCase().includes(q);
        const servantsMatch = v.servant_names?.some((s) => s.toLowerCase().includes(q));
        const addressMatch = v.address?.toLowerCase().includes(q);
        if (!memberMatch && !codeMatch && !notesMatch && !servantsMatch && !addressMatch) {
          return false;
        }
      }
      return true;
    });
  }, [visitations, visitationMethodFilter, visitationSearch]);

  // Visitation Metrics
  const stats = useMemo(() => {
    const total = visitations.length;
    const homeVisits = visitations.filter((v) => v.method === 'home_visit').length;
    const phoneCalls = visitations.filter((v) => v.method === 'phone_call').length;
    const churchMeetings = visitations.filter((v) => v.method === 'church_meeting').length;
    return { total, homeVisits, phoneCalls, churchMeetings };
  }, [visitations]);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
        
        {/* Main Header Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#EAE3E4] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#702C3B] text-white flex items-center justify-center shadow-md shadow-rose-900/10 shrink-0">
              <HeartHandshake className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                  الافتقاد والرعاية الميدانية
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF5F6] text-[#702C3B] border border-[#EAE3E4]">
                  كنيسة مارجرجس بسندبيس
                </span>
              </div>
              <p className="text-xs text-[#81777A] leading-relaxed">
                سجل الزيارات المنزلية، الاتصالات الهاتفية، ومتابعة مخدومي الكنيسة بجهد مشترك بين الخدام
              </p>
            </div>
          </div>

          {/* Action: Record New Visitation Button */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => setShowVisitationModal(true)}
              className="px-5 py-3 rounded-2xl bg-[#702C3B] hover:bg-[#58222e] text-white text-xs font-bold hover:shadow-lg hover:shadow-rose-900/20 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل افتقاد جديد 🏠</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher: Visitations vs Tasks */}
        <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMainTab('visitations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'visitations'
                  ? 'bg-[#702C3B] text-white shadow-xs'
                  : 'bg-white text-[#81777A] hover:bg-stone-50 border border-[#EAE3E4]'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>سجل الافتقادات الميدانية</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeMainTab === 'visitations' ? 'bg-white/20 text-white' : 'bg-stone-100 text-[#421923]'
                }`}
              >
                {visitations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('tasks')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMainTab === 'tasks'
                  ? 'bg-[#702C3B] text-white shadow-xs'
                  : 'bg-white text-[#81777A] hover:bg-stone-50 border border-[#EAE3E4]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>مهام المتابعة والغياب</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeMainTab === 'tasks' ? 'bg-white/20 text-white' : 'bg-stone-100 text-[#421923]'
                }`}
              >
                {tasks.filter((t) => !t.is_completed).length} معلقة
              </span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: RECORDED VISITATIONS TIMELINE                           */}
        {/* ============================================================== */}
        {activeMainTab === 'visitations' && (
          <div className="space-y-6">
            
            {/* KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-[#EAE3E4] shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-[#702C3B] flex items-center justify-center shrink-0">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[#421923]">{stats.total}</div>
                  <div className="text-[11px] text-[#81777A]">إجمالي الافتقادات</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#EAE3E4] shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[#421923]">{stats.homeVisits}</div>
                  <div className="text-[11px] text-[#81777A]">زيارة منزلية</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#EAE3E4] shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[#421923]">{stats.phoneCalls}</div>
                  <div className="text-[11px] text-[#81777A]">اتصال هاتفي</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#EAE3E4] shadow-2xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Church className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[#421923]">{stats.churchMeetings}</div>
                  <div className="text-[11px] text-[#81777A]">لقاء بالكنيسة</div>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-[#EAE3E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#81777A] absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={visitationSearch}
                  onChange={(e) => setVisitationSearch(e.target.value)}
                  placeholder="ابحث باسم المخدوم، الخادم، الكود، أو تفاصيل الزيارة..."
                  className="w-full pr-10 pl-3 py-2 rounded-xl border border-[#EAE3E4] text-xs bg-stone-50/50 focus:bg-white focus:outline-none focus:border-[#702C3B] focus:ring-1 focus:ring-[#702C3B] transition-all"
                />
              </div>

              {/* Method Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs shrink-0">
                <button
                  onClick={() => setVisitationMethodFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    visitationMethodFilter === 'all'
                      ? 'bg-[#702C3B] text-white shadow-xs'
                      : 'bg-stone-100 text-[#81777A] hover:bg-stone-200/70'
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setVisitationMethodFilter('home_visit')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    visitationMethodFilter === 'home_visit'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-stone-100 text-[#81777A] hover:bg-stone-200/70'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>زيارة منزلية</span>
                </button>
                <button
                  onClick={() => setVisitationMethodFilter('phone_call')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    visitationMethodFilter === 'phone_call'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-stone-100 text-[#81777A] hover:bg-stone-200/70'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>اتصال هاتفي</span>
                </button>
                <button
                  onClick={() => setVisitationMethodFilter('church_meeting')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    visitationMethodFilter === 'church_meeting'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-stone-100 text-[#81777A] hover:bg-stone-200/70'
                  }`}
                >
                  <Church className="w-3.5 h-3.5" />
                  <span>مقابلة كنسية</span>
                </button>
              </div>
            </div>

            {/* Visitations List */}
            {loadingVisitations ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-[#EAE3E4] text-xs text-[#81777A] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-[#702C3B]" />
                <span>جاري تحميل سجل الافتقادات...</span>
              </div>
            ) : filteredVisitations.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-[#EAE3E4] text-xs text-[#81777A] flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#FAF5F6] text-[#702C3B] flex items-center justify-center">
                  <HeartHandshake className="w-7 h-7" />
                </div>
                <div className="font-bold text-sm text-[#421923]">لا توجد افتقادات مسجلة حالياً</div>
                <p className="max-w-md text-[#81777A]">
                  ابدأ بتسجيل أول افتقاد قمت به مع خدام أسرتك لتوثيق الرعاية ومتابعة أحوال المخدومين.
                </p>
                <button
                  onClick={() => setShowVisitationModal(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#702C3B] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تسجيل أول افتقاد</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredVisitations.map((v) => {
                  const isHome = v.method === 'home_visit';
                  const isPhone = v.method === 'phone_call';
                  const isChurch = v.method === 'church_meeting';

                  return (
                    <div
                      key={v.id}
                      className="p-5 rounded-2xl border border-[#EAE3E4] bg-white hover:border-[#702C3B]/40 hover:shadow-md transition-all space-y-4"
                    >
                      {/* Top Header of Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                              isHome
                                ? 'bg-amber-600'
                                : isPhone
                                ? 'bg-sky-600'
                                : 'bg-emerald-600'
                            }`}
                          >
                            {isHome ? (
                              <Home className="w-5 h-5" />
                            ) : isPhone ? (
                              <Phone className="w-5 h-5" />
                            ) : (
                              <Church className="w-5 h-5" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-base text-[#421923]">
                                {v.member_name || 'مخدوم'}
                              </span>
                              {v.member_code && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                                  {v.member_code}
                                </span>
                              )}
                              {v.member_stage && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                  {v.member_stage}
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isHome
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : isPhone
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {isHome
                                  ? '🏠 زيارة منزلية'
                                  : isPhone
                                  ? '📞 اتصال هاتفي'
                                  : '⛪ مقابلة في الكنيسة'}
                              </span>
                            </div>

                            <div className="text-[11px] text-[#81777A] mt-1 flex flex-wrap items-center gap-3">
                              {v.guardian_name && (
                                <span>ولي الأمر: <strong>{v.guardian_name}</strong></span>
                              )}
                              {v.guardian_phone && (
                                <a
                                  href={`tel:${v.guardian_phone}`}
                                  className="flex items-center gap-1 hover:text-[#702C3B] transition-colors"
                                  dir="ltr"
                                >
                                  <PhoneCall className="w-3 h-3 text-[#702C3B]" />
                                  <span>{v.guardian_phone}</span>
                                </a>
                              )}
                              {v.address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-[#702C3B]" />
                                  <span>{v.address}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Date and Delete Action */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-[#421923] font-medium">
                            <Calendar className="w-3.5 h-3.5 text-[#702C3B]" />
                            <span>تاريخ الافتقاد: {v.visitation_date}</span>
                          </div>

                          {(isPriest || isAdmin || isFamilyLeader) && (
                            <button
                              onClick={() => handleDeleteVisitation(v.id)}
                              title="حذف هذا السجل"
                              className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Participating Servants */}
                      <div className="p-3 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4] flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#702C3B] flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>الخدام المشاركون في الافتقاد:</span>
                        </span>
                        {v.servant_names && v.servant_names.length > 0 ? (
                          v.servant_names.map((name, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-[#421923] border border-[#EAE3E4] shadow-2xs"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-[#81777A]">خدام الأسرة</span>
                        )}
                      </div>

                      {/* Notes / Report text */}
                      <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-[#282326] leading-relaxed whitespace-pre-wrap">
                        <strong className="text-[#421923] block mb-1">
                          📝 تقرير وملاحظات الافتقاد:
                        </strong>
                        {v.notes}
                      </div>

                      {/* Footer Metadata */}
                      <div className="text-[10px] text-[#81777A] flex items-center justify-between pt-1 border-t border-stone-100">
                        <span>
                          سُجل بواسطة: <strong>{v.recorded_by_name || 'الخادم'}</strong>
                        </span>
                        <span>
                          توقيت التوثيق: {new Date(v.created_at).toLocaleString('ar-EG')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: FOLLOW-UP TASKS LIST                                   */}
        {/* ============================================================== */}
        {activeMainTab === 'tasks' && (
          <div className="space-y-4">
            
            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 border border-[#EAE3E4] shadow-2xs flex items-center justify-between">
              <div className="text-xs text-[#81777A]">
                المهام الناتجة تلقائياً عن الغياب المتكرر والمطلوب متابعتها
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTaskFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    taskFilter === 'all'
                      ? 'bg-[#702C3B] text-white'
                      : 'bg-[#FAF5F6] text-[#81777A]'
                  }`}
                >
                  الكل ({tasks.length})
                </button>
                <button
                  onClick={() => setTaskFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    taskFilter === 'pending'
                      ? 'bg-[#702C3B] text-white'
                      : 'bg-[#FAF5F6] text-[#81777A]'
                  }`}
                >
                  معلقة ({tasks.filter((t) => !t.is_completed).length})
                </button>
                <button
                  onClick={() => setTaskFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    taskFilter === 'completed'
                      ? 'bg-[#702C3B] text-white'
                      : 'bg-[#FAF5F6] text-[#81777A]'
                  }`}
                >
                  مكتملة ({tasks.filter((t) => t.is_completed).length})
                </button>
              </div>
            </div>

            {/* Task Cards */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="p-10 text-center bg-white rounded-2xl border border-[#EAE3E4] text-xs text-[#81777A]">
                  لا توجد مهام مطابقة للفلتر الحالي
                </div>
              ) : (
                filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-5 rounded-2xl border transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      t.is_completed
                        ? 'border-[#EAE3E4] opacity-80'
                        : 'border-amber-200 bg-amber-50/20 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-base text-[#421923]">{t.member_name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5F6] text-[#702C3B] border border-[#EAE3E4]">
                          {t.task_type === 'phone_call'
                            ? 'مكالمة هاتفية'
                            : t.task_type === 'home_visit'
                            ? 'زيارة منزلية'
                            : 'تواصل بالكنيسة'}
                        </span>
                        {t.is_completed ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            مكتملة
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            مطلوب الافتقاد
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#282326] mt-1 leading-relaxed">{t.notes}</div>

                      <div className="text-[11px] text-[#81777A] mt-2 flex items-center gap-3">
                        <span>
                          الخادم المكلف: <strong>{t.servant_name || 'خادم الافتقاد'}</strong>
                        </span>
                        <span>•</span>
                        <span>موعد الإنجاز: {t.due_date}</span>
                      </div>
                    </div>

                    {!t.is_completed && (
                      <button
                        onClick={() => handleCompleteTask(t.id)}
                        className="px-4 py-2 rounded-xl bg-[#10B981] text-white font-bold text-xs hover:bg-[#059669] transition-colors flex items-center gap-1.5 self-end sm:self-center shadow-xs cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>تأكيد إتمام الافتقاد</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal: Record Visitation */}
        <RecordVisitationModal
          isOpen={showVisitationModal}
          onClose={() => setShowVisitationModal(false)}
          onSuccess={() => {
            loadVisitations();
            loadTasks();
          }}
        />
      </div>
    </AppLayout>
  );
}
