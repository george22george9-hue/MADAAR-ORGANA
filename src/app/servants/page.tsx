'use client';

// ====================================================================
// ORGANA — Servants Management Module (/servants)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { Servant, Family } from '@/types/organa';
import {
  UserCheck,
  Phone,
  Calendar,
  Briefcase,
  Award,
  BookOpen,
  Plus,
  Search,
  FileSpreadsheet,
  Printer,
  Edit2,
  Eye,
  CheckCircle2,
  X,
  Trash2
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPrintablePDF } from '@/lib/export/pdf';

export default function ServantsPage() {
  const { currentRole, canManageAllFamilies, assignedFamilyId } = useAuth();
  const [servants, setServants] = useState<Servant[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('all');
  const [viewingServant, setViewingServant] = useState<Servant | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingServant, setEditingServant] = useState<Servant | null>(null);

  // Form
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formJob, setFormJob] = useState('');
  const [formConfession, setFormConfession] = useState('');
  const [formJoiningDate, setFormJoiningDate] = useState('2022-09-01');
  const [formFamilyIds, setFormFamilyIds] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}&familyId=${assignedFamilyId}` 
      : '';
    Promise.all([
      fetch(`/api/servants?role=${currentRole}${famParam}`).then(r => r.json()),
      fetch(`/api/families?role=${currentRole}${famParam}`).then(r => r.json()),
    ])
      .then(([sRes, fRes]) => {
        if (sRes.success) setServants(sRes.servants);
        if (fRes.success) setFamilies(fRes.families);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [currentRole, assignedFamilyId]);

  const openCreateModal = () => {
    setEditingServant(null);
    setFormName('');
    setFormPhone('');
    setFormJob('');
    setFormConfession('');
    setFormJoiningDate(new Date().toISOString().split('T')[0]);
    setFormFamilyIds(['fam-prep-boys']);
    setFormNotes('');
    setShowModal(true);
  };

  const openEditModal = (srv: Servant) => {
    setEditingServant(srv);
    setFormName(srv.full_name);
    setFormPhone(srv.phone);
    setFormJob(srv.job_or_study || '');
    setFormConfession(srv.confession_father || '');
    setFormJoiningDate(srv.joining_date);
    setFormFamilyIds(srv.assigned_family_ids || []);
    setFormNotes(srv.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;
    setSubmitting(true);

    try {
      const url = '/api/servants';
      const method = editingServant ? 'PUT' : 'POST';
      const body = {
        id: editingServant?.id,
        full_name: formName.trim(),
        phone: formPhone.trim(),
        job_or_study: formJob.trim(),
        confession_father: formConfession.trim(),
        joining_date: formJoiningDate,
        family_ids: formFamilyIds,
        notes: formNotes.trim(),
        actorRole: currentRole,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredServants = servants.filter(s => {
    const matchesSearch = !search || s.full_name.includes(search) || s.phone.includes(search);
    const matchesFamily = selectedFamilyFilter === 'all' || (s.assigned_family_ids && s.assigned_family_ids.includes(selectedFamilyFilter));
    return matchesSearch && matchesFamily;
  });

  const handleExportExcel = () => {
    exportToExcel(
      'سجل_خدام_كنيسة_مارجرجس_سندبيس',
      'سجل الخدام والمشاركات',
      filteredServants.map(s => ({
        name: s.full_name,
        phone: s.phone,
        job: s.job_or_study || '—',
        confessionFather: s.confession_father || 'غير مسجل',
        families: (s.assigned_family_names || []).join('، '),
        activities: s.activities_count || 0,
        lessonPrep: s.lesson_prep_count || 0,
        lessonExplain: s.lesson_explain_count || 0,
        attendanceRate: `${s.attendance_rate || 100}%`,
      })),
      [
        { key: 'name', label: 'اسم الخادم' },
        { key: 'phone', label: 'رقم الهاتف' },
        { key: 'job', label: 'المهنة / الدراسة' },
        { key: 'confessionFather', label: 'أب الاعتراف' },
        { key: 'families', label: 'الأسر المكلف بها' },
        { key: 'activities', label: 'إجمالي الأنشطة' },
        { key: 'lessonPrep', label: 'تحضير درس' },
        { key: 'lessonExplain', label: 'شرح درس' },
        { key: 'attendanceRate', label: 'نسبة الحضور' },
      ]
    );
  };

  const handleExportPDF = () => {
    exportToPrintablePDF(
      'سجل خدام كنيسة الشهيد العظيم مارجرجس بسندبيس',
      'بيان مشاركات الخدام في الأنشطة والدروس — العام الكنسي 2026–2027',
      ['اسم الخادم', 'الهاتف', 'أب الاعتراف', 'الأسر المكلف بها', 'أنشطة منفذة', 'تحضير درس', 'شرح درس', 'نسبة الحضور'],
      filteredServants.map(s => [
        s.full_name,
        s.phone,
        s.confession_father || 'غير مسجل',
        (s.assigned_family_names || []).join('، ') || '—',
        s.activities_count || 0,
        s.lesson_prep_count || 0,
        s.lesson_explain_count || 0,
        `${s.attendance_rate || 100}%`,
      ]),
      [
        { label: 'عدد الخدام المعروضين', value: filteredServants.length },
        { label: 'إجمالي الأنشطة المنفذة', value: filteredServants.reduce((acc, s) => acc + (s.activities_count || 0), 0) },
      ]
    );
  };

  const handleDeleteServant = async (srv: Servant) => {
    if (!confirm(`هل أنت متأكد من حذف الخادم (${srv.full_name}) نهائياً من المنظومة؟`)) return;
    try {
      const res = await fetch(`/api/servants?id=${srv.id}&actorRole=${currentRole}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.error || 'حدث خطأ أثناء الحذف');
      }
    } catch {
      alert('فشل الاتصال بالسيرفر');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#702C3B]"></span>
              <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                سجل الخدام ومتابعة المشاركات
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              متابعة مشاركات الخدام في اللقاءات، تحضير الدروس، الوسائل الإيضاحية، ونسب الحضور
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
            {canManageAllFamilies && (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة خادم جديد</span>
              </button>
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
                  value={selectedFamilyFilter}
                  onChange={(e) => setSelectedFamilyFilter(e.target.value)}
                  className="p-1.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-xs font-semibold focus:outline-none focus:border-[#702C3B]"
                >
                  <option value="all">كافة الأسر (10)</option>
                  {families.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </>
            ) : (
              <span className="px-3 py-1 rounded-lg bg-[#FAF5F6] text-xs font-bold text-[#702C3B] border border-[#EAE3E4]">
                🔒 خدام أسرتك المخصصة ({families[0]?.name || 'إعدادي بنين'})
              </span>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#81777A] absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم الخادم أو الهاتف..."
              className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:bg-white focus:outline-none focus:border-[#702C3B]"
            />
          </div>
        </div>

        {/* Servants Cards */}
        {filteredServants.length === 0 ? (
          <div className="bg-white rounded-3xl border border-[#EAE3E4] p-12 text-center space-y-3">
            <UserCheck className="w-10 h-10 text-[#702C3B] mx-auto opacity-70" />
            <h3 className="font-bold text-sm text-[#421923]">لا يوجد خدام مسجلون حالياً</h3>
            <p className="text-xs text-[#81777A] max-w-md mx-auto leading-relaxed">
              تم تطهير السجلات الوهمية بنجاح. بمجرد قيام الخدام بتقديم طلبات الانضمام واعتمادها من قبل إدارة المنظومة أو قدس أبونا الكاهن أو أمين الخدمة، ستظهر سجلاتهم هنا تلقائياً.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServants.map((srv) => (
            <div
              key={srv.id}
              className="bg-white rounded-2xl border border-[#EAE3E4] p-5 shadow-sm hover:border-[#702C3B]/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#702C3B]/10 text-[#702C3B] font-bold flex items-center justify-center text-sm border border-[#702C3B]/20">
                      {srv.full_name.substring(0, 1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#282326]">{srv.full_name}</h3>
                      <div className="text-[11px] text-[#81777A] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#702C3B]" />
                        <span>{srv.phone}</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    نشط
                  </span>
                </div>

                {/* Job & Families */}
                <div className="text-xs text-[#81777A] space-y-1 mb-3 pb-3 border-b border-[#EAE3E4]">
                  {srv.job_or_study && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-[#81777A]" />
                      <span>{srv.job_or_study}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>أب الاعتراف:</span>
                    <strong className="text-[#702C3B] font-semibold">{srv.confession_father || 'غير مسجل'}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-[#282326]">الأسرة:</span>
                    {(srv.assigned_family_names || []).map((fn, idx) => (
                      <span key={idx} className="px-1.5 py-0.2 rounded bg-[#FAF5F6] text-[#702C3B] border border-[#EAE3E4] text-[10px] font-medium">
                        {fn}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Performance Highlights */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                  <div className="p-2 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4]">
                    <span className="text-[10px] text-[#81777A] block">الأنشطة</span>
                    <span className="font-bold text-[#421923] text-sm">{srv.activities_count || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4]">
                    <span className="text-[10px] text-[#81777A] block">تحضير درس</span>
                    <span className="font-bold text-[#421923] text-sm">{srv.lesson_prep_count || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4]">
                    <span className="text-[10px] text-[#81777A] block">شرح درس</span>
                    <span className="font-bold text-[#421923] text-sm">{srv.lesson_explain_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#EAE3E4] flex items-center justify-between">
                <span className="text-[11px] text-[#81777A]">
                  حضور: <strong className="text-[#10B981]">{srv.attendance_rate || 100}%</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setViewingServant(srv)}
                    className="p-1.5 rounded-xl border border-[#EAE3E4] text-[#81777A] hover:bg-[#FAF5F6] hover:text-[#702C3B] transition-colors"
                    title="عرض السجل الكامل"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {canManageAllFamilies && (
                    <>
                      <button
                        onClick={() => openEditModal(srv)}
                        className="p-1.5 rounded-xl border border-[#EAE3E4] text-[#81777A] hover:bg-[#FAF5F6] hover:text-[#702C3B] transition-colors"
                        title="تعديل الخادم"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteServant(srv)}
                        className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                        title="حذف الخادم نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

        {/* Servant Details Modal */}
        {viewingServant && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#702C3B] text-white flex items-center justify-center font-bold text-sm">
                    {viewingServant.full_name.substring(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#421923]">{viewingServant.full_name}</h3>
                    <div className="text-xs text-[#81777A]">{viewingServant.phone}</div>
                  </div>
                </div>
                <button onClick={() => setViewingServant(null)} className="text-[#81777A] hover:text-[#282326]">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF5F6] rounded-xl border border-[#EAE3E4]">
                  <div>
                    <span className="text-[#81777A] block">المهنة / الدراسة:</span>
                    <span className="font-semibold text-[#282326]">{viewingServant.job_or_study || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[#81777A] block">تاريخ بدء الخدمة:</span>
                    <span className="font-semibold text-[#282326]">{viewingServant.joining_date}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#81777A] block">أب الاعتراف:</span>
                    <span className="font-semibold text-[#702C3B]">{viewingServant.confession_father || 'غير مسجل'}</span>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#EAE3E4]">
                  <div className="font-bold text-[#421923] mb-2">إحصائيات الأداء والمشاركات الفعلية:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-[#FAF5F6]">
                      <span className="text-[10px] text-[#81777A] block">الأنشطة</span>
                      <span className="font-bold text-[#702C3B]">{viewingServant.activities_count || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FAF5F6]">
                      <span className="text-[10px] text-[#81777A] block">إعداد درس</span>
                      <span className="font-bold text-[#702C3B]">{viewingServant.lesson_prep_count || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FAF5F6]">
                      <span className="text-[10px] text-[#81777A] block">شرح درس</span>
                      <span className="font-bold text-[#702C3B]">{viewingServant.lesson_explain_count || 0}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#FAF5F6]">
                      <span className="text-[10px] text-[#81777A] block">نسبة الحضور</span>
                      <span className="font-bold text-[#10B981]">{viewingServant.attendance_rate || 100}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EAE3E4] flex justify-end">
                <button
                  onClick={() => setViewingServant(null)}
                  className="px-4 py-2 rounded-xl bg-[#702C3B] text-white font-bold text-xs"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <h3 className="font-bold text-base text-[#421923]">
                  {editingServant ? 'تعديل بيانات الخادم' : 'إضافة خادم جديد'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-[#81777A] hover:text-[#282326]">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#282326] mb-1">الاسم بالكامل:</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="الاسم الثلاثي أو اللقب"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">رقم الهاتف:</label>
                    <input
                      type="text"
                      required
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="01234567890"
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">المهنة أو الدراسة:</label>
                    <input
                      type="text"
                      value={formJob}
                      onChange={(e) => setFormJob(e.target.value)}
                      placeholder="مهندس / طبيب / طالب"
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">الأسرة المكلف بالخدمة بها:</label>
                  <select
                    value={formFamilyIds[0] || 'fam-prep-boys'}
                    onChange={(e) => setFormFamilyIds([e.target.value])}
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  >
                    {families.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">أب الاعتراف:</label>
                  <input
                    type="text"
                    value={formConfession}
                    onChange={(e) => setFormConfession(e.target.value)}
                    placeholder="مثال: القمص / القس ..."
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE3E4]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-[#EAE3E4] text-[#81777A] font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-[#702C3B] text-white font-bold hover:bg-[#5A232F] shadow-sm"
                  >
                    {submitting ? 'جارٍ الحفظ...' : (editingServant ? 'حفظ التعديلات' : 'إضافة الخادم')}
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

