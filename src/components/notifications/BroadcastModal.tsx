'use client';

// ====================================================================
// ORGANA — Broadcast Notification Modal & Message History Manager
// "عايز من صفحة الأدارة اقدر اتحكم في الرسائل الي اتبعتت قبل كده اني امسحها"
// Developed by MADAAR Technologies
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import {
  Send,
  X,
  BookOpen,
  Heart,
  Clock,
  Sparkles,
  Share2,
  CheckCircle2,
  Loader2,
  Radio,
  Smartphone,
  ShieldCheck,
  Lock,
  Trash2,
  History,
  AlertCircle
} from 'lucide-react';
import { ChurchNotification } from '@/types/organa';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTab?: 'compose' | 'history';
}

const PRESET_MESSAGES = [
  {
    label: '📓 تذكير تحضير الكشكول',
    text: 'برجاء التأكيد من التحضير وارسال الكشكول في الموعد المحدد.',
    sender: 'إدارة الأبلكيشن',
  },
];

export function BroadcastModal({ isOpen, onClose, onSuccess, initialTab = 'compose' }: BroadcastModalProps) {
  const { currentUser, currentRole } = useAuth();
  const isPriest = currentRole === 'priest';
  const isAdmin = currentRole === 'admin';

  const [activeTab, setActiveTab] = useState<'compose' | 'history'>(initialTab);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // History & Deletion State
  const [historyList, setHistoryList] = useState<ChurchNotification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/notifications');
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
    : 'إدارة الأبلكيشن';

  const handleSend = async () => {
    if (!message.trim()) {
      setErrorStatus('يرجى كتابة نص الرسالة أولاً');
      return;
    }

    setIsSending(true);
    setErrorStatus(null);
    setSuccessStatus(null);

    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'broadcast',
          senderId: currentUser?.id,
          senderRole: currentRole,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر إرسال الرسالة');
      }

      setSuccessStatus(`تم إرسال الرسالة بنجاح باسم "${senderName}" لجميع الخدام! 🕊️`);
      setMessage('');
      loadHistory();
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessStatus(null);
        onClose();
      }, 1800);
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
        setHistoryList(prev => prev.filter(n => n.id !== id));
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
    const fullText = `*كنيسة الشهيد العظيم مارجرجس بسندبيس*\n*📢 ${senderName}:*\n\n${message.trim()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-[#EAE3E4] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#702C3B] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Radio className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                {isPriest ? 'رسائل وتعليقات قدس أبونا' : 'منظومة الرسائل والتعاميم'}
              </h3>
              <p className="text-[11px] text-white/80">إرسال مباشر وتحكم في الرسائل السابقة</p>
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
            <span>سجل الرسائل المرسلة والتحكم ({historyList.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'compose' ? (
            <>
              {/* Sender Identity Card — Strictly Locked to Authenticated Role */}
              <div className="bg-[#FAF5F6] border border-[#EAE3E4] rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#702C3B]/10 flex items-center justify-center text-[#702C3B] font-bold">
                      {isPriest ? '✝️' : currentRole === 'service_secretary' ? <ShieldCheck className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-[11px] text-[#81777A] block font-medium">المرسل المعتمد للمنظومة:</span>
                      <span className="text-xs font-bold text-[#421923] flex items-center gap-1.5">
                        {senderName}
                        {isPriest && <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">راعٍ ومسؤول</span>}
                        {isAdmin && <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold">إدارة النظام</span>}
                        {currentRole === 'service_secretary' && <span className="text-[10px] bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-bold">أمانة الخدمة</span>}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>موثق تلقائياً 🔒</span>
                  </div>
                </div>
                <p className="text-[10px] text-[#81777A] mt-2 border-t border-[#EAE3E4]/70 pt-1.5 leading-relaxed">
                  يتم توثيق الرسالة وإرسالها حصرياً باسم صفحتك وصلاحيتك، وممنوع نهائياً الإرسال باسم حساب آخر لضمان الشفافية والمصداقية.
                </p>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-bold text-[#421923] mb-1.5">
                  تذكير جاهز وسريع:
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {PRESET_MESSAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessage(preset.text)}
                      className="text-right p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] hover:bg-rose-50/80 hover:border-[#702C3B]/30 text-xs text-[#421923] font-medium transition-all"
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
                    نص الرسالة (جملة واحدة واضحة):
                  </label>
                  <span className="text-[11px] font-bold text-[#702C3B] bg-rose-50 px-2 py-0.5 rounded-md">
                    المرسل: {senderName}
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="اكتب هنا التنبيه أو الرسالة التي ستصل للخدام..."
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
                  disabled={isSending || !message.trim()}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#702C3B] hover:bg-[#5b2330] disabled:bg-gray-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال باسم "{senderName}" 📢</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  disabled={!message.trim()}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  title="مشاركة على جروب الواتساب"
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
                <span>سجل الرسائل السابقة المرسلة في المنظومة</span>
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
                  {historyList.map(n => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] flex items-start justify-between gap-3 hover:border-gray-300 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            n.sender_name === 'إدارة الأبلكيشن'
                              ? 'bg-sky-100 text-sky-800'
                              : n.sender_name.includes('أبونا')
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-[#702C3B]'
                          }`}>
                            {n.sender_name}
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
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
