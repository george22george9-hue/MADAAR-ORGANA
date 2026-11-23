'use client';

// ====================================================================
// ORGANA — Broadcast & Direct Private Notification Modal
// Support for Broadcast to All OR Direct Private Message to a Specific Servant
// Developed by MADAAR Technologies
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import {
  Send,
  X,
  BookOpen,
  Radio,
  User,
  ShieldCheck,
  Lock,
  Trash2,
  History,
  CheckCircle2,
  Loader2,
  Share2,
  Search,
  Check
} from 'lucide-react';
import { ChurchNotification, Servant } from '@/types/organa';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: 'compose' | 'history';
  initialTargetServant?: { id: string; user_id?: string | null; full_name: string } | null;
}

const PRESET_MESSAGES = [
  {
    label: '📓 تذكير تحضير الكشكول',
    text: 'برجاء التأكيد من التحضير وارسال الكشكول في الموعد المحدد.',
  },
  {
    label: '🙏 تذكير حضور الصلاة والقداس',
    text: 'سلام ونعمة يا خادم المسيح.. في انتظارك الجمعة القادمة بالقداس الإلهي.',
  },
  {
    label: '👥 متابعة افتقاد مخدوميك',
    text: 'برجاء مراجعة حالات الغياب والتواصل مع مخدوميك للاطمئنان عليهم.',
  },
];

