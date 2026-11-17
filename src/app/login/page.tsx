'use client';

// ====================================================================
// ORGANA — Role-Based Church Login & Real Servant Registration Portal
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { UserRole, ChurchUser } from '@/types/organa';
import {
  Shield,
  FileCheck2,
  CalendarCheck,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  ChevronLeft,
  Sparkles,
  Info,
  Check,
  UserPlus,
  Clock,
  AlertCircle,
  Building2,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { getStagesForFamily } from '@/lib/constants/stages';

interface PersonaProfile {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  email: string;
  title: string;
  badge: string;
  desc: string;
}

const CHURCH_FAMILIES = [
  { id: 'fam-nursery', name: 'حضانة وملائكة' },
  { id: 'fam-pri1-2', name: 'أولى وتانية ابتدائي' },
  { id: 'fam-pri3-4', name: 'تالتة ورابعة ابتدائي' },
  { id: 'fam-pri5-6', name: 'خامسة وسادسة ابتدائي' },
  { id: 'fam-prep-boys', name: 'إعدادي بنين' },
  { id: 'fam-prep-girls', name: 'إعدادي بنات' },
  { id: 'fam-sec', name: 'ثانوي بنين وبنات' },
  { id: 'fam-servant-prep', name: 'إعداد خدام' },
  { id: 'fam-servants', name: 'اجتماع الخدام' },
  { id: 'fam-couples', name: 'أسرة العائلات' },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginAs, isAuthenticated, isLoadingAuth } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoadingAuth, isAuthenticated, router]);

  // Default to real login form
  const [activeTab, setActiveTab] = useState<'form' | 'register'>('form');

  // Form State (Login)
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formPendingNotice, setFormPendingNotice] = useState<string | null>(null);

  // Registration State (Join Request)
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFamilyId, setRegFamilyId] = useState('fam-prep-boys');
  const [regStage, setRegStage] = useState('أولى إعدادي');
  const [regRole, setRegRole] = useState<'family_leader' | 'servant'>('servant');
  const [regNotes, setRegNotes] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);
  const [regErrorMessage, setRegErrorMessage] = useState<string | null>(null);

  // Handle Form Login Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormPendingNotice(null);

    const term = phoneOrEmail.trim();
    if (!term) {
      setFormError('يرجى إدخال رقم الهاتف أو البريد الإلكتروني');
      return;
    }

    if (!password.trim()) {
      setFormError('يرجى إدخال كلمة المرور للمتابعة.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrEmail: term, password }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        loginAs(data.user.role, data.user);
        router.push('/dashboard');
        return;
      }

      if (data.pendingNotice) {
        setFormPendingNotice(data.pendingNotice);
        return;
      }

      if (data.error) {
        setFormError(data.error);
        return;
      }

      setFormError('تعذر تسجيل الدخول. يرجى التأكد من صحة البيانات والمحاولة مجدداً.');
    } catch {
      setFormError('حدث خطأ أثناء محاولة تسجيل الدخول. يرجى التأكد من اتصال السيرفر.');
    }
  };

  // Handle Registration Submit (Join Request)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrorMessage(null);
    setRegSuccessMessage(null);

    if (!regFullName.trim() || !regPhone.trim()) {
      setRegErrorMessage('يرجى ملء الاسم بالكامل ورقم الموبايل');
      return;
    }

    setRegSubmitting(true);
    try {
      const res = await fetch('/api/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName.trim(),
          phone: regPhone.trim(),
          email: regEmail.trim() || undefined,
          password: regPassword || 'organa2026',
          requestedFamilyId: regFamilyId,
          requestedStage: regStage,
          requestedRole: regRole,
          notes: regNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setRegErrorMessage(data.error || 'فشل إرسال طلب الانضمام.');
      } else {
        const familyObj = CHURCH_FAMILIES.find(f => f.id === regFamilyId);
        setRegSuccessMessage(
          `تم إرسال طلبك بنجاح! تم تسجيل طلب الانضمام لأسرة "${familyObj?.name}" بصفتك "${regRole === 'family_leader' ? 'أمين الأسرة' : 'خادم في الأسرة'}". طلبك الآن بانتظار المراجعة والاعتماد من إدارة المنظومة أو قدس أبونا الكاهن أو أمين الخدمة لتفعيل حسابك.`
        );
        // Reset form
        setRegFullName('');
        setRegPhone('');
        setRegEmail('');
        setRegPassword('');
        setRegNotes('');
      }
    } catch (err) {
      setRegErrorMessage('تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الخادم والمحاولة ثانية.');
    } finally {
      setRegSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4F3] flex flex-col justify-between py-6 px-3 md:px-6">
      <div className="max-w-md w-full mx-auto space-y-4 pt-2">
        {/* Church & App Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-[#702C3B] text-white items-center justify-center font-bold text-3xl shadow-lg ring-4 ring-[#F0E4E7]">
            أ
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#421923] tracking-tight">
              أورجانا | ORGANA
            </h1>
            <p className="text-xs font-semibold text-[#702C3B] mt-0.5">
              كنيسة الشهيد العظيم مارجرجس — سندبيس
            </p>
            <p className="text-[11px] text-[#81777A] mt-0.5">
              منظومة إدارة خدمة الكنيسة ومدارس الأحد • العام الكنسي 2026–2027
            </p>
          </div>
        </div>

        {/* Tab Switcher (تسجيل الدخول vs طلب انضمام جديد) */}
        <div className="bg-[#EAE3E4]/70 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold shadow-2xs">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'form'
                ? 'bg-[#702C3B] text-white shadow-xs'
                : 'text-[#421923] hover:text-[#702C3B]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>تسجيل الدخول</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-[#702C3B] text-white shadow-xs'
                : 'text-[#421923] hover:text-[#702C3B]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>طلب انضمام جديد للخدمة</span>
          </button>
        </div>

        {/* TAB 1: PHONE / EMAIL LOGIN FORM (DEFAULT) */}
        {activeTab === 'form' && (
          <form
            onSubmit={handleFormSubmit}
            className="p-5 rounded-3xl bg-white border border-[#EAE3E4] shadow-xs space-y-4 animate-in fade-in duration-200"
          >
            <div>
              <h2 className="text-base font-bold text-[#421923]">تسجيل الدخول للمنظومة</h2>
              <p className="text-xs text-[#81777A] mt-0.5">
                أدخل رقم هاتفك المحمول المسجل وكلمة المرور
              </p>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{formError}</div>
              </div>
            )}

            {formPendingNotice && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="block font-bold mb-0.5">طلبك قيد المراجعة والاعتماد:</strong>
                  {formPendingNotice}
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#421923] block mb-1">
                  رقم الهاتف المحمول:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#81777A] absolute right-3 top-3" />
                  <input
                    type="text"
                    required
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-right font-mono focus:outline-none focus:border-[#702C3B]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#421923] block mb-1">
                  كلمة المرور:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#81777A] absolute right-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الخاصة بحسابك"
                    dir="ltr"
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-right font-mono focus:outline-none focus:border-[#702C3B]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#702C3B] hover:bg-[#5A1E2D] text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>تسجيل الدخول للمنظومة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="pt-2 border-t border-[#EAE3E4] flex items-center justify-between text-xs">
              <span className="text-[#81777A]">خادم أو أمين أسرة جديد؟</span>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="font-bold text-[#702C3B] hover:underline"
              >
                تقديم طلب انضمام واعتماد ←
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: REAL SERVANT / LEADER REGISTRATION (JOIN REQUEST) */}
        {activeTab === 'register' && (
          <form
            onSubmit={handleRegisterSubmit}
            className="p-5 rounded-3xl bg-white border border-[#EAE3E4] shadow-xs space-y-4 animate-in fade-in duration-200"
          >
            <div>
              <div className="flex items-center gap-1.5 text-[#702C3B] font-bold text-xs mb-1">
                <UserPlus className="w-4 h-4" />
                <span>طلب انضمام جديد للخدمة</span>
              </div>
              <h2 className="text-base font-bold text-[#421923]">تسجيل خادم أو أمين أسرة</h2>
              <p className="text-xs text-[#81777A] mt-0.5 leading-relaxed">
                سجل بياناتك الحقيقية واختر أسرتك والصفة المطلوبة. سيصل طلبك فوراً لإدارة المنظومة والآباء الكهنة وأمناء الخدمة للمراجعة والاعتماد.
              </p>
            </div>

            {regSuccessMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium">{regSuccessMessage}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className="w-full py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
                >
                  الرجوع لصفحة الدخول
                </button>
              </div>
            )}

            {regErrorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{regErrorMessage}</div>
              </div>
            )}

            {!regSuccessMessage && (
              <div className="space-y-3 text-xs">
                {/* Full Name */}
                <div>
                  <label className="font-bold text-[#421923] block mb-1">
                    الاسم بالكامل (ثلاثي أو رباعي): <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="مثال: الخادم مينا سمير حنا"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="font-bold text-[#421923] block mb-1">
                    رقم الهاتف المحمول (للتواصل وتسجيل الدخول): <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-right font-mono focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="font-bold text-[#81777A] block mb-1">
                    البريد الإلكتروني (اختياري):
                  </label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    dir="ltr"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-right font-mono focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                {/* Choose Family */}
                <div>
                  <label className="font-bold text-[#421923] block mb-1">
                    اختر الأسرة / الفصل المراد الخدمة به: <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#81777A] absolute right-3 top-3" />
                    <select
                      value={regFamilyId}
                      onChange={(e) => {
                        const newFamId = e.target.value;
                        setRegFamilyId(newFamId);
                        const stages = getStagesForFamily(newFamId);
                        setRegStage(stages[0] || 'عام');
                      }}
                      className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] font-bold text-[#421923] focus:outline-none focus:border-[#702C3B]"
                    >
                      {CHURCH_FAMILIES.map(fam => (
                        <option key={fam.id} value={fam.id}>
                          {fam.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Choose Stage inside Family */}
                {(() => {
                  const stages = getStagesForFamily(regFamilyId);
                  if (stages.length <= 1 && stages[0] === 'عام') return null;
                  return (
                    <div>
                      <label className="font-bold text-[#421923] block mb-1">
                        المرحلة الدراسية المراد الخدمة بها داخل الفصل: <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={regStage}
                        onChange={(e) => setRegStage(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] font-bold text-[#702C3B] focus:outline-none focus:border-[#702C3B]"
                      >
                        {stages.map(st => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                {/* Choose Role */}
                <div>
                  <label className="font-bold text-[#421923] block mb-1.5">
                    اختر الصفة المطلوبة في الأسرة: <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegRole('servant')}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                        regRole === 'servant'
                          ? 'border-[#702C3B] bg-[#FAF5F6] text-[#702C3B] shadow-2xs'
                          : 'border-[#EAE3E4] bg-white text-[#81777A] hover:bg-[#FAF5F6]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#421923]">🤝 خادم في الأسرة</span>
                        {regRole === 'servant' && <Check className="w-3.5 h-3.5 text-[#702C3B]" />}
                      </div>
                      <span className="text-[10px] text-[#81777A]">
                        متابعة وافتقاد مخدومي المرحلة
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegRole('family_leader')}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                        regRole === 'family_leader'
                          ? 'border-[#B45309] bg-amber-50 text-[#92400E] shadow-2xs'
                          : 'border-[#EAE3E4] bg-white text-[#81777A] hover:bg-[#FAF5F6]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#92400E]">👑 أمين الأسرة</span>
                        {regRole === 'family_leader' && <Check className="w-3.5 h-3.5 text-[#92400E]" />}
                      </div>
                      <span className="text-[10px] text-[#81777A]">
                        مسؤول الكشكول واللقاء الأسبوعي
                      </span>
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="font-bold text-[#421923] block mb-1">
                    كلمة المرور المطلوبة لحسابك:
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="organa2026 (أو اكتب كلمة مرور خاصة بك)"
                    dir="ltr"
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] text-right font-mono focus:outline-none focus:border-[#702C3B]"
                  />
                </div>

                {/* Notes (Optional) */}
                <div>
                  <label className="font-bold text-[#81777A] block mb-1">
                    ملاحظات أو نبذة مختصرة للخدمة (اختياري):
                  </label>
                  <textarea
                    rows={2}
                    value={regNotes}
                    onChange={(e) => setRegNotes(e.target.value)}
                    placeholder="مثال: خريج معهد إعداد خدام، خبرة سابقة في الخدمة..."
                    className="w-full p-2.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B] text-xs resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4] text-[11px] text-[#81777A] leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#702C3B] shrink-0 mt-0.5" />
                  <span>
                    <strong>تنبيه رعوي:</strong> لن يتم تفعيل الحساب إلا بعد اعتماده من قبل <strong>إدارة المنظومة</strong>، <strong>الآباء الكهنة</strong>، أو <strong>أمناء الخدمة</strong>.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={regSubmitting}
                  className="w-full py-3 rounded-xl bg-[#702C3B] hover:bg-[#5A1E2D] text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  {regSubmitting ? (
                    <span>جارٍ إرسال الطلب...</span>
                  ) : (
                    <>
                      <span>إرسال طلب الانضمام والاعتماد</span>
                      <ChevronLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        )}

        {/* Footer Note */}
        <div className="text-center text-[11px] text-[#81777A] pt-2">
          كنيسة الشهيد العظيم مارجرجس بسندبيس • تطوير MADAAR Technologies
        </div>
      </div>
    </div>
  );
}
