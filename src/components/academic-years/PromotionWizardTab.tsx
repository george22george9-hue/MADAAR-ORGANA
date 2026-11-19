'use client';

import React, { useState, useEffect } from 'react';
import { AcademicYear, Family, PromotionPreviewItem, AnnualPromotionPreview } from '@/types/organa';
import { getStagesForFamily } from '@/lib/constants/stages';
import {
  Wand2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Users,
  ShieldCheck,
  RefreshCw,
  Search,
  Check,
  FileCheck2,
  GraduationCap
} from 'lucide-react';

interface PromotionWizardTabProps {
  years: AcademicYear[];
  families: Family[];
  canManage: boolean;
  onSuccess: () => void;
}

export function PromotionWizardTab({ years, families, canManage, onSuccess }: PromotionWizardTabProps) {
  // Step: 1 = Years & Review, 2 = Exceptions, 3 = Preview Summary, 4 = Commit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Year Selection
  const activeYear = years.find((y) => y.is_active);
  const [fromYearId, setFromYearId] = useState<string>(activeYear?.id || '');
  const [toYearId, setToYearId] = useState<string>('');

  // Data
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<AnnualPromotionPreview | null>(null);
  const [items, setItems] = useState<PromotionPreviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'promoted' | 'needs_review' | 'graduated' | 'retained'>('all');

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);

  // Auto pick next year when years load
  useEffect(() => {
    if (!fromYearId && activeYear) {
      setFromYearId(activeYear.id);
    }
    const nonActiveYears = years.filter((y) => y.id !== (fromYearId || activeYear?.id));
    if (nonActiveYears.length > 0 && !toYearId) {
      setToYearId(nonActiveYears[0].id);
    }
  }, [years, activeYear, fromYearId]);

  // Load preview
  const fetchPreview = async () => {
    if (!fromYearId || !toYearId) {
      setError('يرجى اختيار سنة المصدر وسنة الهدف للترحيل');
      return;
    }
    if (fromYearId === toYearId) {
      setError('لا يمكن الترحيل لنفس السنة الكنسية');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/academic-years/promotions/preview?fromYearId=${fromYearId}&toYearId=${toYearId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تحميل بيانات معاينة الترحيل');
      }
      setPreviewData(data.preview);
      const normalizedItems = (data.preview.items || []).map((it: any) => ({
        ...it,
        member_name: it.member_name || it.full_name,
        proposed_status: it.proposed_status || (it.status === 'promote' ? 'promoted' : it.status === 'graduate' ? 'graduated' : it.status === 'retain' ? 'retained' : 'needs_review'),
        is_exception: it.status === 'exception_needed',
      }));
      setItems(normalizedItems);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل المعاينة');
    } finally {
      setLoading(false);
    }
  };

  // Modify individual item proposed target
  const handleItemOverride = (
    memberId: string,
    updates: {
      target_family_id?: string | null;
      target_stage?: string | null;
      proposed_status?: 'promoted' | 'retained' | 'graduated' | 'stopped' | 'custom_override';
    }
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.member_id !== memberId) return item;

        let familyName = item.target_family_name;
        if (updates.target_family_id !== undefined) {
          const fam = families.find((f) => f.id === updates.target_family_id);
          familyName = fam ? fam.name : null;
        }

        const newTargetFamilyId = updates.target_family_id !== undefined ? updates.target_family_id : item.target_family_id;
        const newTargetStage = updates.target_stage !== undefined ? updates.target_stage : item.target_stage;
        const newStatus = updates.proposed_status !== undefined ? updates.proposed_status : item.proposed_status;

        // Structured code re-estimation
        let newTargetCode = item.target_code;
        if (newTargetFamilyId && newTargetStage) {
          const fam = families.find((f) => f.id === newTargetFamilyId);
          const fName = fam?.name || '';
          let famLetter = 'G';
          if (fName.includes('حضانة')) famLetter = 'N';
          else if (fName.includes('أولى وتانية')) famLetter = 'A';
          else if (fName.includes('تالتة ورابعة')) famLetter = 'B';
          else if (fName.includes('خامسة وسادسة')) famLetter = 'C';
          else if (fName.includes('إعدادي') && fName.includes('بنين')) famLetter = 'P';
          else if (fName.includes('إعدادي') && fName.includes('بنات')) famLetter = 'Q';
          else if (fName.includes('ثانوي')) famLetter = 'S';
          else if (fName.includes('خدام')) famLetter = 'K';

          let stageLetter = 'A';
          if (newTargetStage.includes('تانية') || newTargetStage.includes('KG2')) stageLetter = 'B';
          else if (newTargetStage.includes('تالتة')) stageLetter = 'C';
          else if (newTargetStage.includes('رابعة')) stageLetter = 'D';
          else if (newTargetStage.includes('خامسة')) stageLetter = 'E';
          else if (newTargetStage.includes('سادسة')) stageLetter = 'F';

          newTargetCode = `${famLetter}${stageLetter}••`;
        }

        return {
          ...item,
          target_family_id: newTargetFamilyId,
          target_family_name: familyName,
          target_stage: newTargetStage,
          proposed_status: newStatus,
          target_code: newTargetCode,
          is_exception: newStatus !== 'promoted',
        };
      })
    );
  };

  // Execute promotion
  const handleExecutePromotion = async () => {
    if (!confirm('تأكيد نهائي: هل تريد اعتماد وتنفيذ الترحيل السنوي الآن؟ سيتم ترحيل كافة المخدومين وتحديث أكوادهم تلقائياً.')) {
      return;
    }

    setExecuting(true);
    setError(null);
    try {
      const overrides = items
        .filter((it) => it.is_exception || it.proposed_status !== 'promoted')
        .map((it) => ({
          member_id: it.member_id,
          target_family_id: it.target_family_id || undefined,
          target_stage: it.target_stage || undefined,
          action: it.proposed_status === 'retained' ? 'retain' : it.proposed_status === 'graduated' ? 'graduate' : it.proposed_status === 'stopped' ? 'stop' : 'custom_override',
        }));

      const res = await fetch('/api/academic-years/promotions/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_academic_year_id: fromYearId,
          to_academic_year_id: toYearId,
          overrides,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تنفيذ عملية الترحيل');
      }

      setExecutionResult(data);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء اعتماد الترحيل');
    } finally {
      setExecuting(false);
    }
  };

  // Filtered members list for display
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      (item.member_name || item.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.current_code && item.current_code.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'promoted') return item.proposed_status === 'promoted';
    if (statusFilter === 'needs_review') return item.proposed_status === 'needs_review' || !item.target_stage;
    if (statusFilter === 'graduated') return item.proposed_status === 'graduated';
    if (statusFilter === 'retained') return item.proposed_status === 'retained';

    return true;
  });

  const exceptionsCount = items.filter(
    (i) => i.is_exception || i.proposed_status !== 'promoted' || !i.target_stage
  ).length;

  return (
    <div className="space-y-6">
      {/* Wizard Header & Stepper */}
      <div className="bg-white p-6 rounded-2xl border border-[#EAE3E4] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#421923] flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-[#702C3B]" />
              معالج الترحيل السنوي الذكي (Annual Promotion Wizard)
            </h2>
            <p className="text-xs text-[#81777A] mt-1">
              ترحيل المخدومين سنوياً، تحديث المراحل والأكواد المهيكلة، مع المحافظة التامة على الأرشيف التاريخي لكل طالب.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold bg-[#FAF5F6] px-4 py-2 rounded-xl border border-[#EAE3E4] text-[#702C3B]">
            <span>الخطوة {currentStep} من 4</span>
          </div>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-gray-100 pt-4">
          <button
            onClick={() => setCurrentStep(1)}
            className={`p-3 rounded-xl text-right text-xs font-bold transition-all flex items-center gap-2 ${
              currentStep === 1
                ? 'bg-[#702C3B] text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span>السنوات ومراجعة المخدومين</span>
          </button>

          <button
            onClick={() => items.length > 0 && setCurrentStep(2)}
            disabled={items.length === 0}
            className={`p-3 rounded-xl text-right text-xs font-bold transition-all flex items-center gap-2 ${
              currentStep === 2
                ? 'bg-[#702C3B] text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            <span>مراجعة الاستثناءات ({exceptionsCount})</span>
          </button>

          <button
            onClick={() => items.length > 0 && setCurrentStep(3)}
            disabled={items.length === 0}
            className={`p-3 rounded-xl text-right text-xs font-bold transition-all flex items-center gap-2 ${
              currentStep === 3
                ? 'bg-[#702C3B] text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            <span>معاينة النتائج والأكواد</span>
          </button>

          <button
            onClick={() => items.length > 0 && setCurrentStep(4)}
            disabled={items.length === 0}
            className={`p-3 rounded-xl text-right text-xs font-bold transition-all flex items-center gap-2 ${
              currentStep === 4
                ? 'bg-[#702C3B] text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">4</span>
            <span>اعتماد الترحيل رسمياً</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: SELECT YEARS & MEMBER REVIEW */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Year Selectors & Load Button */}
          <div className="p-5 rounded-2xl bg-white border border-[#EAE3E4] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-[#421923] mb-1">من العام الكنسي (المصدر)</label>
              <select
                value={fromYearId}
                onChange={(e) => setFromYearId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold"
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.is_active ? '(النشطة حالياً)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#421923] mb-1">إلى العام الكنسي الجديد (الهدف)</label>
              <select
                value={toYearId}
                onChange={(e) => setToYearId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold"
              >
                <option value="">اختر السنة الجديدة...</option>
                {years
                  .filter((y) => y.id !== fromYearId)
                  .map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
              </select>
            </div>

            <button
              onClick={fetchPreview}
              disabled={loading || !fromYearId || !toYearId}
              className="w-full py-2.5 px-4 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>تحميل ومعاينة اقتراحات الترحيل</span>
            </button>
          </div>

          {/* Members Table */}
          {items.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#EAE3E4] overflow-hidden shadow-sm space-y-4 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#702C3B]" />
                  <h3 className="font-bold text-sm text-[#421923]">
                    قائمة مخدومي الخدمة للمراجعة ({items.length} مخدوماً)
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="بحث بالاسم أو الكود..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-9 pl-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#702C3B] w-48"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 bg-white font-medium"
                  >
                    <option value="all">كافة الحالات</option>
                    <option value="promoted">منقولون تلقائياً</option>
                    <option value="needs_review">بحاجة لمراجعة</option>
                    <option value="graduated">خريجون</option>
                    <option value="retained">معيدون</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#FAF5F6] text-[#702C3B] border-b border-[#EAE3E4]">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">المخدوم</th>
                      <th className="py-2.5 px-3 font-bold">الوضع الحالي</th>
                      <th className="py-2.5 px-3 font-bold">المرحلة والأسرة المقترحة</th>
                      <th className="py-2.5 px-3 font-bold">الكود المتوقع</th>
                      <th className="py-2.5 px-3 font-bold">الإجراء / الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredItems.map((item) => (
                      <tr key={item.member_id} className="hover:bg-gray-50/70">
                        {/* Name */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#421923]">{item.member_name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">ID: {item.member_id}</div>
                        </td>

                        {/* Current */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-gray-700">{item.current_stage || 'غير محدد'}</div>
                          <div className="text-[11px] text-[#81777A]">
                            {item.current_family_name} • <span className="font-mono">{item.current_code}</span>
                          </div>
                        </td>

                        {/* Target Stage & Family (Editable) */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <select
                              value={item.target_family_id || ''}
                              onChange={(e) =>
                                handleItemOverride(item.member_id, {
                                  target_family_id: e.target.value || null,
                                  target_stage: null,
                                })
                              }
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-gray-200 bg-white"
                            >
                              <option value="">بدون أسرة (تخرج/توقف)</option>
                              {families.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.name}
                                </option>
                              ))}
                            </select>

                            {item.target_family_id && (
                              <select
                                value={item.target_stage || ''}
                                onChange={(e) =>
                                  handleItemOverride(item.member_id, {
                                    target_stage: e.target.value || null,
                                  })
                                }
                                className="w-full px-2 py-1 text-[11px] rounded-lg border border-gray-200 bg-white font-medium"
                              >
                                <option value="">اختر المرحلة القادمة...</option>
                                {getStagesForFamily(item.target_family_id).map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>

                        {/* Projected Code */}
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs font-bold text-[#702C3B] bg-[#FAF5F6] px-2 py-1 rounded-md border border-[#EAE3E4]">
                            {item.target_code || '—'}
                          </span>
                        </td>

                        {/* Action / Status Dropdown */}
                        <td className="py-3 px-3">
                          <select
                            value={item.proposed_status}
                            onChange={(e: any) =>
                              handleItemOverride(item.member_id, {
                                proposed_status: e.target.value,
                              })
                            }
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              item.proposed_status === 'promoted'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : item.proposed_status === 'graduated'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : item.proposed_status === 'retained'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : item.proposed_status === 'stopped'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-rose-50 text-rose-800 border-rose-300'
                            }`}
                          >
                            <option value="promoted">منقول للمرحلة التالية</option>
                            <option value="retained">معيد لنفس المرحلة</option>
                            <option value="graduated">متخرج من الخدمة</option>
                            <option value="stopped">متوقف عن الحضور</option>
                            <option value="needs_review">بحاجة لمراجعة</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Nav to Step 2 */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-[#81777A]">
                  تمت مراجعة {items.length} مخدوماً • يوجد {exceptionsCount} استثناءً
                </span>

                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] flex items-center gap-2"
                >
                  <span>متابعة لمراجعة الاستثناءات</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: REVIEW EXCEPTIONS */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-[#EAE3E4] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#421923] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              مراجعة الحالات الاستثنائية ({exceptionsCount})
            </h3>
            <p className="text-xs text-[#81777A] mt-1">
              المخدومون المعيدون، المتخرجون، المنقطعون، أو الذين ليس لديهم مرحلة تالية محددة تلقائياً.
            </p>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {items
              .filter((i) => i.is_exception || i.proposed_status !== 'promoted' || !i.target_stage)
              .map((item) => (
                <div key={item.member_id} className="p-4 bg-amber-50/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-sm text-[#421923]">{item.member_name}</div>
                    <div className="text-xs text-[#81777A] mt-0.5">
                      الحالي: {item.current_family_name} ({item.current_stage}) • كود: {item.current_code}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={item.proposed_status}
                      onChange={(e: any) =>
                        handleItemOverride(item.member_id, {
                          proposed_status: e.target.value,
                        })
                      }
                      className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 font-bold bg-white"
                    >
                      <option value="retained">إعادة نفس المرحلة</option>
                      <option value="graduated">تخرج من الخدمة</option>
                      <option value="stopped">توقف عن الحضور</option>
                      <option value="promoted">ترحيل مخصص</option>
                    </select>

                    {item.proposed_status !== 'graduated' && item.proposed_status !== 'stopped' && (
                      <select
                        value={item.target_stage || ''}
                        onChange={(e) =>
                          handleItemOverride(item.member_id, {
                            target_stage: e.target.value,
                          })
                        }
                        className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 bg-white"
                      >
                        <option value="">اختر المرحلة المستهدفة...</option>
                        {getStagesForFamily(item.target_family_id || item.current_family_id).map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    )}

                    <span className="font-mono text-xs font-bold text-[#702C3B] bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                      {item.target_code || '—'}
                    </span>
                  </div>
                </div>
              ))}

            {exceptionsCount === 0 && (
              <div className="p-8 text-center text-gray-500 text-xs">
                ممتاز! جميع المخدومين لديهم قواعد ترحيل واضحة ولا توجد أي استثناءات معلقة.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للخطوة السابقة</span>
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] flex items-center gap-2"
            >
              <span>متابعة لمعاينة النتائج الكاملة</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW SUMMARY & STATS */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-[#EAE3E4] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#421923] flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#702C3B]" />
              معاينة النتائج والإحصائيات المتوقعة
            </h3>
            <p className="text-xs text-[#81777A] mt-1">
              مراجعة الأعداد الإجمالية لكل فئة قبل اعتماد الترحيل النهائي وتطبيق القيود.
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="text-emerald-700 font-bold text-xs">المنقولون للمرحلة التالية</div>
              <div className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                {items.filter((i) => i.proposed_status === 'promoted').length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-amber-700 font-bold text-xs">المعيدون لنفس المرحلة</div>
              <div className="text-2xl font-black text-amber-900 mt-1 font-mono">
                {items.filter((i) => i.proposed_status === 'retained').length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
              <div className="text-purple-700 font-bold text-xs">الخريجون من الخدمة</div>
              <div className="text-2xl font-black text-purple-900 mt-1 font-mono">
                {items.filter((i) => i.proposed_status === 'graduated').length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <div className="text-rose-700 font-bold text-xs">المتوقفون أو بحاجة مراجعة</div>
              <div className="text-2xl font-black text-rose-900 mt-1 font-mono">
                {items.filter((i) => i.proposed_status === 'stopped' || i.proposed_status === 'needs_review').length}
              </div>
            </div>
          </div>

          {/* Code Generation Sample */}
          <div className="p-4 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4] space-y-2">
            <div className="text-xs font-bold text-[#702C3B]">نظام الأكواد المهيكلة الجديد:</div>
            <p className="text-xs text-[#554B4F] leading-relaxed">
              سيتم إنشاء أكواد المخدومين تلقائياً طبقاً لصيغة: <span className="font-mono font-bold">[رمز الأسرة][رمز المرحلة][الرقم التسلسلي 01..99]</span>.
              مثال: مخدوم في ثانوي مرحلة أولى سيحصل على كود مثل <span className="font-mono font-bold text-[#702C3B]">SA01</span> أو <span className="font-mono font-bold text-[#702C3B]">SA02</span>.
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للاستثناءات</span>
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] flex items-center gap-2"
            >
              <span>متابعة للاعتماد النهائي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FINAL COMMIT */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-[#EAE3E4] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#421923] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#702C3B]" />
              الاعتماد الرسمي للترحيل السنوي
            </h3>
            <p className="text-xs text-[#81777A] mt-1">
              تطبيق الترحيل على قاعدة البيانات داخل PostgreSQL Transaction آمنة مع حفظ لقطة Snapshot كاملة.
            </p>
          </div>

          {executionResult ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-lg font-bold text-emerald-900">تم اعتماد وتنفيذ الترحيل السنوي بنجاح!</h4>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-lg mx-auto">
                تم ترحيل {executionResult.summary?.promoted_count || items.length} مخدوماً بنجاح، وتحديث أكوادهم وتفعيل العام الكنسي الجديد ({executionResult.summary?.to_academic_year_id}).
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    setExecutionResult(null);
                    onSuccess();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                >
                  العودة للوحة السنوات
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4" />
                  تأكيدات الأمان وقواعد المنظومة:
                </div>
                <ul className="list-disc list-inside space-y-1 text-amber-800/90 leading-relaxed">
                  <li>الاحتفاظ الدائم بـ ID كل مخدوم دون أي تغيير.</li>
                  <li>حفظ السجلات القديمة وأكوادها وحضورها بالكامل في جدول الأرشيف التاريخي.</li>
                  <li>منع تنفيذ الترحيل لنفس العام مرتين عبر Database Constraints.</li>
                  <li>إمكانية التراجع الآمن في أي وقت عبر زر Safe Rollback.</li>
                </ul>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-gray-100">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة للمعاينة</span>
                </button>

                {canManage && (
                  <button
                    disabled={executing}
                    onClick={handleExecutePromotion}
                    className="px-6 py-2.5 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {executing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري اعتماد الترحيل الآمن...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>اعتماد الترحيل رسمياً الآن</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
