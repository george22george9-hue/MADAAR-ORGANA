'use client';

import React, { useState, useEffect } from 'react';
import { AcademicYear, Family, Servant, ServantAcademicAssignment } from '@/types/organa';
import { getStagesForFamily } from '@/lib/constants/stages';
import {
  UserCheck,
  Plus,
  Copy,
  GitCompare,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldAlert,
  ArrowRightLeft
} from 'lucide-react';

interface ServantAssignmentTabProps {
  years: AcademicYear[];
  families: Family[];
  servants: Servant[];
  canManage: boolean;
  onRefresh: () => void;
}

export function ServantAssignmentTab({
  years,
  families,
  servants,
  canManage,
  onRefresh,
}: ServantAssignmentTabProps) {
  const activeYear = years.find((y) => y.is_active);
  const [selectedYearId, setSelectedYearId] = useState<string>(activeYear?.id || '');
  const [assignments, setAssignments] = useState<ServantAcademicAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Add Assignment
  const [showAddModal, setShowAddModal] = useState(false);
  const [servantId, setServantId] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [stage, setStage] = useState('');
  const [roleInFamily, setRoleInFamily] = useState('خادم مسؤول');
  const [submitting, setSubmitting] = useState(false);

  // Modal Compare
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareFromYear, setCompareFromYear] = useState('');
  const [compareToYear, setCompareToYear] = useState('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  // Load assignments for selected year
  const loadAssignments = async (yearId: string) => {
    if (!yearId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/academic-years/servant-assignments?yearId=${yearId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تحميل توزيعة الخدام');
      }
      setAssignments(data.assignments || []);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل التوزيعة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedYearId) {
      loadAssignments(selectedYearId);
    }
  }, [selectedYearId]);

  // Copy from previous year
  const handleCopyFromPrevious = async () => {
    const previousYears = years.filter((y) => y.id !== selectedYearId);
    if (previousYears.length === 0) {
      alert('لا يوجد عام كنسي سابق متاح للنسخ منه');
      return;
    }
    const fromYear = previousYears[0];
    if (
      !confirm(
        `هل تريد نسخ توزيعة الخدام بالكامل من العام الكنسي (${fromYear.name}) إلى العام المحدد (${
          years.find((y) => y.id === selectedYearId)?.name
        })؟`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/academic-years/servant-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'copy',
          fromYearId: fromYear.id,
          toYearId: selectedYearId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل نسخ التوزيعة');
      }
      setSuccessMsg(data.message || 'تم نسخ التوزيعة بنجاح');
      loadAssignments(selectedYearId);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء النسخ');
    } finally {
      setLoading(false);
    }
  };

  // Add new assignment
  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servantId || !familyId) {
      setError('يرجى اختيار الخادم والأسرة');
      return;
    }

    const s = servants.find((x) => x.id === servantId);
    const f = families.find((x) => x.id === familyId);

    const newAssignment: ServantAcademicAssignment = {
      id: `saa-${servantId}-${selectedYearId}-${familyId}-${stage || 'gen'}`,
      servant_id: servantId,
      servant_name: s?.full_name || '',
      servant_phone: s?.phone || '',
      academic_year_id: selectedYearId,
      family_id: familyId,
      family_name: f?.name || '',
      stage: stage || null,
      role_in_family: roleInFamily,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Filter duplicates locally then save
    const updated = assignments.filter(
      (a) =>
        !(
          a.servant_id === servantId &&
          a.academic_year_id === selectedYearId &&
          a.family_id === familyId &&
          a.stage === (stage || null)
        )
    );
    updated.push(newAssignment);

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/academic-years/servant-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          academicYearId: selectedYearId,
          assignments: updated,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل حفظ التوزيعة');
      }
      setShowAddModal(false);
      setServantId('');
      setFamilyId('');
      setStage('');
      loadAssignments(selectedYearId);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ التوزيعة');
    } finally {
      setSubmitting(false);
    }
  };

  // Remove assignment
  const handleRemoveAssignment = async (id: string) => {
    if (!confirm('هل تريد إزالة هذا التعيين للخادم؟')) return;
    const updated = assignments.filter((a) => a.id !== id);
    try {
      await fetch('/api/academic-years/servant-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          academicYearId: selectedYearId,
          assignments: updated,
        }),
      });
      loadAssignments(selectedYearId);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ');
    }
  };

  // Run compare
  const handleRunCompare = async () => {
    if (!compareFromYear || !compareToYear) return;
    setComparing(true);
    try {
      const res = await fetch('/api/academic-years/servant-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'compare',
          fromYearId: compareFromYear,
          toYearId: compareToYear,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setComparisonResult(data.comparison);
      }
    } catch (err: any) {
      alert(err.message || 'خطأ أثناء المقارنة');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#421923] flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#702C3B]" />
            توزيع الخدام السنوي (Servant Academic Assignment)
          </h2>
          <p className="text-xs text-[#81777A] mt-1">
            توزيع الخدام على الفصول والمراحل وتحديد الأدوار (أمين أسرة، أمين مساعد، خادم مسؤول، خادم مساعد).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Year Selector */}
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[#EAE3E4] bg-white font-bold text-[#421923]"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                العام الكنسي: {y.name} {y.is_active ? '(النشط)' : ''}
              </option>
            ))}
          </select>

          {canManage && (
            <>
              <button
                onClick={handleCopyFromPrevious}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE3E4] text-[#702C3B] hover:bg-[#FAF5F6] text-xs font-bold transition-colors"
                title="نسخ التوزيعة من العام الكنسي السابق"
              >
                <Copy className="w-4 h-4" />
                <span>نسخ توزيعة العام السابق</span>
              </button>

              <button
                onClick={() => {
                  setCompareFromYear(years[1]?.id || years[0]?.id || '');
                  setCompareToYear(selectedYearId);
                  setShowCompareModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE3E4] text-purple-700 hover:bg-purple-50 text-xs font-bold transition-colors"
              >
                <GitCompare className="w-4 h-4" />
                <span>مقارنة التوزيعات</span>
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة خادم لفصل</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Assignments Table */}
      <div className="bg-white rounded-2xl border border-[#EAE3E4] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF5F6] text-[#702C3B] border-b border-[#EAE3E4]">
              <tr>
                <th className="py-3 px-4 font-bold">اسم الخادم</th>
                <th className="py-3 px-4 font-bold">الأسرة والقطاع</th>
                <th className="py-3 px-4 font-bold">المرحلة الدراسية</th>
                <th className="py-3 px-4 font-bold">الدور في الخدمة</th>
                <th className="py-3 px-4 font-bold">رقم الموبايل</th>
                {canManage && <th className="py-3 px-4 font-bold text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    لا توجد تعيينات مسجلة للخدام في هذا العام الكنسي حتى الآن
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#421923]">{a.servant_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-700">{a.family_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                        {a.stage || 'كافة المراحل (عام)'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#702C3B]">{a.role_in_family || 'خادم مسؤول'}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">{a.servant_phone || '—'}</td>
                    {canManage && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleRemoveAssignment(a.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="حذف التعيين"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Assignment */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4">
            <h3 className="text-base font-bold text-[#421923] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#702C3B]" />
              تعيين خادم لفصل / مرحلة
            </h3>

            <form onSubmit={handleAddAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1">الخادم</label>
                <select
                  required
                  value={servantId}
                  onChange={(e) => setServantId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">اختر الخادم...</option>
                  {servants.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.phone || 'بدون هاتف'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1">الأسرة والقطاع</label>
                <select
                  required
                  value={familyId}
                  onChange={(e) => {
                    setFamilyId(e.target.value);
                    setStage('');
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">اختر الأسرة...</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1">المرحلة الدراسية داخل الأسرة</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">كافة المراحل (عام بالأسرة)</option>
                  {getStagesForFamily(familyId).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1">الدور في الخدمة</label>
                <select
                  value={roleInFamily}
                  onChange={(e) => setRoleInFamily(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold"
                >
                  <option value="أمين أسرة">أمين أسرة</option>
                  <option value="أمين مساعد">أمين مساعد</option>
                  <option value="خادم مسؤول">خادم مسؤول</option>
                  <option value="خادم مساعد">خادم مساعد</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs rounded-xl bg-[#702C3B] text-white hover:bg-[#5A232F] font-bold disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ التعيين'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Compare Assignments */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4 max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#421923] flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-purple-700" />
              مقارنة توزيعات الخدام بين عامين كنسيين
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1">العام الأول (الأساس)</label>
                <select
                  value={compareFromYear}
                  onChange={(e) => setCompareFromYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1">العام الثاني (المقارن به)</label>
                <select
                  value={compareToYear}
                  onChange={(e) => setCompareToYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold"
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleRunCompare}
              disabled={comparing || !compareFromYear || !compareToYear}
              className="w-full py-2 px-4 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 disabled:opacity-50"
            >
              {comparing ? 'جاري التحليل والمقارنة...' : 'بدء المقارنة'}
            </button>

            {comparisonResult && (
              <div className="space-y-4 pt-3 border-t border-gray-100 text-xs">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-gray-500 text-[10px]">الثابتون</div>
                    <div className="text-base font-bold text-[#421923]">{comparisonResult.retained.length}</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-blue-700 text-[10px]">المنقولون</div>
                    <div className="text-base font-bold text-blue-900">{comparisonResult.moved.length}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-emerald-700 text-[10px]">الجدد</div>
                    <div className="text-base font-bold text-emerald-900">{comparisonResult.newServants.length}</div>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <div className="text-rose-700 text-[10px]">غير الموزعين</div>
                    <div className="text-base font-bold text-rose-900">{comparisonResult.unassigned.length}</div>
                  </div>
                </div>

                {/* Moved Servants */}
                {comparisonResult.moved.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-bold text-[#702C3B]">الخدام المنقولون بين المراحل:</div>
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                      {comparisonResult.moved.map((m: any, idx: number) => (
                        <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                          <span className="font-bold text-[#421923]">{m.servant_name}</span>
                          <span className="text-gray-500">
                            {m.from} <ArrowRightLeft className="w-3 h-3 inline mx-1 text-[#702C3B]" /> {m.to}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-2 text-xs rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
