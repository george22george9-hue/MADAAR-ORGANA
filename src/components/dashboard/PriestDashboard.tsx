'use client';

// ====================================================================
// ORGANA — Admin/Priest Dashboard (لوحة الإدارة الشاملة)
// Simplified & Clean
// ====================================================================

import React, { useEffect, useState } from 'react';
import {
  Users,
  FolderTree,
  UserCheck,
  AlertTriangle,
  CalendarCheck,
  BookOpen,
  ShieldCheck,
  ChevronLeft,
  BarChart3,
  MessageCircle,
  Phone,
  Send,
  Printer,
  Copy,
  Check,
  Sparkles,
  HeartPulse,
  UserX,
  Smartphone,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/auth-context';
import { PriestServantsReport } from '@/components/dashboard/PriestServantsReport';

export function PriestDashboard() {
  const { currentRole, currentUser } = useAuth();
  const [data, setData] = useState<any>({
    servantsCount: 0,
    membersCount: 0,
    submittedReports: 0,
    alertsCount: 0,
    familyStats: [],
  });
  const [loading, setLoading] = useState(true);
  const [copiedBrief, setCopiedBrief] = useState(false);

  const copySynaxisBrief = () => {
    const text = `📊 *ملخص النبض الرعوي لكنيسة الشهيد العظيم مارجرجس بسندبيس*
📅 تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}
«ارعَ غنمي... ارعَ خرافي»

👥 إجمالي المخدومين: ${data.membersCount || 0}
✝️ إجمالي الخدام: ${data.servantsCount || 0}
⚠️ تنبيهات الغياب والافتقاد العاجلة: ${data.alertsCount || 0}
📖 الكشاكيل والتقارير المستلمة: ${data.submittedReports || 0}

قطاعات وأسر الكنيسة:
${(data.familyStats || []).map((f: any) => `• ${f.name}: ${f.members_count || 0} مخدوم | ${f.servants_count || 0} خادم`).join('\n')}

بركة صلوات راعي الكنيسة وأبائنا الكهنة وخدامنا الأحباء.`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 3000);
    }
  };

  useEffect(() => {
    const roleParam = currentRole === 'admin' ? 'admin' : 'priest';
    fetch(`/api/dashboard?role=${roleParam}`)
      .then(r => r.json())
      .then(res => {
        if (res && res.success && res.data) {
          setData(res.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard:', err);
        setLoading(false);
      });
  }, [currentRole]);

  const roleLabel = currentRole === 'admin' ? 'إدارة المنظومة' : 'الكاهن';

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-24">
      {/* Hero Card */}
      <div className="bg-gradient-to-l from-[#5A1E2D] to-[#421923] text-white rounded-2xl p-5 shadow-md">
        <div className="flex items-center gap-1.5 text-xs text-white/80 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>{roleLabel} • {currentUser?.full_name}</span>
        </div>

        <h1 className="text-lg font-bold leading-tight">
          لوحة المتابعة الشاملة
        </h1>

        <div className="mt-3 pt-2.5 border-t border-white/15 flex flex-col gap-0.5">
          <span className="text-sm text-amber-300 font-extrabold tracking-wide">
            كنيسة الشهيد العظيم مارجرجس بسندبيس
          </span>
        </div>
      </div>

      {/* Quick Actions — Big Friendly Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {currentRole === 'priest' ? (
          <>
            <Link
              href="/attendance/servants"
              className="p-4 rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-[0.98] flex flex-col"
            >
              <UserCheck className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">غياب ومتابعة الخدام</span>
              <span className="text-[10px] text-white/80 mt-0.5">القداس، الكشكول، والدرس</span>
            </Link>

            <Link
              href="/alerts"
              className="p-4 rounded-2xl bg-amber-600 text-white shadow-sm hover:bg-amber-700 transition-all active:scale-[0.98] flex flex-col"
            >
              <Users className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">غياب المخدومين والافتقاد</span>
              <span className="text-[10px] text-white/80 mt-0.5">رعاية الحالات الغائبة</span>
            </Link>

            <Link
              href="/notebooks"
              className="p-4 rounded-2xl bg-[#702C3B] text-white shadow-sm hover:bg-[#5A232F] transition-all active:scale-[0.98] flex flex-col"
            >
              <BookOpen className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">الكشاكيل والتقارير</span>
              <span className="text-[10px] text-white/80 mt-0.5">متابعة تقارير الأسر</span>
            </Link>

            <Link
              href="/users?tab=requests"
              className="p-4 rounded-2xl bg-sky-700 text-white shadow-sm hover:bg-sky-800 transition-all active:scale-[0.98] flex flex-col"
            >
              <ShieldCheck className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">الخدام الجدد والصلاحيات</span>
              <span className="text-[10px] text-white/80 mt-0.5">اعتماد وتسكين الخدام</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/attendance"
              className="p-4 rounded-2xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-[0.98] flex flex-col"
            >
              <CalendarCheck className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">تسجيل الحضور</span>
              <span className="text-[10px] text-white/70 mt-0.5">رصد حضور اللقاء</span>
            </Link>

            <Link
              href="/attendance/servants"
              className="p-4 rounded-2xl bg-teal-700 text-white shadow-sm hover:bg-teal-800 transition-all active:scale-[0.98] flex flex-col"
            >
              <UserCheck className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">سجل غياب الخدام</span>
              <span className="text-[10px] text-white/70 mt-0.5">القداس والكشاكيل</span>
            </Link>

            <Link
              href="/notebooks"
              className="p-4 rounded-2xl bg-[#702C3B] text-white shadow-sm hover:bg-[#5A232F] transition-all active:scale-[0.98] flex flex-col"
            >
              <BookOpen className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">الكشاكيل</span>
              <span className="text-[10px] text-white/70 mt-0.5">تقارير الأسبوع</span>
            </Link>

            <Link
              href="/users"
              className="p-4 rounded-2xl bg-sky-700 text-white shadow-sm hover:bg-sky-800 transition-all active:scale-[0.98] flex flex-col"
            >
              <ShieldCheck className="w-7 h-7 mb-2 opacity-90" />
              <span className="font-bold text-sm">إدارة المستخدمين</span>
              <span className="text-[10px] text-white/70 mt-0.5">الحسابات والطلبات</span>
            </Link>
          </>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3E4] shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#81777A]">الخدام</span>
            <UserCheck className="w-4 h-4 text-[#702C3B]" />
          </div>
          <span className="text-2xl font-bold text-[#282326]">{data.servantsCount || 0}</span>
          <div className="text-[10px] text-[#81777A] mt-0.5">بجميع الأسر</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3E4] shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#81777A]">المخدومون</span>
            <Users className="w-4 h-4 text-[#702C3B]" />
          </div>
          <span className="text-2xl font-bold text-[#282326]">{data.membersCount || 0}</span>
          <div className="text-[10px] text-[#81777A] mt-0.5">إجمالي المخدومين</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3E4] shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#81777A]">الكشاكيل</span>
            <BookOpen className="w-4 h-4 text-[#702C3B]" />
          </div>
          <span className="text-2xl font-bold text-[#282326]">{data.submittedReports || 0}</span>
          <div className="text-[10px] text-[#81777A] mt-0.5">تم تسليمها</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#EAE3E4] border-r-4 border-r-red-500 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#81777A]">تنبيهات غياب</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-2xl font-bold text-red-600">{data.alertsCount || 0}</span>
          <Link href="/alerts" className="text-[10px] font-bold text-red-600 hover:underline mt-0.5 block">
            متابعة الافتقاد ←
          </Link>
        </div>
      </div>

      {/* Synaxis & Weekly Executive Actions Bar */}
      <div className="bg-gradient-to-l from-[#FAF5F6] to-white p-4 rounded-2xl border border-[#EAE3E4] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#702C3B] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#421923]">ملخص النبض الرعوي لمجمع الخدام الأسبوعي</h3>
            <p className="text-[10px] text-[#81777A]">جاهز بضغطة واحدة للعرض في الاجتماع أو المشاركة عبر واتساب</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copySynaxisBrief}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#702C3B]/30 hover:bg-[#FAF5F6] text-[#702C3B] text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
          >
            {copiedBrief ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">تم النسخ بنجاح!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#702C3B]" />
                <span>نسخ ملخص الواتساب 📋</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') window.print();
            }}
            className="px-3 py-1.5 rounded-xl bg-[#702C3B] hover:bg-[#5A1E2D] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة 🖨️</span>
          </button>
        </div>
      </div>

      {/* Direct Priestly Pastoral Radar (Urgent Cases Needing Abouna's Touch) */}
      {data.urgentPastoralCases && data.urgentPastoralCases.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-red-200 shadow-md p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-red-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
                <HeartPulse className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                  <span>رادار التدخل الرعوي المباشر لأبونا الكاهن</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                    {data.urgentPastoralCases.length} حالة عاجلة
                  </span>
                </h3>
                <p className="text-[10px] text-red-700">حالات انقطاع تحتاج اتصالاً أو رسالة محبة كهنوتية مباشرة لكسر حاجز الغياب</p>
              </div>
            </div>

            <Link href="/alerts" className="text-[11px] font-bold text-red-700 hover:underline flex items-center gap-0.5">
              <span>كل التنبيهات</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data.urgentPastoralCases.map((c: any) => {
              const targetPhone = c.guardian_phone || c.member_phone || '';
              const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
              const waPhone = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
              const waUrl = targetPhone ? `https://wa.me/20${waPhone}?text=${encodeURIComponent(
                `سلام ونعمة من كنيسة الشهيد العظيم مارجرجس بسندبيس.. أبونا يطمئن على الابن الحبيب (${c.member_name})، وحشتنا جداً في الكنيسة ومدارس الأحد وبنصليلك ونتمنى نشوفك الأسبوع القادم في وسطنا 🙏`
              )}` : null;

              return (
                <div key={c.id} className="p-3 rounded-xl bg-red-50/50 border border-red-100 hover:border-red-300 transition-all flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-xs font-bold text-[#282326]">{c.member_name}</strong>
                          {c.member_code && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-white border border-[#EAE3E4] rounded-md font-bold text-[#702C3B]">
                              {c.member_code}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#81777A] mt-0.5">
                          {c.family_name} • {c.member_stage || 'مخدوم'}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-bold text-[9px] shrink-0">
                        غياب {c.consecutive_absences_count} أسابيع
                      </span>
                    </div>

                    {c.guardian_phone && (
                      <div className="text-[10px] text-[#81777A] mt-1.5 flex items-center gap-1">
                        <span>ولي الأمر: {c.guardian_name || 'ولي الأمر'}</span>
                        <span className="font-mono text-gray-600" dir="ltr">({c.guardian_phone})</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-red-100/80">
                    {targetPhone ? (
                      <>
                        <a
                          href={`tel:${targetPhone}`}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>اتصال أبونا</span>
                        </a>

                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>واتساب أبونا 💬</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <span className="text-[10px] text-gray-500 py-1">لا يوجد رقم هاتف مسجل</span>
                    )}

                    <Link
                      href="/alerts"
                      className="py-1.5 px-2.5 rounded-lg border border-[#EAE3E4] bg-white text-[#81777A] hover:bg-gray-50 text-[10px] font-bold transition-colors shrink-0"
                    >
                      متابعة
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pastoral Servants Performance & Attendance Report */}
      <PriestServantsReport />

      {/* Families Grid */}
      {data.familyStats && data.familyStats.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#282326]">قطاعات وأسر الكنيسة</h2>
            <Link href="/families" className="text-xs font-bold text-[#702C3B] flex items-center gap-0.5 hover:underline">
              <span>عرض الكل</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {data.familyStats.map((fam: any) => (
              <Link
                key={fam.id}
                href="/families"
                className="bg-white p-3 rounded-xl border border-[#EAE3E4] shadow-sm hover:border-[#702C3B]/40 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${(fam.members_count || 0) > 0 ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                    <h3 className="font-bold text-xs text-[#282326] truncate">{fam.name}</h3>
                  </div>
                  {fam.open_alerts > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold shrink-0">
                      {fam.open_alerts} غياب
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#81777A]">
                  <span>{fam.members_count || 0} مخدوم</span>
                  <span>{fam.servants_count || 0} خادم</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-3 pb-6 flex flex-col items-center gap-2">
        <a
          href={`https://wa.me/201202074649?text=${encodeURIComponent(
            `بتواصل معاك بخصوص منظومة اورجانا الكنسية انا (${currentUser?.full_name || 'مستخدم المنظومة'})`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-all shadow-sm active:scale-95"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>تواصل مع المطور عبر واتساب 💬</span>
        </a>
        <div className="text-[10px] text-[#81777A] font-semibold tracking-wide">
          ORGANA • MADAAR Technologies
        </div>
      </div>
    </div>
  );
}
