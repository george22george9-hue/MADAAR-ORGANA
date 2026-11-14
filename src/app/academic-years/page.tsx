'use client';

// ====================================================================
// ORGANA — Academic Years & Historical Archive (/academic-years)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { AcademicYear } from '@/types/organa';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Archive,
  GraduationCap,
  ShieldAlert
} from 'lucide-react';

export default function AcademicYearsPage() {
  const { currentRole, canManageUsers } = useAuth();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [name, setName] = useState('2027–2028');
  const [startDate, setStartDate] = useState('2027-09-01');
  const [endDate, setEndDate] = useState('2028-08-31');
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    fetch('/api/academic-years')
      .then(r => r.json())
      .then(res => {
        if (res.success) setYears(res.years);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleActivateYear = async (id: string) => {
    if (!confirm('هل أنت متأكد من تفعيل هذه السنة الكنسية؟ سيتم تحويل كافة الأسر والعمليات إليها مع الحفاظ على كافة السجلات السابقة.')) return;
    try {
      await fetch('/api/academic-years', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, actorRole: currentRole }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, start_date: startDate, end_date: endDate, actorRole: currentRole }),
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

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-5 h-5 text-[#702C3B]" />
              <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                السنوات الكنسية والأرشيف التاريخي
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              إدارة الأعوام الدراسية للخدمة، الترحيل السنوي، وأرشفة السجلات دون حذف أي بيانات سابقة
            </p>
          </div>

          {canManageUsers && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سنة كنسية جديدة</span>
            </button>
          )}
        </div>

        {/* Years List */}
        <div className="space-y-3">
          {years.map((y) => (
            <div
              key={y.id}
              className={`p-5 rounded-2xl border transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                y.is_active ? 'border-[#702C3B] shadow-sm bg-gradient-to-l from-white to-[#FAF5F6]' : 'border-[#EAE3E4]'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className="w-5 h-5 text-[#702C3B]" />
                  <h3 className="font-bold text-lg text-[#421923]">العام الكنسي: {y.name}</h3>
                  {y.is_active ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981] text-white">
                      السنة النشطة حالياً
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                      مؤرشفة
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#81777A] mt-1 flex items-center gap-4">
                  <span>تاريخ البدء: {y.start_date}</span>
                  <span>•</span>
                  <span>تاريخ الانتهاء: {y.end_date}</span>
                </div>
              </div>

              {!y.is_active && canManageUsers && (
                <button
                  onClick={() => handleActivateYear(y.id)}
                  className="px-4 py-2 rounded-xl border border-[#EAE3E4] text-[#702C3B] hover:bg-[#FAF5F6] text-xs font-bold transition-colors"
                >
                  تفعيل هذه السنة
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#EAE3E4] pb-3">
                <h3 className="font-bold text-base text-[#421923]">إضافة سنة كنسية جديدة</h3>
                <button onClick={() => setShowModal(false)} className="text-[#81777A]">✕</button>
              </div>

              <form onSubmit={handleCreateYear} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#282326] mb-1">مسمى السنة الكنسية:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="2027–2028"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">تاريخ البدء:</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#282326] mb-1">تاريخ الانتهاء:</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                    />
                  </div>
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
                    {submitting ? 'جارٍ الحفظ...' : 'حفظ السنة'}
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

