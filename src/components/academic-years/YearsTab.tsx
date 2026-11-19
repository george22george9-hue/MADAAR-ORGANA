'use client';

import React, { useState } from 'react';
import { AcademicYear } from '@/types/organa';
import { CalendarDays, Plus, GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';

interface YearsTabProps {
  years: AcademicYear[];
  canManage: boolean;
  onRefresh: () => void;
}

export function YearsTab({ years, canManage, onRefresh }: YearsTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleActivate = async (year: AcademicYear) => {
    if (
      !confirm(
        `هل أنت متأكد من تفعيل العام الكنسي (${year.name})؟\nسيتم جعل هذه السنة هي النشطة في النظام مع الحفاظ التام على السجلات السابقة.`
      )
    ) {
      return;
    }

    setActivatingId(year.id);
    setError(null);
    try {
      const res = await fetch('/api/academic-years', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: year.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تفعيل العام الكنسي');
      }
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التفعيل');
    } finally {
      setActivatingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل إنشاء العام الكنسي');
      }
      setShowModal(false);
      setName('');
      setStartDate('');
      setEndDate('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إنشاء العام الكنسي');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#EAE3E4] shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[#421923] flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#702C3B]" />
            الأعوام الكنسية المسجلة
          </h2>
          <p className="text-xs text-[#81777A] mt-1">
            إدارة فترات الخدمة والسنوات الكنسية. سنة واحدة فقط تكون نشطة في نفس الوقت لكل الأسر.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء سنة دراسية جديدة</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Years Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {years.map((year) => (
          <div
            key={year.id}
            className={`p-5 rounded-2xl border transition-all bg-white relative flex flex-col justify-between gap-4 ${
              year.is_active
                ? 'border-[#702C3B] ring-2 ring-[#702C3B]/10 shadow-sm bg-gradient-to-br from-white to-[#FAF5F6]'
                : 'border-[#EAE3E4] hover:border-gray-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      year.is_active ? 'bg-[#702C3B] text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#421923]">{year.name}</h3>
                    <p className="text-[11px] text-[#81777A]">ID: {year.id}</p>
                  </div>
                </div>

                {year.is_active ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#10B981]/10 text-[#059669] border border-[#10B981]/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    السنة النشطة
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    سنة سابقة / أرشيف
                  </span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-[#554B4F] space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">تاريخ البداية:</span>
                  <span className="font-medium font-mono">{year.start_date || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">تاريخ النهاية:</span>
                  <span className="font-medium font-mono">{year.end_date || 'غير محدد'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              {!year.is_active && canManage && (
                <button
                  disabled={activatingId === year.id}
                  onClick={() => handleActivate(year)}
                  className="w-full py-2 px-3 rounded-xl border border-[#702C3B] text-[#702C3B] hover:bg-[#702C3B] hover:text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {activatingId === year.id ? 'جاري التفعيل...' : 'تفعيل هذه السنة وجعلها نشطة'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create Year */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4">
            <h3 className="text-base font-bold text-[#421923] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#702C3B]" />
              إنشاء سنة كنسية جديدة
            </h3>
            <p className="text-xs text-[#81777A]">
              حدد اسم العام الكنسي (مثال: 2027–2028) وتواريخ البدء والانتهاء. لن تصبح نشطة حتى تقرر اعتمادها.
            </p>

            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1">اسم العام الكنسي</label>
                <input
                  type="text"
                  required
                  placeholder="2027–2028"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#421923] mb-1">تاريخ البدء</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#421923] mb-1">تاريخ النهاية</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs rounded-xl bg-[#702C3B] text-white hover:bg-[#5A232F] font-bold disabled:opacity-50"
                >
                  {submitting ? 'جاري الإنشاء...' : 'حفظ السنة الجديدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
