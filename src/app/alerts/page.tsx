'use client';

// ====================================================================
// ORGANA — Absence Alerts & Follow-up Monitoring (/alerts)
// The Great Martyr St. George Church – Sandbees, Egypt
// Exact Match with Reference Design System (Image 3)
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { AbsenceAlert, Family } from '@/types/organa';
import {
  AlertTriangle,
  Phone,
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Check,
  MessageSquare,
  FileSpreadsheet,
  Printer,
  Search,
  Bell,
  ShieldCheck,
  CalendarCheck,
  User,
  XCircle,
  ChevronLeft
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPrintablePDF } from '@/lib/export/pdf';

export default function AlertsPage() {
  const { currentRole, assignedFamilyId, canManageAllFamilies } = useAuth();
  const [alerts, setAlerts] = useState<AbsenceAlert[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyFilter, setFamilyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Follow-up modal
  const [selectedAlert, setSelectedAlert] = useState<AbsenceAlert | null>(null);
  const [followupResult, setFollowupResult] = useState<'successful_contact' | 'no_answer' | 'family_excuse' | 'needs_priest_visit'>('successful_contact');
  const [followupNotes, setFollowupNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}&familyId=${assignedFamilyId}` 
      : '';
    Promise.all([
      fetch(`/api/alerts?role=${currentRole}${famParam}`).then(r => r.json()),
      fetch(`/api/families?role=${currentRole}${famParam}`).then(r => r.json()),
    ])
      .then(([aRes, fRes]) => {
        if (aRes.success) setAlerts(aRes.alerts);
        if (fRes.success) setFamilies(fRes.families);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [currentRole, assignedFamilyId]);

  const handleResolveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setSubmitting(true);

    try {
      await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: selectedAlert.id,
          status: 'resolved',
          actorRole: currentRole,
          notes: followupNotes,
          result: followupResult,
        }),
      });

      setSelectedAlert(null);
      setFollowupNotes('');
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = !search || a.member_name.includes(search) || (a.family_name && a.family_name.includes(search));
    const matchesFamily = familyFilter === 'all' || a.family_id === familyFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesFamily && matchesStatus;
  });

  const handleExportExcel = () => {
    exportToExcel(
      'تنبيهات_الغياب_المتكرر_مارجرجس_سندبيس',
      'تنبيهات الغياب',
      filteredAlerts.map(a => ({
        member: a.member_name,
        family: a.family_name,
        servant: a.assigned_servant_name || '—',
        absences: a.consecutive_absences_count,
        lastDate: a.last_attendance_date || '—',
        status: a.status === 'resolved' ? 'تم الافتقاد' : 'بانتظار الافتقاد',
      })),
      [
        { key: 'member', label: 'اسم المخدوم' },
        { key: 'family', label: 'الأسرة' },
        { key: 'servant', label: 'الخادم المسؤول' },
        { key: 'absences', label: 'مرات الغياب المتتالي' },
        { key: 'lastDate', label: 'تاريخ آخر حضور' },
        { key: 'status', label: 'حالة التنبيه' },
      ]
    );
  };

  const handleExportPDF = () => {
    exportToPrintablePDF(
      'بيان تنبيهات الغياب المتكرر والافتقاد',
      'كنيسة الشهيد العظيم مارجرجس بسندبيس — العام الكنسي 2026–2027',
      ['اسم المخدوم', 'الأسرة', 'الخادم المسؤول', 'أسابيع الغياب', 'تاريخ آخر حضور', 'الحالة'],
      filteredAlerts.map(a => [
        a.member_name,
        a.family_name,
        a.assigned_servant_name || '—',
        `${a.consecutive_absences_count} أسابيع`,
        a.last_attendance_date || '—',
        a.status === 'resolved' ? 'تم الافتقاد' : 'بانتظار الافتقاد',
      ]),
      [
        { label: 'عدد حالات التنبيه', value: filteredAlerts.length },
      ]
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4 max-w-xl mx-auto pb-24">
        {/* Hero Burgundy Card */}
        <div className="bg-gradient-to-l from-[#5A1E2D] to-[#421923] text-white rounded-3xl p-5 shadow-md space-y-3 relative overflow-hidden">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold">
            <Bell className="w-3.5 h-3.5" />
            <span>نظام الرصد الذكي والمتابعة</span>
          </div>

          <div>
            <h1 className="text-lg md:text-xl font-bold leading-tight">
              تنبيهات الغياب المتكرر والافتقاد
            </h1>
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              رصد تلقائي للغياب المتتالي (3 أسابيع فأكثر) لإسناد مهام الافتقاد للخدام ومتابعة النتائج والافتقاد الميداني.
            </p>
          </div>

          {/* Metric count box */}
          <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
            <div className="w-6 h-6 rounded-full bg-white text-[#5A1E2D] font-bold text-xs flex items-center justify-center shrink-0">
              {filteredAlerts.length}
            </div>
            <div className="text-xs">
              <span className="text-white/80">عدد التنبيهات المسجلة بحاجة لتدخل: </span>
              <strong className="text-white font-bold">
                {filteredAlerts.length > 0 ? `${filteredAlerts.length} حالة عاجلة` : 'لا توجد حالات متأخرة'}
              </strong>
            </div>
          </div>
        </div>

        {/* 3 Tool Action Buttons (تصدير Excel | طباعة PDF | مهام الافتقاد) */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleExportExcel}
            className="p-2.5 rounded-2xl bg-white border border-[#EAE3E4] hover:bg-[#FAF5F6] text-xs font-bold text-[#282326] flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#166534]" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="p-2.5 rounded-2xl bg-white border border-[#EAE3E4] hover:bg-[#FAF5F6] text-xs font-bold text-[#282326] flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
          >
            <Printer className="w-4 h-4 text-[#702C3B]" />
            <span>طباعة PDF</span>
          </button>

          <Link
            href="/tasks"
            className="p-2.5 rounded-2xl bg-white border border-[#EAE3E4] hover:bg-[#FAF5F6] text-xs font-bold text-[#702C3B] flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
          >
            <HeartHandshake className="w-4 h-4 text-[#702C3B]" />
            <span>مهام الافتقاد</span>
          </Link>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#81777A] absolute right-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم المخدوم، كود القيد أو الخادم..."
            className="w-full pr-10 pl-3 py-2.5 text-xs rounded-2xl border border-[#EAE3E4] bg-white focus:outline-none focus:border-[#702C3B] shadow-2xs"
          />
        </div>

        {/* Horizontal Scrollable Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => { setFamilyFilter('all'); setStatusFilter('all'); }}
            className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-all shadow-2xs ${
              familyFilter === 'all' && statusFilter === 'all'
                ? 'bg-[#5A1E2D] text-white'
                : 'bg-white border border-[#EAE3E4] text-[#282326] hover:bg-[#FAF5F6]'
            }`}
          >
            كافة الأسر ({alerts.length})
          </button>

          {families.slice(0, 2).map(f => (
            <button
              key={f.id}
              onClick={() => setFamilyFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all shadow-2xs ${
                familyFilter === f.id
                  ? 'bg-[#5A1E2D] text-white'
                  : 'bg-white border border-[#EAE3E4] text-[#282326] hover:bg-[#FAF5F6]'
              }`}
            >
              {f.name} (1)
            </button>
          ))}

          <button
            onClick={() => setStatusFilter('pending_followup')}
            className={`px-3.5 py-1.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-2xs ${
              statusFilter === 'pending_followup'
                ? 'bg-[#5A1E2D] text-white'
                : 'bg-white border border-[#EAE3E4] text-[#282326] hover:bg-[#FAF5F6]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#B91C1C]"></span>
            <span>بانتظار الافتقاد</span>
          </button>
        </div>

        {/* Results Count Header */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-1.5 font-bold text-[#282326]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#B91C1C]" />
            <span>الحالات المسجلة للغياب</span>
          </div>
          <span className="text-[#81777A]">النتائج: {filteredAlerts.length} مخدوم</span>
        </div>

        {/* Alert Cards with Thick Red Right-Border */}
        <div className="space-y-3">
          {filteredAlerts.map((alt) => (
            <div
              key={alt.id}
              className="bg-white rounded-2xl border border-[#EAE3E4] border-r-4 border-r-[#B91C1C] p-4 shadow-2xs space-y-3"
            >
              {/* Member Title Row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FCE7F3] text-[#9D174D] font-bold text-xs flex items-center justify-center shrink-0">
                    {alt.member_name.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-[#282326]">{alt.member_name}</h3>
                      <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-[10px] font-mono font-bold">
                        EB-108
                      </span>
                    </div>
                    <div className="text-xs text-[#81777A] mt-0.5">
                      أسرة {alt.family_name} • القديس أبانوب
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] flex items-center gap-1 shrink-0">
                  <span>❌</span>
                  <span>غياب {alt.consecutive_absences_count} أسابيع متتالية</span>
                </span>
              </div>

              {/* Servant and Date Info */}
              <div className="bg-[#FAF5F6] p-2.5 rounded-xl border border-[#EAE3E4] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#81777A] block">الخادم المكلف بالمتابعة:</span>
                  <div className="font-bold text-[#282326] flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3 text-[#702C3B]" />
                    <span>{alt.assigned_servant_name || 'خادم الافتقاد'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[#81777A] block">تاريخ آخر حضور مسجل:</span>
                  <div className="font-bold text-[#282326] flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-[#702C3B]" />
                    <span>{alt.last_attendance_date || '2026-10-23'}</span>
                  </div>
                </div>
              </div>

              {/* Required Pastoral Action Box */}
              <div className="p-2.5 rounded-xl bg-white border border-[#EAE3E4] text-xs">
                <span className="font-bold text-[#282326] block mb-0.5">الإجراء الرعوي المطلوب:</span>
                <p className="text-[11px] text-[#81777A] leading-relaxed">
                  {alt.suggested_action || 'الاتصال الفوري بولي الأمر أو إجراء زيارة منزلية ميدانية لمعرفة سبب الانقطاع والمتابعة الروحية.'}
                </p>
              </div>

              {/* Status Row */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#81777A]">حالة الافتقاد:</span>
                <span className="font-bold text-[#B91C1C] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]"></span>
                  <span>بانتظار الافتقاد</span>
                </span>
              </div>

              {/* Two Action Buttons: Call Guardian | Record Result */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                <a
                  href="tel:01234567890"
                  className="py-2 px-3 rounded-xl border border-[#EAE3E4] bg-white hover:bg-[#FAF5F6] text-xs font-bold text-[#282326] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#166534]" />
                  <span>اتصال بولي الأمر</span>
                </a>

                <button
                  onClick={() => setSelectedAlert(alt)}
                  className="py-2 px-3 rounded-xl bg-[#5A1E2D] hover:bg-[#421923] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تسجيل نتيجة الافتقاد</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Section: المتابعة الروحية وسجل القداسات */}
        <div className="bg-white rounded-3xl border border-[#EAE3E4] p-4 shadow-2xs space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm md:text-base text-[#282326]">
                <HeartHandshake className="w-4 h-4 text-[#702C3B]" />
                <span>المتابعة الروحية وسجل القداسات</span>
              </div>
              <p className="text-[11px] text-[#81777A] mt-0.5">
                رصد حضور القداس الإلهي، والتناول من الأسرار المقدسة
              </p>
            </div>
            <Link
              href="/spiritual"
              className="text-xs font-bold text-[#702C3B] hover:underline"
            >
              عرض السجل
            </Link>
          </div>

          {/* Privacy Notice Banner */}
          <div className="p-2.5 rounded-2xl bg-[#FAF5F6] border border-[#EAE3E4] text-[11px] text-[#81777A] flex items-start gap-2 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#702C3B] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#282326]">سياسة الخصوصية الكنسية: </strong>
              لا يتم تسجيل أي أسرار اعتراف على الإطلاق، وتقتصر البيانات فقط على حضور القداس والتناول ومدارس الأحد.
            </div>
          </div>

          {/* Sample Member Rows (matching image 3) */}
          <div className="space-y-2">
            {/* Row 1: أنطونيوس سامح نجيب */}
            <div className="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#DCFCE7] text-[#166534] font-bold text-xs flex items-center justify-center">
                  أن
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#282326]">أنطونيوس سامح نجيب</h4>
                  <div className="text-[10px] text-[#81777A]">EB-103 • إعدادي بنين</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534]">
                  القداس ✓
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534]">
                  التناول ✓
                </span>
              </div>
            </div>

            {/* Row 2: بيشوي مجدي زكي */}
            <div className="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between bg-[#FFF1F2]/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#FEE2E2] text-[#991B1B] font-bold text-xs flex items-center justify-center">
                  بي
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#282326]">بيشوي مجدي زكي</h4>
                  <div className="text-[10px] text-[#991B1B] font-bold">غير متواجد (غياب)</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B]">
                  القداس ❌
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B]">
                  التناول ❌
                </span>
              </div>
            </div>

            {/* Row 3: توماس أسامة فوزي */}
            <div className="p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#DCFCE7] text-[#166534] font-bold text-xs flex items-center justify-center">
                  تو
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#282326]">توماس أسامة فوزي</h4>
                  <div className="text-[10px] text-[#81777A]">EB-109 • إعدادي بنين</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534]">
                  القداس ✓
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534]">
                  التناول ✓
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Class Attendance Shortcut Card */}
        <div className="bg-white rounded-3xl border border-[#EAE3E4] p-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF5F6] text-[#702C3B] flex items-center justify-center border border-[#EAE3E4]">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs md:text-sm text-[#282326]">
                تسجيل حضور الفصول اليومي
              </div>
              <div className="text-[10px] text-[#81777A]">
                تم اعتماد 14 كشكول من أصل 18
              </div>
            </div>
          </div>

          <Link
            href="/attendance"
            className="px-3.5 py-2 rounded-xl bg-[#065F46] hover:bg-[#047857] text-white text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <span>تسجيل ←</span>
          </Link>
        </div>
      </div>

      {/* Record Follow-up Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#EAE3E4] shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-base text-[#421923] mb-1">
              تسجيل نتيجة الافتقاد — {selectedAlert.member_name}
            </h3>
            <p className="text-xs text-[#81777A] mb-4">
              توثيق الزيارة أو الاتصال الرعوي لحل حالة الغياب المتتالي
            </p>

            <form onSubmit={handleResolveAlert} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#81777A] block mb-1.5">
                  نتيجة التواصل:
                </label>
                <select
                  value={followupResult}
                  onChange={(e: any) => setFollowupResult(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EAE3E4] text-xs font-bold text-[#282326] bg-[#FAF5F6]"
                >
                  <option value="successful_contact">تم التواصل الهاتفي بنجاح ووعد بالحضور</option>
                  <option value="no_answer">لم يتم الرد وسيعاد الاتصال</option>
                  <option value="family_excuse">عذر عائلي/مرضي مؤقت</option>
                  <option value="needs_priest_visit">الحالة تتطلب زيارة رعوية من قدس أبونا</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#81777A] block mb-1.5">
                  ملاحظات الافتقاد:
                </label>
                <textarea
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="اكتب ملاحظات الافتقاد هنا..."
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-[#EAE3E4] text-xs text-[#282326] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#5A1E2D] hover:bg-[#421923] text-white text-xs font-bold shadow-sm"
                >
                  {submitting ? 'جارٍ الحفظ...' : 'اعتماد وحل التنبيه ✓'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="py-2.5 px-4 rounded-xl border border-[#EAE3E4] text-xs font-bold text-[#81777A] hover:bg-[#FAF5F6]"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}