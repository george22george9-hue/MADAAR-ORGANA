'use client';

// ====================================================================
// ORGANA — Priest & Secretary Servants Pastoral Performance Report
// "الكاهن يجيلة تقرير بالخدام كلها قدامة
// مين حضر القداس ومين حضر الدرس وجاب الكشكول ومين حضر الفصل"
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  Church,
  GraduationCap,
  Users,
  Search,
  Filter,
  MessageCircle,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react';
import { BroadcastModal } from '@/components/notifications/BroadcastModal';

interface ServantReportItem {
  id: string;
  full_name: string;
  phone: string;
  confession_father?: string;
  role_in_family: string;
  family_id: string;
  family_name: string;
  status: 'present' | 'absent' | 'excused' | 'not_recorded';
  attended_liturgy: boolean;
  prepared_notebook: boolean;
  taught_lesson: boolean;
  attended_class: boolean;
  meeting_date?: string | null;
  excuse_reason?: string | null;
}

export function PriestServantsReport() {
  const [servants, setServants] = useState<ServantReportItem[]>([]);
  const [summary, setSummary] = useState({
    totalServants: 0,
    presentCount: 0,
    absentCount: 0,
    liturgyCount: 0,
    notebookCount: 0,
    lessonCount: 0,
    liturgyRate: 0,
    notebookRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'absent' | 'no_notebook' | 'attended_liturgy'>('all');
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  const loadData = () => {
    fetch('/api/servants/overview')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setServants(res.servants || []);
          if (res.summary) setSummary(res.summary);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredServants = (servants || []).filter(s => {
    if (!s) return false;
    const sName = String(s.full_name || '').toLowerCase();
    const fName = String(s.family_name || '').toLowerCase();
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !q || sName.includes(q) || fName.includes(q);

    if (!matchesSearch) return false;

    if (activeFilter === 'absent') {
      return s.status === 'absent';
    }
    if (activeFilter === 'no_notebook') {
      return !s.prepared_notebook;
    }
    if (activeFilter === 'attended_liturgy') {
      return s.attended_liturgy;
    }
    return true;
  });

  const handleWhatsApp = (s: ServantReportItem) => {
    if (!s) return;
    const sName = s.full_name || 'الخادم';
    let msg = `سلام ونعمة يا أستاذ ${sName}.. صلوات قدس أبونا وإدارة الخدمة معك، بنصلي تكون بكل خير.`;
    if (s.status === 'absent') {
      msg = `سلام ونعمة يا أستاذ ${sName}.. افتقدناك في خدمة كنيسة مارجرجس بسندبيس، بنصلي تكون بكل خير وبانتظارك الجمعة القادمة! 🙏`;
    } else if (!s.prepared_notebook) {
      msg = `سلام ونعمة يا أستاذ ${sName}.. نرجو عدم نسيان تجهيز وتسليم كشكول اللقاء للأسبوع القادم لبركة الخدمة. 📓`;
    }
    const cleanPhone = String(s.phone || '').replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('0') ? `2${cleanPhone}` : cleanPhone;
    if (finalPhone) {
      window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-[#EAE3E4] p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE3E4]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#702C3B]/10 border border-[#702C3B]/20 flex items-center justify-center text-[#702C3B] shrink-0">
              <Church className="w-5 h-5 text-[#702C3B]" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-[#421923] flex items-center gap-1.5">
                <span>تقرير متابعة وانضباط الخدام</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                  رعوي
                </span>
              </h2>
              <p className="text-xs text-[#81777A] mt-0.5">
                حضور القداس، تحضير الكشاكيل، إلقاء الدروس، والمتابعة
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsBroadcastOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-[#702C3B] hover:bg-[#5b2330] text-white text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <Radio className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>إرسال كلمة / تعميم للخدام 📢</span>
          </button>
        </div>

        {/* 4 Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-900">حضور القداس</span>
              <Church className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <div className="text-lg font-bold text-amber-950">
              {summary.liturgyCount} <span className="text-xs font-normal text-amber-800">خادم ({summary.liturgyRate}%)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-[#702C3B]">تحضير الكشكول</span>
              <BookOpen className="w-3.5 h-3.5 text-[#702C3B]" />
            </div>
            <div className="text-lg font-bold text-[#421923]">
              {summary.notebookCount} <span className="text-xs font-normal text-[#81777A]">خادم ({summary.notebookRate}%)</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-900">إلقاء الدرس والفصل</span>
              <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
            </div>
            <div className="text-lg font-bold text-emerald-950">
              {summary.lessonCount} <span className="text-xs font-normal text-emerald-800">خادم</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-purple-900">إجمالي الخدام</span>
              <Users className="w-3.5 h-3.5 text-purple-700" />
            </div>
            <div className="text-lg font-bold text-purple-950">
              {summary.totalServants} <span className="text-xs font-normal text-purple-800">خادم مسجل</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الخادم أو الأسرة..."
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-[#EAE3E4] text-xs text-[#421923] focus:outline-none focus:ring-1 focus:ring-[#702C3B] bg-[#FAF5F6]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-[#702C3B] text-white shadow-sm'
                  : 'bg-white border border-[#EAE3E4] text-[#81777A] hover:bg-gray-50'
              }`}
            >
              الكل ({servants.length})
            </button>

            <button
              onClick={() => setActiveFilter('absent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeFilter === 'absent'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white border border-[#EAE3E4] text-red-600 hover:bg-red-50'
              }`}
            >
              الغياب ({summary.absentCount})
            </button>

            <button
              onClick={() => setActiveFilter('no_notebook')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeFilter === 'no_notebook'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white border border-[#EAE3E4] text-amber-700 hover:bg-amber-50'
              }`}
            >
              بدون كشكول ({Math.max(0, summary.totalServants - summary.notebookCount)})
            </button>

            <button
              onClick={() => setActiveFilter('attended_liturgy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeFilter === 'attended_liturgy'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-[#EAE3E4] text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              حضروا القداس ({summary.liturgyCount})
            </button>
          </div>
        </div>
      </div>

      {/* Servants List */}
      <div className="space-y-2">
        {loading ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#EAE3E4] text-xs text-[#81777A] animate-pulse">
            جارٍ تحميل بيانات التقرير الرعوي للخدام...
          </div>
        ) : filteredServants.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#EAE3E4] text-xs text-[#81777A]">
            لا توجد سجلات مطابقة للبحث أو الفلتر المحدد.
          </div>
        ) : (
          filteredServants.map(s => {
            const isPresent = s.status === 'present';
            const isAbsent = s.status === 'absent';
            const isExcused = s.status === 'excused';

            return (
              <div
                key={s.id}
                className="bg-white p-3.5 rounded-2xl border border-[#EAE3E4] shadow-sm hover:border-[#702C3B]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Servant Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 ${
                    isPresent ? 'bg-emerald-600' : isAbsent ? 'bg-red-500' : 'bg-gray-400'
                  }`}>
                    {s.full_name.charAt(0)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-[#421923] truncate">
                        {s.full_name}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-[#81777A] font-medium">
                        {s.family_name}
                      </span>
                      {s.role_in_family && s.role_in_family !== 'خادم' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-bold">
                          {s.role_in_family}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#81777A] mt-0.5 flex items-center gap-2">
                      <span>هاتف: {s.phone}</span>
                      {s.confession_father && (
                        <>
                          <span>•</span>
                          <span>أب الاعتراف: {s.confession_father}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Performance Badges (القداس، الكشكول، الدرس، الفصل) */}
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  {/* Attendance status */}
                  <span className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                    isPresent
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : isAbsent
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : isExcused
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    {isPresent ? 'حاضر' : isAbsent ? 'غائب' : isExcused ? 'معتذر' : 'لم يسجل'}
                  </span>

                  {/* Liturgy */}
                  <span className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                    s.attended_liturgy
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'bg-gray-50 text-gray-400 border border-gray-200'
                  }`} title="حضور القداس الإلهي">
                    <span>⛪ القداس</span>
                    {s.attended_liturgy ? <CheckCircle2 className="w-3 h-3 text-amber-700" /> : <XCircle className="w-3 h-3 text-gray-300" />}
                  </span>

                  {/* Notebook */}
                  <span className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                    s.prepared_notebook
                      ? 'bg-rose-50 text-[#702C3B] border border-rose-200'
                      : 'bg-gray-50 text-gray-400 border border-gray-200'
                  }`} title="تحضير كشكول الخدمة">
                    <span>📓 الكشكول</span>
                    {s.prepared_notebook ? <CheckCircle2 className="w-3 h-3 text-[#702C3B]" /> : <XCircle className="w-3 h-3 text-gray-300" />}
                  </span>

                  {/* Lesson */}
                  <span className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                    s.taught_lesson
                      ? 'bg-purple-50 text-purple-900 border border-purple-200'
                      : 'bg-gray-50 text-gray-400 border border-gray-200'
                  }`} title="إلقاء الدرس باللقاء">
                    <span>📖 الدرس</span>
                    {s.taught_lesson ? <CheckCircle2 className="w-3 h-3 text-purple-700" /> : <XCircle className="w-3 h-3 text-gray-300" />}
                  </span>

                  {/* Quick WhatsApp Contact */}
                  <button
                    onClick={() => handleWhatsApp(s)}
                    className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                    title="مراسلة عبر واتساب للافتقاد والمتابعة"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Broadcast Modal Triggered from this view */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
