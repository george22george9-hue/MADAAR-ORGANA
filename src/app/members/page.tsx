'use client';

// ====================================================================
// ORGANA — Served Members Management Module (/members)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { ServedMember, Family, Servant, MemberHistoryLog, MemberAcademicHistory } from '@/types/organa';
import {
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  FolderTree,
  UserCheck,
  FileSpreadsheet,
  Printer,
  Edit2,
  Eye,
  History,
  HeartHandshake,
  ArrowRightLeft,
  AlertTriangle,
  X,
  ChevronLeft,
  Trash2,
  MessageCircle,
  Cake,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPrintablePDF } from '@/lib/export/pdf';
import { getStagesForFamily, getStageBadgeStyle } from '@/lib/constants/stages';
import { getWhatsAppUrl, getPastoralVisitationMessage, getBirthdayGreetingMessage } from '@/lib/utils/whatsapp';
import { getBirthdayInfo } from '@/lib/utils/birthdays';
import { exportFridayAttendanceSheet } from '@/lib/export/attendance-sheet';

export default function MembersPage() {
  const { currentRole, canManageAllFamilies, assignedFamilyId } = useAuth();
  const [members, setMembers] = useState<ServedMember[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [servants, setServants] = useState<Servant[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [servantFilter, setServantFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [absenceFilter, setAbsenceFilter] = useState(false);
  const [birthdayFilter, setBirthdayFilter] = useState(false);

  // Modals & Drawers
  const [viewingMember, setViewingMember] = useState<ServedMember | null>(null);
  const [memberHistory, setMemberHistory] = useState<MemberHistoryLog[]>([]);
  const [academicHistory, setAcademicHistory] = useState<MemberAcademicHistory[]>([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'info' | 'history' | 'academic'>('info');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<ServedMember | null>(null);

  // Transfer modal
  const [transferringMember, setTransferringMember] = useState<ServedMember | null>(null);
  const [targetFamilyId, setTargetFamilyId] = useState('');
  const [targetStage, setTargetStage] = useState('عام');

  // Form State
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'male' | 'female'>('male');
  const [formDob, setFormDob] = useState('2013-05-15');
  const [formFamilyId, setFormFamilyId] = useState('fam-prep-boys');
  const [formStage, setFormStage] = useState('أولى إعدادي');
  const [formServantId, setFormServantId] = useState('');
  const [formGuardianName, setFormGuardianName] = useState('');
  const [formGuardianPhone, setFormGuardianPhone] = useState('');
  const [formGuardianRel, setFormGuardianRel] = useState('الأب');
  const [formAddress, setFormAddress] = useState('سندبيس');
  const [formConfessionFather, setFormConfessionFather] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId 
      ? `&userFamilyId=${assignedFamilyId}&familyId=${assignedFamilyId}` 
      : '';
    Promise.all([
      fetch(`/api/members?role=${currentRole}${famParam}`).then(r => r.json()),
      fetch(`/api/families?role=${currentRole}${famParam}`).then(r => r.json()),
      fetch(`/api/servants?role=${currentRole}${famParam}`).then(r => r.json()),
    ])
      .then(([mRes, fRes, sRes]) => {
        if (mRes.success) setMembers(mRes.members);
        if (fRes.success) setFamilies(fRes.families);
        if (sRes.success) setServants(sRes.servants);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [currentRole, assignedFamilyId]);

  const openViewDrawer = async (m: ServedMember) => {
    setViewingMember(m);
    setActiveHistoryTab('info');
    try {
      fetch(`/api/members?historyFor=${m.id}`)
        .then(r => r.json())
        .then(json => { if (json.success) setMemberHistory(json.history); });

      fetch(`/api/members/${m.id}/history`)
        .then(r => r.json())
        .then(json => { if (json.success) setAcademicHistory(json.history || []); });
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setEditingMember(null);
    setFormName('');
    setFormGender('male');
    setFormDob('2013-05-15');
    const initFamId = assignedFamilyId || 'fam-prep-boys';
    setFormFamilyId(initFamId);
    const targetFam = families.find(f => f.id === initFamId);
    const initStages = getStagesForFamily(initFamId, targetFam?.name, targetFam?.stages);
    setFormStage(initStages[0] || 'عام');
    setFormServantId('');
    setFormGuardianName('');
    setFormGuardianPhone('');
    setFormGuardianRel('الأب');
    setFormAddress('سندبيس');
    setFormConfessionFather('');
    setFormNotes('');
    setShowModal(true);
  };

  const openEditModal = (m: ServedMember) => {
    setEditingMember(m);
    setFormName(m.full_name);
    setFormGender(m.gender);
    setFormDob(m.birth_date);
    setFormFamilyId(m.current_family_id);
    setFormStage(m.stage || 'عام');
    setFormServantId(m.assigned_servant_id || '');
    setFormGuardianName(m.guardian_name);
    setFormGuardianPhone(m.guardian_phone);
    setFormGuardianRel(m.guardian_relationship || 'ولي أمر');
    setFormAddress(m.address || '');
    setFormConfessionFather(m.confession_father || '');
    setFormNotes(m.notes || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formGuardianName.trim() || !formGuardianPhone.trim()) return;
    setSubmitting(true);

    try {
      const url = '/api/members';
      const method = editingMember ? 'PUT' : 'POST';
      const body = {
        id: editingMember?.id,
        full_name: formName.trim(),
        gender: formGender,
        birth_date: formDob,
        stage: formStage,
        current_family_id: formFamilyId,
        assigned_servant_id: formServantId || null,
        guardian_name: formGuardianName.trim(),
        guardian_phone: formGuardianPhone.trim(),
        guardian_relationship: formGuardianRel,
        address: formAddress.trim(),
        confession_father: formConfessionFather.trim() || null,
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
      } else {
        alert(json.error || 'تعذر حفظ بيانات المخدوم. يرجى التأكد من ملء الحقول الإلزامية.');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ بالاتصال بالسيرفر أثناء حفظ المخدوم.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferringMember || !targetFamilyId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: transferringMember.id,
          current_family_id: targetFamilyId,
          stage: targetStage,
          actorRole: currentRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTransferringMember(null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFamObj = families.find(f => f.id === familyFilter);
  const availableFilterStages = familyFilter === 'all'
    ? Array.from(new Set(members.map(m => m.stage).filter(Boolean))) as string[]
    : getStagesForFamily(familyFilter, selectedFamObj?.name, selectedFamObj?.stages);

  const totalCount = members.length;
  const regularCount = members.filter(m => !m.consecutive_absences || m.consecutive_absences === 0).length;
  const criticalAbsenceCount = members.filter(m => (m.consecutive_absences || 0) >= 2).length;
  const birthdaysThisMonthCount = members.filter(m => {
    const info = getBirthdayInfo(m.birth_date);
    return Boolean(info?.isThisMonth);
  }).length;

  const filteredMembers = members.filter(m => {
    const matchesSearch = !search || 
      m.full_name.includes(search) || 
      m.code.toLowerCase().includes(search.toLowerCase()) || 
      (m.phone && m.phone.includes(search)) || 
      (m.guardian_phone && m.guardian_phone.includes(search));
    const matchesFamily = familyFilter === 'all' || m.current_family_id === familyFilter;
    const matchesServant = servantFilter === 'all' || m.assigned_servant_id === servantFilter;
    const matchesStage = stageFilter === 'all' || m.stage === stageFilter;
    const matchesAbsence = !absenceFilter || (m.consecutive_absences || 0) >= 2;
    const bdayInfo = getBirthdayInfo(m.birth_date);
    const matchesBirthday = !birthdayFilter || Boolean(bdayInfo?.isThisMonth);

    return matchesSearch && matchesFamily && matchesServant && matchesStage && matchesAbsence && matchesBirthday;
  });

  const handleExportExcel = () => {
    exportToExcel(
      'سجل_مخدومي_كنيسة_مارجرجس_سندبيس',
      'المخدومون',
      filteredMembers.map(m => ({
        code: m.code,
        name: m.full_name,
        stage: m.stage || 'عام',
        gender: m.gender === 'male' ? 'ذكر' : 'أنثى',
        dob: m.birth_date,
        family: m.current_family_name || '—',
        servant: m.assigned_servant_name || '—',
        confessionFather: m.confession_father || 'غير مسجل',
        guardian: m.guardian_name,
        phone: m.guardian_phone,
        address: m.address || '—',
        attendanceRate: `${m.attendance_rate || 0}%`,
      })),
      [
        { key: 'code', label: 'كود المخدوم' },
        { key: 'name', label: 'الاسم بالكامل' },
        { key: 'stage', label: 'المرحلة الدراسية' },
        { key: 'gender', label: 'النوع' },
        { key: 'dob', label: 'تاريخ الميلاد' },
        { key: 'family', label: 'الأسرة الحالية' },
        { key: 'servant', label: 'الخادم المسؤول' },
        { key: 'confessionFather', label: 'أب الاعتراف' },
        { key: 'guardian', label: 'ولي الأمر' },
        { key: 'phone', label: 'هاتف ولي الأمر' },
        { key: 'address', label: 'العنوان' },
        { key: 'attendanceRate', label: 'نسبة الحضور' },
      ]
    );
  };

  const handleExportPDF = () => {
    exportToPrintablePDF(
      'سجل مخدومي كنيسة الشهيد العظيم مارجرجس بسندبيس',
      'بيانات المخدومين وأولياء الأمور — العام الكنسي 2026–2027',
      ['الكود', 'الاسم بالكامل', 'المرحلة', 'الأسرة', 'الخادم المسؤول', 'أب الاعتراف', 'ولي الأمر', 'رقم الهاتف', 'نسبة الحضور'],
      filteredMembers.map(m => [
        m.code,
        m.full_name,
        m.stage || 'عام',
        m.current_family_name || '—',
        m.assigned_servant_name || '—',
        m.confession_father || 'غير مسجل',
        m.guardian_name,
        m.guardian_phone,
        `${m.attendance_rate || 0}%`,
      ]),
      [
        { label: 'عدد المخدومين المعروضين', value: filteredMembers.length },
      ]
    );
  };

  const handleDeleteMember = async (m: ServedMember) => {
    if (!confirm(`هل أنت متأكد من حذف المخدوم (${m.full_name}) نهائياً من سجلات الكنيسة؟`)) return;
    try {
      const res = await fetch(`/api/members?id=${m.id}&actorRole=${currentRole}`, { method: 'DELETE' });
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
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#702C3B]"></span>
              <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                قاعدة بيانات المخدومين
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              إدارة بيانات الأطفال والشباب، المتابعة الروحية، وسجل الانتقال بين الأسر
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const currentFamObj = families.find(f => f.id === familyFilter);
                exportFridayAttendanceSheet({
                  familyName: currentFamObj?.name || (familyFilter === 'all' ? 'كافة الأسر' : familyFilter),
                  stageName: stageFilter !== 'all' ? stageFilter : undefined,
                  members: filteredMembers,
                });
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900 hover:bg-amber-100 flex items-center gap-1.5 transition-colors shadow-xs active:scale-95"
              title="توليد وطباعة كشف حضور ورقي A4 للجمعة"
            >
              <Printer className="w-4 h-4 text-amber-800" />
              <span>كشف حضور ورقي للجمعة 📄</span>
            </button>
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
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل مخدوم جديد</span>
            </button>
          </div>
        </div>

        {/* Quick Pastoral Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div 
            onClick={() => { setAbsenceFilter(false); setBirthdayFilter(false); }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${!absenceFilter && !birthdayFilter ? 'bg-[#FAF5F6] border-[#702C3B]/40 ring-1 ring-[#702C3B]/30' : 'bg-white border-[#EAE3E4] hover:border-[#702C3B]/20'}`}
          >
            <div className="text-[11px] text-[#81777A] font-medium flex items-center justify-between">
              <span>إجمالي المخدومين</span>
              <Users className="w-4 h-4 text-[#702C3B]" />
            </div>
            <div className="text-xl font-bold text-[#421923] mt-1">{totalCount}</div>
            <div className="text-[10px] text-[#81777A] mt-0.5">عرض الكل بدون فلترة</div>
          </div>

          <div 
            className="p-3.5 rounded-2xl bg-white border border-[#EAE3E4]"
          >
            <div className="text-[11px] text-emerald-700 font-medium flex items-center justify-between">
              <span>المنتظمون بالخدمة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{regularCount}</div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">نسبة الحضور ممتازة</div>
          </div>

          <div 
            onClick={() => { setAbsenceFilter(prev => !prev); setBirthdayFilter(false); }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${absenceFilter ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40' : 'bg-white border-[#EAE3E4] hover:border-amber-300'}`}
          >
            <div className="text-[11px] text-amber-800 font-bold flex items-center justify-between">
              <span>حالات افتقاد عاجل</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-800 mt-1">{criticalAbsenceCount}</div>
            <div className="text-[10px] text-amber-700/80 mt-0.5">
              {absenceFilter ? '✓ مفعل (غياب 2+ أسابيع)' : 'اضغط للفلترة السريعة'}
            </div>
          </div>

          <div 
            onClick={() => { setBirthdayFilter(prev => !prev); setAbsenceFilter(false); }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${birthdayFilter ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/40' : 'bg-white border-[#EAE3E4] hover:border-rose-300'}`}
          >
            <div className="text-[11px] text-[#702C3B] font-bold flex items-center justify-between">
              <span>أعياد ميلاد هذا الشهر</span>
              <Cake className="w-4 h-4 text-[#702C3B]" />
            </div>
            <div className="text-xl font-bold text-[#702C3B] mt-1">{birthdaysThisMonthCount}</div>
            <div className="text-[10px] text-[#81777A] mt-0.5">
              {birthdayFilter ? '✓ مفعل (مواليد هذا الشهر)' : 'اضغط لتهنئتهم واتساب 🎂'}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-4 border border-[#EAE3E4] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {canManageAllFamilies && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-[#81777A]">الأسرة:</span>
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
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-[#81777A]">الخادم المسؤول:</span>
              <select
                value={servantFilter}
                onChange={(e) => setServantFilter(e.target.value)}
                className="p-1.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-xs font-semibold focus:outline-none focus:border-[#702C3B]"
              >
                <option value="all">كافة الخدام</option>
                {servants.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>

            {/* Stage Filter */}
            {availableFilterStages.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold text-[#81777A]">المرحلة:</span>
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="p-1.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-xs font-semibold focus:outline-none focus:border-[#702C3B]"
                >
                  <option value="all">كافة المراحل</option>
                  {availableFilterStages.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#81777A] absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الكود أو الهاتف..."
              className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:bg-white focus:outline-none focus:border-[#702C3B]"
            />
          </div>
        </div>

        {/* Members Cards / Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-[#EAE3E4] p-5 shadow-sm hover:border-[#702C3B]/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#FAF5F6] text-[#702C3B] font-bold flex items-center justify-center text-xs border border-[#EAE3E4]">
                      {m.code.split('-')[1] || m.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-[#282326]">{m.full_name}</h3>
                        {m.stage && m.stage !== 'عام' && (() => {
                          const badge = getStageBadgeStyle(m.stage);
                          return (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                              {m.stage}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-[11px] text-[#81777A]">{m.current_family_name}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {(m.consecutive_absences || 0) > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        غياب {m.consecutive_absences} أسابيع
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        منتظم
                      </span>
                    )}
                    {m.confession_warning && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 animate-pulse" title="لم يعترف منذ 4 أسابيع متتالية">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        لم يعترف (4 أسابيع)
                      </span>
                    )}
                    {(() => {
                      const bday = getBirthdayInfo(m.birth_date);
                      if (!bday) return null;
                      if (bday.isToday) {
                        return (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1">
                            <Cake className="w-3 h-3 text-amber-800" />
                            عيد ميلاده اليوم ({bday.turningAge} سنة)! 🎉
                          </span>
                        );
                      }
                      if (bday.daysRemaining <= 14) {
                        return (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                            <Cake className="w-3 h-3 text-rose-600" />
                            عيد ميلاده بعد {bday.daysRemaining} يوم ({bday.formattedDate})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Live Attendance Progress & Spiritual Followup */}
                <div className="bg-[#FAF5F6] p-2.5 rounded-xl border border-[#EAE3E4] my-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#421923] flex items-center gap-1">
                      <span>نسبة الحضور:</span>
                      <span className={`font-extrabold ${
                        (m.attendance_rate || 0) >= 75 ? 'text-emerald-700' :
                        (m.attendance_rate || 0) >= 50 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {m.attendance_rate || 0}%
                      </span>
                    </span>
                    <span className="text-[10px] text-[#81777A]">
                      ({m.present_count || m.total_attendances || 0} حضور من {m.total_recorded || 0} لقاء)
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (m.attendance_rate || 0) >= 75 ? 'bg-emerald-600' :
                        (m.attendance_rate || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, m.attendance_rate || 0)}%` }}
                    />
                  </div>

                  {/* Quick Spiritual Metrics Pills */}
                  <div className="flex items-center justify-between text-[10px] text-[#81777A] pt-1">
                    <span className="flex items-center gap-0.5">
                      <span>⛪ قداس:</span>
                      <strong className="text-[#421923]">{m.liturgy_count || 0}</strong>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span>🍷 تناول:</span>
                      <strong className="text-[#421923]">{m.communion_count || 0}</strong>
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span>✝️ اعتراف:</span>
                      <strong className="text-[#702C3B]">{m.confession_count || 0}</strong>
                    </span>
                    {m.last_attendance_date && (
                      <span className="text-[9px] text-gray-500">
                        آخر حضور: {String(m.last_attendance_date).split('T')[0]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-[#81777A] space-y-1.5 my-3 pb-3 border-b border-[#EAE3E4]">
                  <div className="flex items-center justify-between">
                    <span>الخادم المسؤول:</span>
                    <strong className="text-[#282326]">{m.assigned_servant_name || 'غير محدد'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>أب الاعتراف:</span>
                    <strong className="text-[#702C3B] font-semibold">{m.confession_father || 'غير مسجل'}</strong>
                  </div>
                  {m.phone && (
                    <div className="flex items-center justify-between">
                      <span>هاتف المخدوم:</span>
                      <a href={`tel:${m.phone}`} className="text-[#702C3B] font-bold hover:underline flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{m.phone}</span>
                      </a>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>ولي الأمر ({m.guardian_relationship}):</span>
                    <strong className="text-[#282326]">{m.guardian_name}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>هاتف ولي الأمر:</span>
                    <a href={`tel:${m.guardian_phone}`} className="text-[#702C3B] font-bold hover:underline flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{m.guardian_phone}</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EAE3E4] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* WhatsApp Pastoral / Birthday Action */}
                  {(() => {
                    const targetPhone = (m.guardian_phone && m.guardian_phone !== '—' && m.guardian_phone.length >= 8)
                      ? m.guardian_phone
                      : m.phone;
                    const bday = getBirthdayInfo(m.birth_date);
                    const isBdayNow = bday && (bday.isToday || bday.daysRemaining <= 3);
                    const msg = isBdayNow
                      ? getBirthdayGreetingMessage(m.full_name)
                      : getPastoralVisitationMessage(m.full_name, m.current_family_name, m.consecutive_absences || 0);
                    const waUrl = getWhatsAppUrl(targetPhone, msg);

                    if (!waUrl) return null;
                    return (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-3 py-1.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                          isBdayNow ? 'bg-amber-600 hover:bg-amber-700 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                        title={isBdayNow ? 'إرسال تهنئة عيد الميلاد عبر واتساب' : 'إرسال رسالة افتقاد بالواتساب'}
                      >
                        {isBdayNow ? <Cake className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                        <span>{isBdayNow ? 'تهنئة واتساب 🎂' : 'افتقاد واتساب'}</span>
                      </a>
                    );
                  })()}

                  <a
                    href={`tel:${m.guardian_phone && m.guardian_phone !== '—' ? m.guardian_phone : m.phone}`}
                    className="p-2 rounded-xl border border-[#EAE3E4] text-[#81777A] hover:bg-[#FAF5F6] hover:text-[#702C3B] transition-colors"
                    title="اتصال هاتفي"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="flex items-center gap-1.5">
                  {canManageAllFamilies && (
                    <button
                      onClick={() => {
                        setTransferringMember(m);
                        setTargetFamilyId(m.current_family_id);
                      }}
                      className="p-2 rounded-xl border border-[#EAE3E4] text-[#81777A] hover:bg-[#FAF5F6] hover:text-[#702C3B]"
                      title="نقل لأسرة أخرى"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(m)}
                    className="p-2 rounded-xl border border-[#EAE3E4] text-[#81777A] hover:bg-[#FAF5F6] hover:text-[#702C3B]"
                    title="تعديل البيانات"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {canManageAllFamilies && (
                    <button
                      onClick={() => handleDeleteMember(m)}
                      className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title="حذف المخدوم نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => openViewDrawer(m)}
                    className="px-3 py-2 rounded-xl bg-[#FAF5F6] hover:bg-[#F0E4E7] text-[#702C3B] text-xs font-bold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>التفاصيل</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Member Profile & Historical Drawer Modal */}
        {viewingMember && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#702C3B] text-white flex items-center justify-center font-bold text-xs">
                    {viewingMember.code}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#421923]">{viewingMember.full_name}</h3>
                    <div className="text-xs text-[#81777A]">{viewingMember.current_family_name}</div>
                  </div>
                </div>
                <button onClick={() => setViewingMember(null)} className="text-[#81777A] hover:text-[#282326]">✕</button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-[#EAE3E4] pb-2 text-xs">
                <button
                  onClick={() => setActiveHistoryTab('info')}
                  className={`pb-1 px-3 font-bold transition-colors ${
                    activeHistoryTab === 'info' ? 'border-b-2 border-[#702C3B] text-[#702C3B]' : 'text-[#81777A]'
                  }`}
                >
                  البيانات والافتقاد
                </button>
                <button
                  onClick={() => setActiveHistoryTab('academic')}
                  className={`pb-1 px-3 font-bold transition-colors flex items-center gap-1 ${
                    activeHistoryTab === 'academic' ? 'border-b-2 border-[#702C3B] text-[#702C3B]' : 'text-[#81777A]'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>الأعوام الكنسية ({academicHistory.length})</span>
                </button>
                <button
                  onClick={() => setActiveHistoryTab('history')}
                  className={`pb-1 px-3 font-bold transition-colors flex items-center gap-1 ${
                    activeHistoryTab === 'history' ? 'border-b-2 border-[#702C3B] text-[#702C3B]' : 'text-[#81777A]'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>سجل التنقلات ({memberHistory.length})</span>
                </button>
              </div>

              {activeHistoryTab === 'info' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF5F6] rounded-xl border border-[#EAE3E4]">
                    <div>
                      <span className="text-[#81777A] block">تاريخ الميلاد:</span>
                      <span className="font-semibold text-[#282326]">{viewingMember.birth_date}</span>
                    </div>
                    <div>
                      <span className="text-[#81777A] block">الخادم المسؤول:</span>
                      <span className="font-semibold text-[#282326]">{viewingMember.assigned_servant_name || 'غير محدد'}</span>
                    </div>
                    <div>
                      <span className="text-[#81777A] block">أب الاعتراف:</span>
                      <span className="font-semibold text-[#702C3B]">{viewingMember.confession_father || 'غير مسجل'}</span>
                    </div>
                    <div>
                      <span className="text-[#81777A] block">حالة الاعتراف:</span>
                      <span className={`font-semibold ${viewingMember.confession_warning ? 'text-red-600 font-bold' : 'text-emerald-700'}`}>
                        {viewingMember.confession_warning ? '⚠️ لم يعترف منذ 4 أسابيع' : 'منتظم / متابع'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#81777A] block">ولي الأمر:</span>
                      <span className="font-semibold text-[#282326]">{viewingMember.guardian_name} ({viewingMember.guardian_relationship})</span>
                    </div>
                    <div>
                      <span className="text-[#81777A] block">هاتف ولي الأمر:</span>
                      <span className="font-semibold text-[#702C3B]">{viewingMember.guardian_phone}</span>
                    </div>
                  </div>

                  {/* Live Attendance & Spiritual Stats Breakdown */}
                  <div className="p-3 bg-[#FAF5F6] rounded-xl border border-[#EAE3E4] space-y-2">
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="text-[#421923]">سجل الانضباط ونسبة الحضور:</span>
                      <span className={`text-sm ${
                        (viewingMember.attendance_rate || 0) >= 75 ? 'text-emerald-700 font-extrabold' :
                        (viewingMember.attendance_rate || 0) >= 50 ? 'text-amber-700 font-bold' : 'text-rose-700 font-bold'
                      }`}>
                        {viewingMember.attendance_rate || 0}%
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (viewingMember.attendance_rate || 0) >= 75 ? 'bg-emerald-600' :
                          (viewingMember.attendance_rate || 0) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, viewingMember.attendance_rate || 0)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center pt-1 text-[11px]">
                      <div className="bg-white p-1.5 rounded-lg border border-[#EAE3E4]">
                        <span className="text-gray-500 block text-[10px]">حضور</span>
                        <strong className="text-emerald-700 text-xs">{viewingMember.present_count || viewingMember.total_attendances || 0}</strong>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-[#EAE3E4]">
                        <span className="text-gray-500 block text-[10px]">غياب</span>
                        <strong className="text-rose-700 text-xs">{viewingMember.absent_count || 0}</strong>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-[#EAE3E4]">
                        <span className="text-gray-500 block text-[10px]">قداس</span>
                        <strong className="text-[#421923] text-xs">{viewingMember.liturgy_count || 0}</strong>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-[#EAE3E4]">
                        <span className="text-gray-500 block text-[10px]">تناول</span>
                        <strong className="text-purple-700 text-xs">{viewingMember.communion_count || 0}</strong>
                      </div>
                    </div>

                    {viewingMember.last_attendance_date && (
                      <div className="text-[10px] text-gray-500 text-center pt-0.5">
                        آخر حضور مسجل: {String(viewingMember.last_attendance_date).split('T')[0]} ({viewingMember.last_attendance_status === 'present' ? 'حاضر ✓' : viewingMember.last_attendance_status || 'مسجل'})
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-[#EAE3E4]">
                    <span className="text-[#81777A] block mb-1">العنوان والمقر:</span>
                    <span className="text-[#282326] font-medium">{viewingMember.address || 'سندبيس'}</span>
                  </div>
                </div>
              )}

              {activeHistoryTab === 'academic' && (
                <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
                  {academicHistory.length === 0 ? (
                    <div className="text-center py-6 text-[#81777A]">لا يوجد سجل أعوام كنسية سابقة</div>
                  ) : (
                    academicHistory.map((ah) => (
                      <div key={ah.id} className="p-3 bg-[#FAF5F6] rounded-xl border border-[#EAE3E4] space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#702C3B] flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5" />
                            العام الكنسي: {ah.academic_year_name}
                          </span>
                          <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-[#702C3B]">
                            {ah.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-700 flex items-center justify-between">
                          <span>{ah.family_name} • {ah.stage || 'عام'}</span>
                          <span className="font-medium text-gray-500">الخادم: {ah.servant_name || 'غير محدد'}</span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          الحالة: <span className="font-semibold text-emerald-700">{ah.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeHistoryTab === 'history' && (
                <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                  {memberHistory.length === 0 ? (
                    <div className="text-center py-6 text-[#81777A]">لا يوجد سجل تنقلات سابقة</div>
                  ) : (
                    memberHistory.map((h) => (
                      <div key={h.id} className="p-3 bg-[#FAF5F6] rounded-xl border border-[#EAE3E4]">
                        <div className="flex items-center justify-between text-[10px] text-[#81777A] mb-1">
                          <span className="font-bold text-[#702C3B]">
                            {h.event_type === 'family_transfer' ? 'نقل بين الأسر' : (h.event_type === 'servant_assignment' ? 'إسناد لخادم' : 'تسجيل')}
                          </span>
                          <span>{new Date(h.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <div className="text-[#282326] font-medium">{h.description}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-[#EAE3E4] flex justify-end">
                <button
                  onClick={() => setViewingMember(null)}
                  className="px-4 py-2 rounded-xl bg-[#702C3B] text-white font-bold text-xs"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Family Modal */}
        {transferringMember && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in fade-in">
              <div className="border-b border-[#EAE3E4] pb-3">
                <h3 className="font-bold text-base text-[#421923]">نقل مخدوم لأسرة أخرى</h3>
                <div className="text-xs text-[#81777A] mt-0.5">
                  المخدوم: {transferringMember.full_name} ({transferringMember.code})
                </div>
              </div>

              <div className="text-xs space-y-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  سيتم حفظ سجل النقل بالكامل في الأرشيف التاريخي ولن يتم مسح أي سجلات حضور سابقة.
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">اختر الأسرة الجديدة:</label>
                  <select
                    value={targetFamilyId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setTargetFamilyId(newId);
                      const tf = families.find(f => f.id === newId);
                      const stages = getStagesForFamily(newId, tf?.name, tf?.stages);
                      setTargetStage(stages[0] || 'عام');
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  >
                    {families.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">المرحلة داخل الأسرة الجديدة:</label>
                  <select
                    value={targetStage}
                    onChange={(e) => setTargetStage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] font-bold text-[#702C3B]"
                  >
                    {(() => {
                      const tf = families.find(f => f.id === targetFamilyId);
                      const stages = getStagesForFamily(targetFamilyId, tf?.name, tf?.stages);
                      return stages.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EAE3E4]">
                <button
                  onClick={() => setTransferringMember(null)}
                  className="px-4 py-2 rounded-xl border border-[#EAE3E4] text-[#81777A] text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleTransferSubmit}
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F]"
                >
                  {submitting ? 'جارٍ النقل...' : 'تأكيد النقل'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Member Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <h3 className="font-bold text-base text-[#421923]">
                  {editingMember ? 'تعديل بيانات المخدوم' : 'تسجيل مخدوم جديد'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-[#81777A] hover:text-[#282326]">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#282326] mb-1">اسم المخدوم بالكامل:</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: ديفيد أيمن فريد"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">النوع:</label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    >
                      <option value="male">ولد (بنين)</option>
                      <option value="female">بنت (بنات)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">تاريخ الميلاد:</label>
                    <input
                      type="date"
                      required
                      value={formDob}
                      onChange={(e) => setFormDob(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">الأسرة الكنسية:</label>
                    <select
                      value={formFamilyId}
                      onChange={(e) => {
                        const newFamId = e.target.value;
                        setFormFamilyId(newFamId);
                        const fObj = families.find(f => f.id === newFamId);
                        const stages = getStagesForFamily(newFamId, fObj?.name, fObj?.stages);
                        const newStage = stages[0] || 'عام';
                        setFormStage(newStage);

                        // Auto-drop servant according to stage
                        const matchServant = servants.find(s => 
                          (s.assigned_stage === newStage) &&
                          (s.assigned_family_ids?.includes(newFamId) || (s as any).family_id === newFamId)
                        );
                        if (matchServant) {
                          setFormServantId(matchServant.id);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    >
                      {families.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">المرحلة الدراسية بالفصل:</label>
                    <select
                      value={formStage}
                      onChange={(e) => {
                        const newStage = e.target.value;
                        setFormStage(newStage);

                        // Auto-drop servant according to stage
                        const matchServant = servants.find(s => 
                          (s.assigned_stage === newStage) &&
                          (s.assigned_family_ids?.includes(formFamilyId) || (s as any).family_id === formFamilyId)
                        );
                        if (matchServant) {
                          setFormServantId(matchServant.id);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] font-bold text-[#702C3B]"
                    >
                      {(() => {
                        const fObj = families.find(f => f.id === formFamilyId);
                        const stages = getStagesForFamily(formFamilyId, fObj?.name, fObj?.stages);
                        return stages.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">
                    الخادم المسؤول <span className="text-[#81777A] font-normal">(يتحدد تلقائياً حسب المرحلة):</span>
                  </label>
                  <select
                    value={formServantId}
                    onChange={(e) => setFormServantId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  >
                    <option value="">(تلقائي حسب المرحلة / يحدد لاحقاً)</option>
                    {servants.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} {s.assigned_stage ? `— [خادم ${s.assigned_stage}]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">اسم ولي الأمر:</label>
                    <input
                      type="text"
                      required
                      value={formGuardianName}
                      onChange={(e) => setFormGuardianName(e.target.value)}
                      placeholder="مثال: أيمن فريد"
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">رقم هاتف ولي الأمر:</label>
                    <input
                      type="text"
                      required
                      value={formGuardianPhone}
                      onChange={(e) => setFormGuardianPhone(e.target.value)}
                      placeholder="01234567890"
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">العنوان أو مكان الإقامة:</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="سندبيس - بجوار..."
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">أب الاعتراف (مهم للمتابعة الروحية):</label>
                  <input
                    type="text"
                    value={formConfessionFather}
                    onChange={(e) => setFormConfessionFather(e.target.value)}
                    placeholder="مثال: أبونا بيشوي / أبونا بطرس..."
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
                    className="px-5 py-2 rounded-xl bg-[#702C3B] text-white font-bold hover:bg-[#5A232F]"
                  >
                    {submitting ? 'جارٍ الحفظ...' : (editingMember ? 'حفظ التعديلات' : 'تسجيل المخدوم')}
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
