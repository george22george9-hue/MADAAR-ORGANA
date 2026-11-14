'use client';

// ====================================================================
// ORGANA — Broadcast Notification Modal (أبونا / أمين الخدمة)
// Developed by MADAAR Technologies
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useState } from 'react';
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
  Radio
} from 'lucide-react';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_MESSAGES = [
  {
    label: '📓 تذكير تحضير الكشكول (الثلاثاء)',
    text: 'تذكير خدمة مارجرجس بسندبيس: موعدنا الجمعة القادمة، برجاء تحضير كشكول اللقاء والدرس.',
    type: 'tuesday_prep',
  },
  {
    label: '✝️ رسالة وبركة من قدس أبونا',
    text: 'سلام ونعمة من قدس أبونا.. صلواتنا معكم جميعاً، الخدمة أمانة مقدسة والرب يعوض تعب محبتكم.',
    type: 'priest_broadcast',
  },
  {
    label: '⏰ تنبيه بموعد الحضور',
    text: 'تنبيه لجميع الخدام: نرجو الالتزام بموعد الحضور في تمام الساعة 6:30 مساءً لبدء الصلاة معاً.',
    type: 'general',
  },
  {
    label: '💌 افتقاد المخدومين الغائبين',
    text: 'محبة وافتقاد: برجاء الاطمئنان والمتابعة التليفونية لجميع أبنائنا المخدومين الغائبين هذا الأسبوع.',
    type: 'general',
  },
];

export function BroadcastModal({ isOpen, onClose, onSuccess }: BroadcastModalProps) {
  const { currentUser, currentRole } = useAuth();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPriest = currentRole === 'priest';
  const senderRole = isPriest ? 'priest' : 'admin';
  const defaultSenderName = isPriest ? 'قدس أبونا الكاهن' : (currentUser?.full_name || 'إدارة الخدمة');

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
          senderName: defaultSenderName,
          senderRole: senderRole,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر إرسال الرسالة');
      }

      setSuccessStatus('تم إرسال الرسالة بنجاح لجميع الخدام في المنظومة! 🕊️');
      setMessage('');
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

  const handleWhatsAppShare = () => {
    if (!message.trim()) {
      setErrorStatus('اكتب الرسالة أولاً لمشاركتها على واتساب');
      return;
    }
    const fullText = `*كنيسة الشهيد العظيم مارجرجس بسندبيس*\n*${defaultSenderName}:*\n\n${message.trim()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-[#EAE3E4] overflow-hidden">
        {/* Header */}
        <div className="bg-[#702C3B] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isPriest ? 'رسالة من قدس أبونا للخدام' : 'إرسال تعميم / رسالة لجميع الخدام'}
              </h3>
              <p className="text-xs text-white/80">تصل فورياً لجميع الخدام كإشعار في المنظومة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-[#421923] mb-2">
              رسائل جاهزة وسريعة (اختر للتعبئة التلقائية):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_MESSAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessage(preset.text)}
                  className="text-right p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] hover:bg-rose-50/80 hover:border-[#702C3B]/30 text-xs text-[#421923] font-medium transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#421923]">
                نص الرسالة (تظهر كجملة واحدة واضحة):
              </label>
              <span className="text-[11px] text-[#81777A]">
                المرسل: {defaultSenderName}
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="اكتب هنا الرسالة التذكيرية أو التنبيه للخادم..."
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
                  <span>إرسال للجميع في المنظومة</span>
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
        </div>
      </div>
    </div>
  );
}
