'use client';

import React, { useState } from 'react';
import { PromotionRule, Family } from '@/types/organa';
import { getStagesForFamily } from '@/lib/constants/stages';
import { ArrowLeft, Plus, Trash2, Sliders, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface RulesTabProps {
  rules: PromotionRule[];
  families: Family[];
  canManage: boolean;
  onRefresh: () => void;
}

export function RulesTab({ rules, families, canManage, onRefresh }: RulesTabProps) {
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fromFamilyId, setFromFamilyId] = useState('');
  const [fromStage, setFromStage] = useState('');
  const [toFamilyId, setToFamilyId] = useState('');
  const [toStage, setToStage] = useState('');
  const [actionType, setActionType] = useState<'promote' | 'graduate' | 'retain' | 'stop'>('promote');
  const [notes, setNotes] = useState('');

  const filteredRules = selectedFamilyFilter === 'all'
    ? rules
    : rules.filter((r) => r.from_family_id === selectedFamilyFilter);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف قاعدة الانتقال هذه؟')) return;
    try {
      const res = await fetch(`/api/academic-years/promotions/rules?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل حذف القاعدة');
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'حدث خطأ');
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromFamilyId || !fromStage) {
      setError('يرجى تحديد الأسرة والمرحلة الحالية');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/academic-years/promotions/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_family_id: fromFamilyId,
          from_stage: fromStage,
          to_family_id: actionType === 'promote' ? toFamilyId : null,
          to_stage: actionType === 'promote' ? toStage : null,
          action_type: actionType,
          is_active: true,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل حفظ القاعدة');
      }
      setShowAddModal(false);
      setFromFamilyId('');
      setFromStage('');
      setToFamilyId('');
      setToStage('');
      setNotes('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ القاعدة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#EAE3E4] shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-[#421923] flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#702C3B]" />
            قواعد انتقال المراحل الدراسية السنوية
          </h2>
          <p className="text-xs text-[#81777A] mt-1">
            تحديد القواعد التلقائية لانتقال المخدومين بين المراحل والأسر مع بداية كل عام كنسي جديد.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Family Filter */}
          <select
            value={selectedFamilyFilter}
            onChange={(e) => setSelectedFamilyFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[#EAE3E4] bg-white focus:outline-none font-bold text-[#421923]"
          >
            <option value="all">كافة الأسر والقطاعات ({rules.length})</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة قاعدة انتقال</span>
            </button>
          )}
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-[#EAE3E4] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#FAF5F6] text-[#702C3B] border-b border-[#EAE3E4]">
              <tr>
                <th className="py-3 px-4 font-bold">المرحلة الحالية</th>
                <th className="py-3 px-4 font-bold text-center">نوع الإجراء</th>
                <th className="py-3 px-4 font-bold">المرحلة والأسرة القادمة</th>
                <th className="py-3 px-4 font-bold">ملاحظات</th>
                {canManage && <th className="py-3 px-4 font-bold text-center">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    لا توجد قواعد انتقال مسجلة لهذا التصنيف
                  </td>
                </tr>
              ) : (
                filteredRules.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* From */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#421923]">{r.from_stage}</div>
                      <div className="text-[11px] text-[#81777A]">{r.from_family_name}</div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      {(r.action_type === 'promote' || (!r.action_type && !r.is_graduation)) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ترقية للمرحلة التالية
                        </span>
                      )}
                      {(r.action_type === 'graduate' || (!r.action_type && r.is_graduation)) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          تخرج من المرحلة
                        </span>
                      )}
                      {r.action_type === 'retain' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          إعادة نفس المرحلة
                        </span>
                      )}
                      {r.action_type === 'stop' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          توقف عن الحضور
                        </span>
                      )}
                    </td>

                    {/* To */}
                    <td className="py-3 px-4">
                      {(!r.is_graduation && r.action_type !== 'graduate' && r.action_type !== 'stop') ? (
                        <div className="flex items-center gap-2">
                          <ArrowLeft className="w-3.5 h-3.5 text-[#702C3B] shrink-0 rotate-180" />
                          <div>
                            <div className="font-bold text-[#421923]">{r.to_stage || 'غير محدد'}</div>
                            <div className="text-[11px] text-[#81777A]">{r.to_family_name || '—'}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">نهاية مسار المرحلة</span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                      {r.notes || '—'}
                    </td>

                    {/* Actions */}
                    {canManage && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="حذف القاعدة"
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

      {/* Modal Add Rule */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EAE3E4] space-y-4">
            <h3 className="text-base font-bold text-[#421923] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#702C3B]" />
              إضافة قاعدة انتقال جديدة
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveRule} className="space-y-4">
              {/* From Family & Stage */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
                <div className="text-xs font-bold text-[#702C3B]">من (المرحلة الحالية):</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">الأسرة الحالية</label>
                    <select
                      required
                      value={fromFamilyId}
                      onChange={(e) => {
                        setFromFamilyId(e.target.value);
                        setFromStage('');
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
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">المرحلة الحالية</label>
                    <select
                      required
                      disabled={!fromFamilyId}
                      value={fromStage}
                      onChange={(e) => setFromStage(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white disabled:opacity-50"
                    >
                      <option value="">اختر المرحلة...</option>
                      {getStagesForFamily(fromFamilyId).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1">نوع الإجراء السنوي</label>
                <select
                  value={actionType}
                  onChange={(e: any) => setActionType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold"
                >
                  <option value="promote">ترقية إلى مرحلة جديدة</option>
                  <option value="graduate">تخرج من المرحلة / الكنيسة</option>
                  <option value="retain">إعادة نفس المرحلة</option>
                  <option value="stop">توقف عن الحضور</option>
                </select>
              </div>

              {/* To Family & Stage (only if promote) */}
              {actionType === 'promote' && (
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                  <div className="text-xs font-bold text-emerald-800">إلى (المرحلة والأسرة المستهدفة):</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">الأسرة القادمة</label>
                      <select
                        required={actionType === 'promote'}
                        value={toFamilyId}
                        onChange={(e) => {
                          setToFamilyId(e.target.value);
                          setToStage('');
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 bg-white"
                      >
                        <option value="">اختر الأسرة القادمة...</option>
                        {families.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">المرحلة القادمة</label>
                      <select
                        required={actionType === 'promote'}
                        disabled={!toFamilyId}
                        value={toStage}
                        onChange={(e) => setToStage(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 bg-white disabled:opacity-50"
                      >
                        <option value="">اختر المرحلة القادمة...</option>
                        {getStagesForFamily(toFamilyId).map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1">ملاحظات توضيحية (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: انتقال من إعدادي بنين إلى مرحلة ثانوي"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300"
                />
              </div>

              {/* Modal Buttons */}
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
                  {submitting ? 'جاري الحفظ...' : 'حفظ القاعدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