export function BroadcastModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'compose',
  initialTargetServant = null,
}: BroadcastModalProps) {
  const { currentUser, currentRole } = useAuth();
  const isPriest = currentRole === 'priest';
  const isAdmin = currentRole === 'admin';

  const [activeTab, setActiveTab] = useState<'compose' | 'history'>(initialTab);
  const [targetMode, setTargetMode] = useState<'broadcast' | 'direct'>(
    initialTargetServant ? 'direct' : 'broadcast'
  );
  const [selectedServant, setSelectedServant] = useState<{
    id: string;
    user_id?: string | null;
    full_name: string;
  } | null>(initialTargetServant);

  const [servantsList, setServantsList] = useState<Servant[]>([]);
  const [loadingServants, setLoadingServants] = useState(false);
  const [servantSearch, setServantSearch] = useState('');

  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<ChurchNotification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load Servants list for direct targeted messaging
  useEffect(() => {
    if (!isOpen) return;

    if (initialTargetServant) {
      setSelectedServant(initialTargetServant);
      setTargetMode('direct');
    }

    setLoadingServants(true);
    fetch('/api/servants')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.servants)) {
          setServantsList(data.servants);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingServants(false));
  }, [isOpen, initialTargetServant]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/notifications?history=true');
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setHistoryList(data.notifications);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const senderName = isPriest
    ? 'قدس أبونا الكاهن'
    : currentRole === 'service_secretary'
    ? 'أمين الخدمة'
    : 'إدارة المنظومة';

  const handleSend = async () => {
    if (!message.trim()) {
      setErrorStatus('يرجى كتابة نص الرسالة أولاً');
      return;
    }

    if (targetMode === 'direct' && !selectedServant) {
      setErrorStatus('يرجى اختيار الخادم المستلم للرسالة الخاصة أولاً');
      return;
    }

    setIsSending(true);
    setErrorStatus(null);
    setSuccessStatus(null);

    try {
      const isDirect = targetMode === 'direct';
      const payload: any = {
        action: isDirect ? 'direct_servant' : 'broadcast',
        senderId: currentUser?.id,
        senderRole: currentRole,
        message: message.trim(),
      };

      if (isDirect && selectedServant) {
        payload.targetType = 'user';
        payload.targetUserId = selectedServant.user_id || selectedServant.id;
        payload.targetServantName = selectedServant.full_name;
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر إرسال الرسالة');
      }

      const successMsg = isDirect
        ? `تم إرسال الإشعار الخاص إلى الخادم (${selectedServant?.full_name}) بنجاح وسرية تامة! 🔒`
        : `تم إرسال التعميم بنجاح باسم "${senderName}" لجميع الخدام! 🕊️`;

      setSuccessStatus(successMsg);
      setMessage('');
      loadHistory();
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessStatus(null);
        onClose();
      }, 1900);
    } catch (err: any) {
      setErrorStatus(err.message || 'حدث خطأ أثناء الإرسال');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الرسالة نهائياً من المنظومة؟')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setHistoryList((prev) => prev.filter((n) => n.id !== id));
        window.dispatchEvent(new CustomEvent('organa:refresh_notifications'));
      } else {
        alert(data.error || 'تعذر حذف الرسالة');
      }
    } catch (err) {
      alert('حدث خطأ أثناء حذف الرسالة');
    } finally {
      setDeletingId(null);
    }
  };

  const handleWhatsAppShare = () => {
    if (!message.trim()) {
      setErrorStatus('اكتب الرسالة أولاً لمشاركتها على واتساب');
      return;
    }
    const targetLabel = targetMode === 'direct' && selectedServant ? `الخادم: ${selectedServant.full_name}` : 'كافة الخدام';
    const fullText = `*كنيسة الشهيد العظيم مارجرجس بسندبيس*\n*📢 ${senderName} (${targetLabel}):*\n\n${message.trim()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    window.open(url, '_blank');
  };

  const filteredServants = servantsList.filter((s) => {
    if (!servantSearch.trim()) return true;
    return (
      s.full_name.includes(servantSearch.trim()) ||
      (s.phone && s.phone.includes(servantSearch.trim())) ||
      (s.assigned_family_names && s.assigned_family_names.some((f) => f.includes(servantSearch.trim())))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-[#EAE3E4] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#702C3B] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Radio className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {isPriest ? 'رسائل وتعليقات قدس أبونا' : 'إدارة الرسائل والإشعارات'}
              </h3>
              <p className="text-[11px] text-white/80">إرسال خاص لخادم محدد أو تعميم عام للكل</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-[#EAE3E4] bg-[#FAF5F6] p-1.5 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('compose')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'compose'
                ? 'bg-white text-[#702C3B] shadow-sm'
                : 'text-[#81777A] hover:text-[#421923]'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>إرسال رسالة جديدة</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-[#702C3B] shadow-sm'
                : 'text-[#81777A] hover:text-[#421923]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل الرسائل المرسلة ({historyList.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'compose' ? (
            <>
              {/* Audience Type Selection */}
              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1.5">
                  وجهة الإرسال (المستلم):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetMode('broadcast')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                      targetMode === 'broadcast'
                        ? 'border-[#702C3B] bg-[#FAF5F6] text-[#702C3B] ring-2 ring-[#702C3B]/20'
                        : 'border-[#EAE3E4] bg-white text-[#81777A] hover:bg-[#FAF5F6]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Radio className="w-4 h-4" />
                        <span>كافة الخدام</span>
                      </span>
                      {targetMode === 'broadcast' && <Check className="w-4 h-4 text-[#702C3B]" />}
                    </div>
                    <span className="text-[10px] text-[#81777A]">تعميم عام يصل لكل الخدام</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetMode('direct')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 ${
                      targetMode === 'direct'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-600/20'
                        : 'border-[#EAE3E4] bg-white text-[#81777A] hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5 text-purple-800">
                        <Lock className="w-4 h-4" />
                        <span>خادم محدد بعينه</span>
                      </span>
                      {targetMode === 'direct' && <Check className="w-4 h-4 text-purple-700" />}
                    </div>
                    <span className="text-[10px] text-purple-700/80">رسالة سرية وخاصة له فقط</span>
                  </button>
                </div>
              </div>

              {/* Specific Servant Picker (When Direct Mode is selected) */}
              {targetMode === 'direct' && (
                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/60 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-purple-700" />
                      <span>حدد الخادم المستلم:</span>
                    </span>
                    {selectedServant && (
                      <span className="text-[11px] font-bold text-purple-800 bg-purple-200/70 px-2 py-0.5 rounded-md">
                        المختار: {selectedServant.full_name}
                      </span>
                    )}
                  </div>

                  {/* Servant Search & Dropdown */}
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-2.5" />
                      <input
                        type="text"
                        value={servantSearch}
                        onChange={(e) => setServantSearch(e.target.value)}
                        placeholder="ابحث باسم الخادم أو الأسرة..."
                        className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-purple-200 bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 border border-purple-100 rounded-lg p-1 bg-white">
                      {loadingServants ? (
                        <div className="text-center py-2 text-[11px] text-gray-500">جارٍ تحميل الخدام...</div>
                      ) : filteredServants.length === 0 ? (
                        <div className="text-center py-2 text-[11px] text-gray-500">لا يوجد خادم مطابق للبحث</div>
                      ) : (
                        filteredServants.map((srv) => {
                          const isSelected = selectedServant?.id === srv.id || selectedServant?.user_id === srv.user_id;
                          return (
                            <button
                              key={srv.id}
                              type="button"
                              onClick={() => {
                                setSelectedServant({
                                  id: srv.id,
                                  user_id: srv.user_id,
                                  full_name: srv.full_name,
                                });
                              }}
                              className={`w-full text-right p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-purple-600 text-white font-bold'
                                  : 'hover:bg-purple-50 text-[#421923]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="truncate">{srv.full_name}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded truncate ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {srv.assigned_family_names?.[0] || srv.family_name || 'عام'}
                                </span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Privacy Guarantee Notice */}
                  <div className="flex items-start gap-2 text-[11px] text-purple-950 bg-white/80 p-2 rounded-lg border border-purple-200">
                    <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>أمان وخصوصية تامة:</strong> هذا الإشعار سيظهر على موبايل وحساب الخادم (
                      {selectedServant ? selectedServant.full_name : 'المختار'}
                      ) فقط، ومستحيل يظهر لأي خادم آخر على الإطلاق.
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1.5">
                  نماذج رسائل سريعة:
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {PRESET_MESSAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessage(preset.text)}
                      className="text-right p-2 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] hover:bg-rose-50/80 hover:border-[#702C3B]/30 text-xs text-[#421923] font-medium transition-all"
                    >
                      {preset.label}: <span className="font-bold text-[#702C3B]">{preset.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#421923]">
                    نص الرسالة:
                  </label>
                  <span className="text-[11px] font-bold text-[#702C3B] bg-rose-50 px-2 py-0.5 rounded-md">
                    المرسل: {senderName}
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder={
                    targetMode === 'direct' && selectedServant
                      ? `اكتب الرسالة الخاصة التي ستصل للخادم ${selectedServant.full_name} فقط...`
                      : 'اكتب هنا الرسالة التي ستصل لكافة الخدام...'
                  }
                  className="w-full rounded-xl border border-[#EAE3E4] p-3 text-sm text-[#421923] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#702C3B] transition-all resize-none"
                />
              </div>

              {/* Alerts */}
              {errorStatus && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0" />
                  <span>{errorStatus}</span>
                </div>
              )}

              {successStatus && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successStatus}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !message.trim() || (targetMode === 'direct' && !selectedServant)}
                  className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                    targetMode === 'direct'
                      ? 'bg-purple-700 hover:bg-purple-800 disabled:bg-gray-300'
                      : 'bg-[#702C3B] hover:bg-[#5b2330] disabled:bg-gray-300'
                  }`}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الإرسال...</span>
                    </>
                  ) : targetMode === 'direct' ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>إرسال إشعار خاص إلى ({selectedServant?.full_name || 'الخادم'}) 🔒</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال تعميم باسم "{senderName}" 📢</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  disabled={!message.trim()}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  title="مشاركة على واتساب"
                >
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>واتساب 💬</span>
                </button>
              </div>
            </>
          ) : (
            /* History & Deletion View */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#81777A] pb-1 border-b border-[#EAE3E4]">
                <span>سجل الرسائل والإشعارات السابقة المرسلة</span>
                <span>(التحكم والحذف)</span>
              </div>

              {loadingHistory ? (
                <div className="p-8 text-center text-xs text-[#81777A] animate-pulse">
                  جارٍ تحميل سجل الرسائل...
                </div>
              ) : historyList.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#81777A]">
                  لا توجد رسائل سابقة في السجل.
                </div>
              ) : (
                <div className="space-y-2">
                  {historyList.map((n) => {
                    const isDirect = n.target_type === 'user';
                    return (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                          isDirect ? 'border-purple-200 bg-purple-50/40' : 'border-[#EAE3E4] bg-[#FAF5F6]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isDirect
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-rose-100 text-[#702C3B]'
                              }`}
                            >
                              {isDirect ? '🔒 إشعار خاص' : '📢 تعميم للكل'}
                            </span>

                            <span className="text-[10px] text-[#81777A]">
                              بواسطة: <strong>{n.sender_name}</strong>
                            </span>

                            <span className="text-[10px] text-[#81777A]">
                              {new Date(n.created_at).toLocaleDateString('ar-EG', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-[#421923] font-medium leading-relaxed">
                            {n.message}
                          </p>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(n.id)}
                          disabled={deletingId === n.id}
                          className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 active:scale-95 transition-all shrink-0"
                          title="حذف الرسالة نهائياً"
                        >
                          {deletingId === n.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
