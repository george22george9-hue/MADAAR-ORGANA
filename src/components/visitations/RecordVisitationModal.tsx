'use client';

// ====================================================================
// ORGANA — Pastoral Visitation Recording Modal (تسجيل الافتقاد)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { ServedMember, Servant, VisitationMethod } from '@/types/organa';
import {
  Home,
  Phone,
  Church,
  Calendar,
  Users,
  User,
  Search,
  Check,
  X,
  Loader2,
  CheckCircle2,
  Sparkles,
  MapPin,
  HeartHandshake,
  MessageSquare,
  AlertCircle,
  PhoneCall
} from 'lucide-react';

interface RecordVisitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preSelectedMember?: ServedMember | null;
  familyId?: string;
}

const VISITATION_METHODS: {
  id: VisitationMethod;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'home_visit',
    title: 'زيارة منزلية',
    subtitle: 'افتقاد في منزل المخدوم ومع الأسرة',
    icon: Home,
  },
  {
    id: 'phone_call',
    title: 'اتصال هاتفي',
    subtitle: 'مكالمة تليفونية للاطمئنان والمتابعة',
    icon: Phone,
  },
  {
    id: 'church_meeting',
    title: 'مقابلة في الكنيسة',
    subtitle: 'لقاء شخصي بالكنيسة أو بعد القداس',
    icon: Church,
  },
];

const QUICK_TAGS = [
  'حالة ممتازة ومستقر ✨',
  'تأكيد الحضور للقداس والفصل الجمعة القادمة ⛪',
  'اعتذار بسبب الامتحانات والمذاكرة 📚',
  'محتاج زيارة وتدخل من قدس أبونا ✝️',
  'ظروف صحية/مرضية ومحتاج صلاة 🙏',
  'عدم تواجد في المنزل وتم التواصل تليفونياً 📞',
  'تم الاتفاق على موعد متابعة قادمة 🗓️',
];

