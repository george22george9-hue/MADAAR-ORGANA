'use client';

// ====================================================================
// ORGANA — Academic Years & Annual Promotion Management (/academic-years)
// مطرانية شبرا الخيمة وتوابعها – كنيسة الشهيد العظيم مارجرجس بسندبيس
// «ارعَ غنمي... ارعَ خرافي»
// Developed by MADAAR Technologies
// ====================================================================

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { AcademicYear, PromotionRule, Family, Servant } from '@/types/organa';
import {
  CalendarDays,
  Sliders,
  Wand2,
  UserCheck,
  History,
  GraduationCap,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { YearsTab } from '@/components/academic-years/YearsTab';
import { RulesTab } from '@/components/academic-years/RulesTab';
import { PromotionWizardTab } from '@/components/academic-years/PromotionWizardTab';
import { ServantAssignmentTab } from '@/components/academic-years/ServantAssignmentTab';
import { PromotionLogsTab } from '@/components/academic-years/PromotionLogsTab';

export default function AcademicYearsPage() {
  const { currentRole, canManageUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'years' | 'rules' | 'wizard' | 'servants' | 'logs'>('years');

  // State
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [rules, setRules] = useState<PromotionRule[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [servants, setServants] = useState<Servant[]>([]);
  const [loading, setLoading] = useState(true);

  const isPrivileged = currentRole === 'admin' || currentRole === 'priest' || currentRole === 'service_secretary';

  // Fetch all initial data
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [yearsRes, rulesRes, famRes, servRes] = await Promise.all([
        fetch('/api/academic-years').then((r) => r.json()),
        fetch('/api/academic-years/promotions/rules').then((r) => r.json()),
        fetch('/api/families').then((r) => r.json()),
        fetch('/api/servants').then((r) => r.json()),
      ]);

      if (yearsRes?.success) setYears(yearsRes.years || []);
      if (rulesRes?.success) setRules(rulesRes.rules || []);
      if (famRes?.success) setFamilies(famRes.families || []);
      if (servRes?.success) setServants(servRes.servants || []);
    } catch (err) {
      console.error('Error loading academic management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const activeYear = years.find((y) => y.is_active);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Church Identity Header */}
        <div className="bg-gradient-to-l from-white via-[#FAF5F6] to-white rounded-3xl p-6 sm:p-8 border border-[#EAE3E4] shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#702C3B] tracking-wide mb-1.5">
                <Sparkles className="w-4 h-4 text-[#702C3B]" />
                <span>مطرانية شبرا الخيمة وتوابعها – كنيسة الشهيد العظيم مارجرجس بسندبيس</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#421923] tracking-tight">
                إدارة السنوات الدراسية والترحيل السنوي
              </h1>
              <p className="text-xs text-[#81777A] mt-1 font-medium">
                «ارعَ غنمي... ارعَ خرافي» • ترقية المراحل، توزيع الخدام، وحفظ الأرشيف التاريخي التراكمي للخدمة
              </p>
            </div>

            {/* Active Year Pill */}
            {activeYear && (
              <div className="shrink-0 bg-white/90 backdrop-blur-sm border border-[#702C3B]/20 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#702C3B] text-white flex items-center justify-center shadow-inner">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold">السنة الكنسية النشطة</div>
                  <div className="text-base font-black text-[#421923]">{activeYear.name}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold font-mono">
                    {activeYear.start_date} ➔ {activeYear.end_date}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-[#EAE3E4] p-1.5 shadow-sm flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('years')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'years'
                ? 'bg-[#702C3B] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#702C3B] hover:bg-[#FAF5F6]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>السنوات الكنسية ({years.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'rules'
                ? 'bg-[#702C3B] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#702C3B] hover:bg-[#FAF5F6]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>قواعد الانتقال ({rules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('wizard')}
            className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'wizard'
                ? 'bg-[#702C3B] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#702C3B] hover:bg-[#FAF5F6]'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>معالج الترحيل السنوي</span>
          </button>

          <button
            onClick={() => setActiveTab('servants')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'servants'
                ? 'bg-[#702C3B] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#702C3B] hover:bg-[#FAF5F6]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>توزيع الخدام السنوي</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-[#702C3B] text-white shadow-sm'
                : 'text-gray-600 hover:text-[#702C3B] hover:bg-[#FAF5F6]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل الترحيل والأرشيف</span>
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-[#EAE3E4] p-12 text-center text-xs text-gray-400">
            جاري تحميل بيانات المنظومة...
          </div>
        ) : (
          <div>
            {activeTab === 'years' && (
              <YearsTab
                years={years}
                canManage={isPrivileged}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'rules' && (
              <RulesTab
                rules={rules}
                families={families}
                canManage={isPrivileged}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'wizard' && (
              <PromotionWizardTab
                years={years}
                families={families}
                canManage={isPrivileged}
                onSuccess={loadAllData}
              />
            )}

            {activeTab === 'servants' && (
              <ServantAssignmentTab
                years={years}
                families={families}
                servants={servants}
                canManage={isPrivileged}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'logs' && (
              <PromotionLogsTab
                canManage={isPrivileged}
                onRefresh={loadAllData}
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
