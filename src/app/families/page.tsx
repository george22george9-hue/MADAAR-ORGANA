'use client';

// ====================================================================
// ORGANA — Families & Sunday School Classes Management (/families)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { Family, FamilyType } from '@/types/organa';
import {
  FolderTree,
  Users,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Search,
  FileSpreadsheet,
  Printer,
  Edit2,
  ChevronLeft,
  Filter
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPrintablePDF } from '@/lib/export/pdf';

export default function FamiliesPage() {
  const { currentRole, canManageAllFamilies, assignedFamilyId } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | FamilyType>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<FamilyType>('children_class');
  const [formDay, setFormDay] = useState('Friday');
  const [formTime, setFormTime] = useState('17:00');
  const [formLocation, setFormLocation] = useState('');
  const [formColor, setFormColor] = useState('#702C3B');
  const [submitting, setSubmitting] = useState(false);

  const loadFamilies = () => {
    const famParam = (currentRole === 'family_leader' || currentRole === 'servant') && assignedFamilyId
      ? `&userFamilyId=${assignedFamilyId}`
      : '';
    fetch(`/api/families?role=${currentRole}${famParam}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setFamilies(res.families);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadFamilies();
  }, [currentRole, assignedFamilyId]);

  const openCreateModal = () => {
    setEditingFamily(null);
    setFormName('');
    setFormType('children_class');
    setFormDay('Friday');
    setFormTime('17:00');
    setFormLocation('مبنى الخدمات');
    setFormColor('#702C3B');
    setShowModal(true);
  };

  const openEditModal = (fam: Family) => {
    setEditingFamily(fam);
    setFormName(fam.name);
    setFormType(fam.type);
    setFormDay(fam.meeting_day || 'Friday');
    setFormTime(fam.meeting_time || '17:00');
    setFormLocation(fam.location || '');
    setFormColor(fam.color_code || '#702C3B');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);

    try {
      const url = '/api/families';
      const method = editingFamily ? 'PUT' : 'POST';
      const body = {
        id: editingFamily?.id,
        name: formName.trim(),
        type: formType,
        meeting_day: formDay,
        meeting_time: formTime,
        location: formLocation.trim(),
        color_code: formColor,
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
        loadFamilies();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFamilies = families.filter(f => {
    const matchesTab = activeTab === 'all' || f.type === activeTab;
    const matchesSearch = !search || f.name.includes(search) || (f.leader_name && f.leader_name.includes(search));
    return matchesTab && matchesSearch;
  });

  const handleExportExcel = () => {
    exportToExcel(
      'أسر_وقطاعات_خدمة_مارجرجس_سندبيس',
      'الأسر والقطاعات',
      filteredFamilies.map(f => ({
        name: f.name,
        type: f.type === 'children_class' ? 'فصل أطفال' : (f.type === 'servants_group' ? 'مجموعة خدام' : 'أسرة عائلات'),
        leader: f.leader_name || 'لم يحدد',
        members: f.members_count || 0,
        servants: f.servants_count || 0,
        day: f.meeting_day === 'Friday' ? 'الجمعة' : f.meeting_day,
        time: f.meeting_time || '—',
        loc: f.location || '—',
      })),
      [
        { key: 'name', label: 'اسم الأسرة / الفصل' },
        { key: 'type', label: 'نوع الأسرة' },
        { key: 'leader', label: 'أمين الأسرة' },
        { key: 'members', label: 'عدد المخدومين' },
        { key: 'servants', label: 'عدد الخدام' },
        { key: 'day', label: 'يوم اللقاء' },
        { key: 'time', label: 'الموعد' },
        { key: 'loc', label: 'المقر' },
      ]
    );
  };

  const handleExportPDF = () => {
    exportToPrintablePDF(
      'بيان الأسر والقطاعات الكنسية',
      'كنيسة الشهيد العظيم مارجرجس بسندبيس — العام الكنسي 2026–2027',
      ['اسم الأسرة', 'النوع', 'أمين الأسرة', 'المخدومين', 'الخدام', 'الموعد والمقر'],
      filteredFamilies.map(f => [
        f.name,
        f.type === 'children_class' ? 'فصل أطفال' : (f.type === 'servants_group' ? 'خدام' : 'عائلات'),
        f.leader_name || '—',
        f.members_count || 0,
        f.servants_count || 0,
        `${f.meeting_day === 'Friday' ? 'الجمعة' : f.meeting_day} ${f.meeting_time || ''} (${f.location || ''})`,
      ]),
      [
        { label: 'إجمالي الأسر المعروضة', value: filteredFamilies.length },
        { label: 'إجمالي المخدومين', value: filteredFamilies.reduce((acc, f) => acc + (f.members_count || 0), 0) },
        { label: 'إجمالي الخدام', value: filteredFamilies.reduce((acc, f) => acc + (f.servants_count || 0), 0) },
      ]
    );
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
                الأسر والقطاعات الكنسية
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              إدارة فصول مدارس الأحد ومجموعات الخدام وأسر العائلات (10 أسر رئيسية)
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
                <span>إضافة أسرة جديدة</span>
              </button>
            )}
          </div>
        </div>

        {!canManageAllFamilies && (
          <div className="p-3.5 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4] text-[#702C3B] text-xs flex items-center justify-between gap-2">
            <span className="font-semibold">
              🔒 <strong>نظام حماية وعزل البيانات:</strong> تقتصر رؤية البيانات واللقاءات والمخدومين حصرياً على أسرتك المكلف بها طبقاً لسياسات الخدمة الكنسية.
            </span>
          </div>
        )}

        {/* Filter Tabs & Search */}
        <div className="bg-white rounded-2xl p-4 border border-[#EAE3E4] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-[#702C3B] text-white shadow-sm'
                  : 'bg-[#FAF5F6] text-[#81777A] hover:text-[#282326]'
              }`}
            >
              الكل ({families.length})
            </button>
            <button
              onClick={() => setActiveTab('children_class')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'children_class'
                  ? 'bg-[#702C3B] text-white shadow-sm'
                  : 'bg-[#FAF5F6] text-[#81777A] hover:text-[#282326]'
              }`}
            >
              فصول الأطفال (7)
            </button>
            <button
              onClick={() => setActiveTab('servants_group')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'servants_group'
                  ? 'bg-[#702C3B] text-white shadow-sm'
                  : 'bg-[#FAF5F6] text-[#81777A] hover:text-[#282326]'
              }`}
            >
              مجموعات الخدام (2)
            </button>
            <button
              onClick={() => setActiveTab('family_group')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'family_group'
                  ? 'bg-[#702C3B] text-white shadow-sm'
                  : 'bg-[#FAF5F6] text-[#81777A] hover:text-[#282326]'
              }`}
            >
              أسر عائلات (1)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#81777A] absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم الأسرة أو الأمين..."
              className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:bg-white focus:outline-none focus:border-[#702C3B]"
            />
          </div>
        </div>

        {/* Families Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFamilies.map((fam) => (
            <div
              key={fam.id}
              className="bg-white rounded-2xl border border-[#EAE3E4] p-5 shadow-sm hover:border-[#702C3B]/50 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header of card */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: fam.color_code || '#702C3B' }}
                    />
                    <h3 className="font-bold text-base text-[#421923]">{fam.name}</h3>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5F6] text-[#702C3B] border border-[#EAE3E4]">
                    {fam.type === 'children_class' ? 'فصل أطفال' : (fam.type === 'servants_group' ? 'خدام' : 'عائلات')}
                  </span>
                </div>

                {/* Leader info */}
                <div className="text-xs text-[#81777A] mb-3 pb-3 border-b border-[#EAE3E4]">
                  <span className="font-semibold text-[#282326]">أمين الأسرة: </span>
                  <span>{fam.leader_name || 'غير محدد بعد'}</span>
                </div>

                {/* Meeting time & location */}
                <div className="space-y-1.5 text-xs text-[#81777A] mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#702C3B]" />
                    <span>يوم {fam.meeting_day === 'Friday' ? 'الجمعة' : fam.meeting_day} — الساعة {fam.meeting_time}</span>
                  </div>
                  {fam.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#702C3B]" />
                      <span>{fam.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom statistics & action */}
              <div className="pt-3 border-t border-[#EAE3E4] flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <span className="text-[#81777A] block text-[10px]">المخدومين</span>
                    <span className="font-bold text-[#421923] text-sm">{fam.members_count || 0}</span>
                  </div>
                  <div className="border-r border-[#EAE3E4] pr-3">
                    <span className="text-[#81777A] block text-[10px]">الخدام</span>
                    <span className="font-bold text-[#421923] text-sm">{fam.servants_count || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {canManageAllFamilies && (
                    <button
                      onClick={() => openEditModal(fam)}
                      className="p-1.5 rounded-xl border border-[#EAE3E4] text-[#81777A] hover:bg-[#FAF5F6] hover:text-[#702C3B] transition-colors"
                      title="تعديل الأسرة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Link
                    href={`/members?familyId=${fam.id}`}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF5F6] hover:bg-[#F0E4E7] text-[#702C3B] text-xs font-bold transition-colors flex items-center gap-1"
                  >
                    <span>المخدومين</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Create or Edit Family */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <h3 className="font-bold text-base text-[#421923]">
                  {editingFamily ? 'تعديل بيانات الأسرة' : 'إضافة أسرة كنسية جديدة'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-[#81777A] hover:text-[#282326]">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#282326] mb-1">اسم الأسرة أو الفصل:</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: إعدادي بنين"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">نوع الأسرة:</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as FamilyType)}
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  >
                    <option value="children_class">فصل مدارس أحد (أطفال/ابتدائي/إعدادي/ثانوي)</option>
                    <option value="servants_group">مجموعة خدام (خدام / إعداد خدام)</option>
                    <option value="family_group">أسرة عائلات (أسر / كبار)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">يوم اللقاء:</label>
                    <select
                      value={formDay}
                      onChange={(e) => setFormDay(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    >
                      <option value="Friday">الجمعة</option>
                      <option value="Sunday">الأحد</option>
                      <option value="Thursday">الخميس</option>
                      <option value="Tuesday">الثلاثاء</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">موعد اللقاء:</label>
                    <input
                      type="text"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      placeholder="17:00"
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#282326] mb-1">مقر اللقاء بالكنيسة:</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="مثال: مبنى الخدمات - قاعة مارجرجس"
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
                    {submitting ? 'جارٍ الحفظ...' : (editingFamily ? 'حفظ التعديلات' : 'إضافة الأسرة')}
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