export function RecordVisitationModal({
  isOpen,
  onClose,
  onSuccess,
  preSelectedMember = null,
  familyId,
}: RecordVisitationModalProps) {
  const { currentUser, currentRole, assignedFamilyId } = useAuth();

  // Selected Member
  const [selectedMember, setSelectedMember] = useState<ServedMember | null>(preSelectedMember);
  const [membersList, setMembersList] = useState<ServedMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Servants in the family
  const [servantsList, setServantsList] = useState<Servant[]>([]);
  const [loadingServants, setLoadingServants] = useState(false);
  const [servantSearch, setServantSearch] = useState('');

  // Form Fields
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [visitationDate, setVisitationDate] = useState<string>(todayStr);
  const [method, setMethod] = useState<VisitationMethod>('home_visit');
  
  // CRITICAL REQUIREMENT: Servants must be UNCHECKED by default
  const [selectedServantIds, setSelectedServantIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // UI status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Synchronize preSelectedMember when prop changes
  useEffect(() => {
    if (preSelectedMember) {
      setSelectedMember(preSelectedMember);
    }
  }, [preSelectedMember]);

  // Load members if not provided or when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!preSelectedMember) {
      setLoadingMembers(true);
      const fam = familyId || assignedFamilyId;
      const url = fam ? `/api/members?familyId=${fam}` : '/api/members';
      fetch(url)
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            setMembersList(res.members || []);
          }
        })
        .catch((e) => console.error(e))
        .finally(() => setLoadingMembers(false));
    }
  }, [isOpen, preSelectedMember, familyId, assignedFamilyId]);

  // Load servants for the family
  useEffect(() => {
    if (!isOpen) return;

    setLoadingServants(true);
    const targetFam = selectedMember?.current_family_id || familyId || assignedFamilyId;
    const url = targetFam ? `/api/servants?familyId=${targetFam}` : '/api/servants';

    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setServantsList(res.servants || []);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoadingServants(false));
  }, [isOpen, selectedMember, familyId, assignedFamilyId]);

  // Reset form when modal opens afresh without pre-selection
  useEffect(() => {
    if (isOpen) {
      setVisitationDate(new Date().toISOString().split('T')[0]);
      setMethod('home_visit');
      setSelectedServantIds([]); // Empty by default
      setNotes('');
      setErrorMsg(null);
      setSuccessMsg(null);
      if (preSelectedMember) {
        setSelectedMember(preSelectedMember);
      }
    }
  }, [isOpen, preSelectedMember]);

  if (!isOpen) return null;

  // Filter members for search
  const filteredMembers = membersList.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      m.full_name.toLowerCase().includes(q) ||
      (m.code && m.code.toLowerCase().includes(q)) ||
      (m.stage && m.stage.toLowerCase().includes(q)) ||
      (m.guardian_phone && m.guardian_phone.includes(q))
    );
  });

  // Filter servants for search
  const filteredServants = servantsList.filter((s) => {
    if (!servantSearch.trim()) return true;
    const q = servantSearch.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      (s.assigned_stage && s.assigned_stage.toLowerCase().includes(q)) ||
      (s.role_in_family && s.role_in_family.toLowerCase().includes(q))
    );
  });

  // Toggle servant selection
  const handleToggleServant = (servantId: string) => {
    setSelectedServantIds((prev) =>
      prev.includes(servantId)
        ? prev.filter((id) => id !== servantId)
        : [...prev, servantId]
    );
    if (errorMsg) setErrorMsg(null);
  };

  // Quick date pickers
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offsetDays);
    setVisitationDate(d.toISOString().split('T')[0]);
  };

  const setLastFridayDate = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day + 7 - 5) % 7 || 7;
    d.setDate(d.getDate() - diff);
    setVisitationDate(d.toISOString().split('T')[0]);
  };

  // Add tag to notes
  const handleAddTag = (tag: string) => {
    setNotes((prev) => {
      const clean = prev.trim();
      if (!clean) return tag;
      return `${clean} - ${tag}`;
    });
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMember) {
      setErrorMsg('يرجى اختيار المخدوم المراد تسجيل افتقاده');
      return;
    }

    if (!visitationDate) {
      setErrorMsg('يرجى تحديد تاريخ الافتقاد');
      return;
    }

    if (selectedServantIds.length === 0) {
      setErrorMsg('يرجى اختيار خادم واحد على الأقل شارك في هذا الافتقاد');
      return;
    }

    if (!notes.trim()) {
      setErrorMsg('يرجى كتابة ملخص أو تقرير عما حدث في الافتقاد');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const servantNames = servantsList
        .filter((s) => selectedServantIds.includes(s.id))
        .map((s) => s.full_name);

      const payload = {
        member_id: selectedMember.id,
        family_id: selectedMember.current_family_id || familyId || assignedFamilyId,
        visitation_date: visitationDate,
        method,
        servant_ids: selectedServantIds,
        servant_names: servantNames,
        notes: notes.trim(),
      };

      const res = await fetch('/api/visitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'حدث خطأ أثناء حفظ الافتقاد');
      }

      setSuccessMsg('تم تسجيل وتوثيق الافتقاد بنجاح! تم تحديث سجل المخدوم.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-[#EAE3E4] overflow-hidden text-right font-sans">
        
        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[92vh] overflow-hidden">
          
          {/* Header - Solid Burgundy with High Contrast White Text */}
          <div className="px-5 py-4 bg-[#702C3B] text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/25 shadow-xs shrink-0">
                <HeartHandshake className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    تسجيل وتوثيق افتقاد جديد
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                    رعاية ميدانية
                  </span>
                </div>
                <p className="text-[11px] text-rose-100 font-medium">
                  كنيسة الشهيد العظيم مارجرجس بسندبيس — إيبارشية شبرا الخيمة
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white cursor-pointer"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-[#282326]">
            
            {/* Feedback Alerts */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-bold">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-bold">{successMsg}</span>
              </div>
            )}

            {/* Section 1: Member Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#421923] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#702C3B]" />
                <span>المخدوم المراد افتقاده *</span>
              </label>

              {selectedMember ? (
                // Selected Member Card
                <div className="p-4 rounded-2xl bg-[#FAF5F6] border border-[#EAE3E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#702C3B] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {selectedMember.full_name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#421923]">
                          {selectedMember.full_name}
                        </h4>
                        {selectedMember.code && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white text-[#702C3B] border border-[#EAE3E4]">
                            {selectedMember.code}
                          </span>
                        )}
                        {selectedMember.stage && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            {selectedMember.stage}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#81777A] mt-1 flex flex-wrap items-center gap-3">
                        {selectedMember.guardian_name && (
                          <span>ولي الأمر: <strong>{selectedMember.guardian_name}</strong></span>
                        )}
                        {selectedMember.guardian_phone && (
                          <span className="flex items-center gap-1 font-semibold text-[#421923]">
                            <Phone className="w-3 h-3 text-[#702C3B]" />
                            <span dir="ltr">{selectedMember.guardian_phone}</span>
                          </span>
                        )}
                        {selectedMember.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#702C3B]" />
                            <span>{selectedMember.address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!preSelectedMember && (
                    <button
                      type="button"
                      onClick={() => setSelectedMember(null)}
                      className="text-xs text-[#702C3B] hover:underline self-end sm:self-center font-bold px-2.5 py-1.5 bg-white rounded-lg border border-[#EAE3E4] cursor-pointer"
                    >
                      تغيير المخدوم
                    </button>
                  )}
                </div>
              ) : (
                // Member Search & Selection Box
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#81777A] absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو الكود أو رقم التليفون..."
                      className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-[#EAE3E4] text-xs bg-white focus:outline-none focus:border-[#702C3B] focus:ring-1 focus:ring-[#702C3B] transition-all"
                    />
                  </div>

                  {loadingMembers ? (
                    <div className="p-4 text-center text-xs text-[#81777A] flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#702C3B]" />
                      <span>جاري تحميل قائمة المخدومين...</span>
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto rounded-xl border border-[#EAE3E4] divide-y divide-[#EAE3E4] bg-white">
                      {filteredMembers.length > 0 ? (
                        filteredMembers.slice(0, 15).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedMember(m);
                              setMemberSearch('');
                            }}
                            className="w-full px-3 py-2 text-right hover:bg-[#FAF5F6] flex items-center justify-between transition-colors group cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-xs text-[#421923] group-hover:text-[#702C3B]">
                                {m.full_name}
                              </span>
                              <span className="text-[11px] text-[#81777A] mr-2">
                                ({m.stage || 'عام'} - {m.guardian_name || 'ولي الأمر'})
                              </span>
                            </div>
                            {m.code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
                                {m.code}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-[#81777A]">
                          لا يوجد مخدوم يطابق بحثك
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: Visitation Date */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#421923] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#702C3B]" />
                  <span>تاريخ الافتقاد *</span>
                </label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className={`px-2.5 py-1 rounded-md border font-medium cursor-pointer transition-colors ${
                      visitationDate === todayStr
                        ? 'bg-[#702C3B] text-white border-[#702C3B]'
                        : 'bg-[#FAF5F6] text-[#81777A] border-[#EAE3E4] hover:bg-stone-100'
                    }`}
                  >
                    اليوم
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="px-2.5 py-1 rounded-md border bg-[#FAF5F6] text-[#81777A] border-[#EAE3E4] hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    أمس
                  </button>
                  <button
                    type="button"
                    onClick={setLastFridayDate}
                    className="px-2.5 py-1 rounded-md border bg-[#FAF5F6] text-[#81777A] border-[#EAE3E4] hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    الجمعة الماضية
                  </button>
                </div>
              </div>

              <input
                type="date"
                value={visitationDate}
                onChange={(e) => setVisitationDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE3E4] text-xs bg-white focus:outline-none focus:border-[#702C3B] focus:ring-1 focus:ring-[#702C3B] font-medium"
              />
            </div>

            {/* Section 3: Visitation Method (3 Cards) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#421923] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#702C3B]" />
                <span>طريقة الافتقاد *</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {VISITATION_METHODS.map((m) => {
                  const IconComponent = m.icon;
                  const isSelected = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2.5 cursor-pointer relative ${
                        isSelected
                          ? 'border-[#702C3B] bg-rose-50/50 shadow-xs ring-2 ring-[#702C3B]'
                          : 'border-[#EAE3E4] bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-[#702C3B] text-white' : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#702C3B] text-white flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[#421923]">{m.title}</div>
                        <div className="text-[10px] text-[#81777A] mt-0.5 leading-snug">
                          {m.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Participating Servants (Multi-select, ALL UNCHECKED by default) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#421923] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#702C3B]" />
                  <span>الخدام المشاركون في الافتقاد *</span>
                </label>
                <span className="text-[11px] font-bold text-[#702C3B] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  تم تحديد ({selectedServantIds.length}) خادم
                </span>
              </div>

              <p className="text-[11px] text-[#81777A]">
                حدد الخدام الذين قاموا بالزيارة أو الاتصال بالفعل (يمكنك اختيار خادم واحد أو أكثر):
              </p>

              {servantsList.length > 6 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#81777A] absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={servantSearch}
                    onChange={(e) => setServantSearch(e.target.value)}
                    placeholder="بحث في الخدام..."
                    className="w-full pr-8 pl-3 py-1.5 rounded-lg border border-[#EAE3E4] text-xs bg-white focus:outline-none"
                  />
                </div>
              )}

              {loadingServants ? (
                <div className="p-4 text-center text-xs text-[#81777A] flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#702C3B]" />
                  <span>جاري تحميل خدام الأسرة...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 rounded-xl border border-[#EAE3E4] bg-stone-50/60">
                  {filteredServants.map((servant) => {
                    const isChecked = selectedServantIds.includes(servant.id);
                    return (
                      <div
                        key={servant.id}
                        onClick={() => handleToggleServant(servant.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between gap-2.5 ${
                          isChecked
                            ? 'border-[#702C3B] bg-white shadow-xs ring-2 ring-[#702C3B]/60'
                            : 'border-[#EAE3E4] bg-white hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isChecked
                                ? 'bg-[#702C3B] text-white'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {servant.full_name.slice(0, 1)}
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-xs text-[#421923] truncate">
                              {servant.full_name}
                            </div>
                            {servant.role_in_family && (
                              <div className="text-[10px] text-[#81777A] truncate">
                                {servant.role_in_family}
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-[#702C3B] border-[#702C3B] text-white'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 5: Notes & Outcomes (حصل إيه في الافتقاد؟) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#421923] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#702C3B]" />
                <span>تقرير الافتقاد (حصل إيه في الافتقاد؟) *</span>
              </label>

              {/* Quick preset tags */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[#FAF5F6] hover:bg-rose-100 text-[#702C3B] border border-[#EAE3E4] transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="اكتب بالتفصيل: الحالة الروحية، الدراسة، أحوال الأسرة، أي احتياجات خاصة، وما تم الاتفاق عليه..."
                className="w-full p-3 rounded-xl border border-[#EAE3E4] text-xs bg-white focus:outline-none focus:border-[#702C3B] focus:ring-1 focus:ring-[#702C3B] leading-relaxed resize-none font-medium"
              />
            </div>
          </div>

          {/* Sticky Footer Bar - ALWAYS VISIBLE AT BOTTOM */}
          <div className="p-4 sm:px-6 bg-white border-t border-[#EAE3E4] flex items-center justify-between gap-3 shrink-0 shadow-lg z-20">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-[#702C3B] hover:bg-[#58222e] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جاري توثيق الافتقاد...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>حفظ وتوثيق الافتقاد ✓</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
