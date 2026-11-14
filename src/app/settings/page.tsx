'use client';

// ====================================================================
// ORGANA — System Settings & Church Policies (/settings)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { SystemSettings } from '@/types/organa';
import {
  Settings,
  Save,
  Check,
  Building,
  AlertTriangle,
  Lock,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function SettingsPage() {
  const { currentRole, currentUser, canEditSettings } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
  const [churchNameAr, setChurchNameAr] = useState('');
  const [churchNameEn, setChurchNameEn] = useState('');
  const [absenceThreshold, setAbsenceThreshold] = useState(3);
  const [servantCanViewAll, setServantCanViewAll] = useState(false);
  const [allowServantAttendance, setAllowServantAttendance] = useState(true);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const loadData = () => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.settings) {
          setSettings(res.settings);
          setChurchNameAr(res.settings.church_name_ar);
          setChurchNameEn(res.settings.church_name_en);
          setAbsenceThreshold(res.settings.consecutive_absence_threshold);
          setServantCanViewAll(res.settings.servant_can_view_all_family_members);
          setAllowServantAttendance(res.settings.allow_servant_attendance_recording);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          church_name_ar: churchNameAr,
          church_name_en: churchNameEn,
          consecutive_absence_threshold: absenceThreshold,
          servant_can_view_all_family_members: servantCanViewAll,
          allow_servant_attendance_recording: allowServantAttendance,
          actorRole: currentRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.settings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || newPassword.length < 4) {
      setPasswordError('كلمة المرور الجديدة يجب ألا تقل عن 4 خانات');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          oldPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordSuccess('تم تحديث كلمة المرور بنجاح! احتفظ بكلمة مرورك الجديدة لاستخدامها عند تسجيل الدخول.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError(data.error || 'فشل تحديث كلمة المرور');
      }
    } catch {
      setPasswordError('حدث خطأ أثناء الاتصال بالسيرفر');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading || !settings) {
    return (
      <AppLayout>
        <div className="space-y-4 animate-pulse max-w-3xl mx-auto">
          <div className="h-28 bg-white rounded-2xl border border-[#EAE3E4]"></div>
          <div className="h-64 bg-white rounded-2xl border border-[#EAE3E4]"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-[#702C3B]" />
              <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                إعدادات المنظومة وسياسات الخدمة
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              تخصيص هوية الكنيسة، عتبة رصد الغياب المتكرر، وسياسات خصوصية الخدام
            </p>
          </div>

          {canEditSettings && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-[#702C3B] text-white text-xs font-bold hover:bg-[#5A232F] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {saveSuccess ? <Check className="w-4 h-4 text-[#10B981]" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'جارٍ الحفظ...' : (saveSuccess ? 'تم الحفظ بنجاح!' : 'حفظ الإعدادات')}</span>
            </button>
          )}
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#EAE3E4] shadow-sm p-6 space-y-6 text-xs">
          {/* Church Identity */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#421923] flex items-center gap-2 border-b border-[#EAE3E4] pb-2">
              <Building className="w-4 h-4 text-[#702C3B]" />
              <span>هوية الكنيسة</span>
            </h2>

            <div>
              <label className="block font-bold text-[#282326] mb-1">اسم الكنيسة باللغة العربية:</label>
              <input
                type="text"
                disabled={!canEditSettings}
                value={churchNameAr}
                onChange={(e) => setChurchNameAr(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] disabled:bg-[#FAF5F6]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#282326] mb-1">اسم الكنيسة باللغة الإنجليزية:</label>
              <input
                type="text"
                disabled={!canEditSettings}
                value={churchNameEn}
                onChange={(e) => setChurchNameEn(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] disabled:bg-[#FAF5F6]"
              />
            </div>
          </div>

          {/* Absence Alert Policy */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#421923] flex items-center gap-2 border-b border-[#EAE3E4] pb-2">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              <span>سياسة رصد وتنبيهات الغياب المتكرر</span>
            </h2>

            <div>
              <label className="block font-bold text-[#282326] mb-1">
                عتبة توليد تنبيه الغياب المتتالي (بالأسابيع):
              </label>
              <input
                type="number"
                min={1}
                max={10}
                disabled={!canEditSettings}
                value={absenceThreshold}
                onChange={(e) => setAbsenceThreshold(parseInt(e.target.value) || 3)}
                className="w-32 p-2 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] disabled:bg-[#FAF5F6]"
              />
              <span className="text-[11px] text-[#81777A] block mt-1">
                القيمة الافتراضية الموصى بها كنسياً: 3 لقاءات متتالية لتوليد تنبيه افتقاد فوري.
              </span>
            </div>
          </div>

          {/* Privacy & Permissions Policy */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#421923] flex items-center gap-2 border-b border-[#EAE3E4] pb-2">
              <ShieldCheck className="w-4 h-4 text-[#702C3B]" />
              <span>سياسات الخصوصية وصلاحيات الخدام</span>
            </h2>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4]">
              <input
                type="checkbox"
                id="viewAll"
                disabled={!canEditSettings}
                checked={servantCanViewAll}
                onChange={(e) => setServantCanViewAll(e.target.checked)}
                className="mt-1 rounded border-[#EAE3E4] text-[#702C3B]"
              />
              <label htmlFor="viewAll" className="cursor-pointer">
                <strong className="block text-[#282326]">السماح للخادم برؤية كافة مخدومي أسرته</strong>
                <span className="text-[11px] text-[#81777A]">
                  عند إلغاء هذا الخيار، يقتصر وصول الخادم فقط على المخدومين المكلف بهم رسمياً في الافتقاد.
                </span>
              </label>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4]">
              <input
                type="checkbox"
                id="takeAtt"
                disabled={!canEditSettings}
                checked={allowServantAttendance}
                onChange={(e) => setAllowServantAttendance(e.target.checked)}
                className="mt-1 rounded border-[#EAE3E4] text-[#702C3B]"
              />
              <label htmlFor="takeAtt" className="cursor-pointer">
                <strong className="block text-[#282326]">السماح للخدام برصد حضور لقاء الأسرة</strong>
                <span className="text-[11px] text-[#81777A]">
                  تمكين الخادم من تسجيل الحضور جنباً إلى جنب مع أمين الأسرة أثناء انعقاد اللقاء.
                </span>
              </label>
            </div>
          </div>

          {canEditSettings && (
            <div className="pt-3 border-t border-[#EAE3E4] flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#702C3B] text-white font-bold hover:bg-[#5A232F] shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}</span>
              </button>
            </div>
          )}
        </form>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl border border-[#EAE3E4] shadow-sm p-6 space-y-4 text-xs">
          <div className="flex items-center gap-2 border-b border-[#EAE3E4] pb-2">
            <KeyRound className="w-4 h-4 text-[#702C3B]" />
            <h2 className="text-sm font-bold text-[#421923]">أمان الحساب وتغيير كلمة المرور</h2>
          </div>

          <p className="text-xs text-[#81777A]">
            يمكنك تغيير كلمة المرور لحسابك ({currentUser.full_name}) لضمان سرية وأمان دخولك للمنظومة.
          </p>

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="block font-bold text-[#282326] mb-1">كلمة المرور الحالية:</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية"
                dir="ltr"
                className="w-full sm:w-80 p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] font-mono text-right"
              />
            </div>

            <div>
              <label className="block font-bold text-[#282326] mb-1">كلمة المرور الجديدة:</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="كلمة المرور الجديدة (4 خانات فأكثر)"
                dir="ltr"
                className="w-full sm:w-80 p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] font-mono text-right"
              />
            </div>

            <div>
              <label className="block font-bold text-[#282326] mb-1">تأكيد كلمة المرور الجديدة:</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                dir="ltr"
                className="w-full sm:w-80 p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B] font-mono text-right"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-6 py-2.5 rounded-xl bg-[#5A1E2D] hover:bg-[#421923] text-white font-bold shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                <span>{passwordLoading ? 'جارٍ التحديث...' : 'تحديث كلمة المرور'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

