'use client';

// ====================================================================
// ORGANA — Spiritual Follow-up Module (/spiritual)
// Liturgy, Communion, Sunday School
// The Great Martyr St. George Church – Sandbees, Egypt
// Exact Match with Reference Design System
// ====================================================================

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { Family, ServedMember, SpiritualStatus } from '@/types/organa';
import {
  HeartHandshake,
  Calendar,
  Check,
  X,
  HelpCircle,
  Search,
  Filter,
  Save,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { exportToExcel } from '@/lib/export/excel';
import { exportToPrintablePDF } from '@/lib/export/pdf';

export default function SpiritualPage() {
  const { currentRole, assignedFamilyId, canManageAllFamilies } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [members, setMembers] = useState<ServedMember[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState('2026-11-13');
  const [selectedFamilyId, setSelectedFamilyId] = useState(assignedFamilyId || 'fam-prep-boys');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local state for edits
  const [matrixState, setMatrixState] = useState<Record<string, { liturgy: SpiritualStatus; communion: SpiritualStatus; ss: SpiritualStatus }>>({});

  const loadData = () => {
    const activeFam = !canManageAllFamilies && assignedFamilyId ? assignedFamilyId : selectedFamilyId;
    const famParam = `&role=${currentRole}&userFamilyId=${activeFam}&familyId=${activeFam}`;
    Promise.all([
      fetch(`/api/families?role=${currentRole}&userFamilyId=${activeFam}`).then(r => r.json()),
      fetch(`/api/members?role=${currentRole}&familyId=${activeFam}&userFamilyId=${activeFam}`).then(r => r.json()),
      fetch(`/api/spiritual?role=${currentRole}&familyId=${activeFam}&date=${selectedDate}&userFamilyId=${activeFam}`).then(r => r.json()),
    ])
      .then(([fRes, mRes, sRes]) => {
        if (fRes.success) setFamilies(fRes.families);
        if (mRes.success) setMembers(mRes.members);
        if (sRes.success) {
          setFollowups(sRes.followups);
          const initialMap: Record<string, any> = {};
          for (const m of mRes.members || []) {
            const found = (sRes.followups || []).find((sf: any) => sf.member_id === m.id);
            initialMap[m.id] = {
              liturgy: found?.liturgy_attendance || 'not_recorded',
              communion: found?.communion_attendance || 'not_recorded',
              ss: found?.sunday_school_attendance || 'not_recorded',
            };
          }
          setMatrixState(initialMap);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (!canManageAllFamilies && assignedFamilyId) {
      setSelectedFamilyId(assignedFamilyId);
    }
    loadData();
  }, [selectedFamilyId, selectedDate, currentRole, assignedFamilyId, canManageAllFamilies]);

  const handleStatusChange = (memberId: string, field: 'liturgy' | 'communion' | 'ss', nextValue: SpiritualStatus) => {
    setMatrixState(prev => ({
      ...prev,
      [memberId]: {
        ...(prev[memberId] || { liturgy: 'not_recorded', communion: 'not_recorded', ss: 'not_recorded' }),
        [field]: nextValue,
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      for (const m of members) {
        const val = matrixState[m.id];
        if (val) {
          await fetch('/api/spiritual', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              memberId: m.id,
              date: selectedDate,
              data: {
                liturgy_attendance: val.liturgy,
                communion_attendance: val.communion,
                sunday_school_attendance: val.ss,
                general_followup_status: 'yes',
              },
              actorRole: currentRole,
            }),
          });
        }
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = members.filter(m =>
    !search || m.full_name.includes(search) || m.code.includes(search)
  );

  const handleExportExcel = () => {
    exportToExcel(
      `متابعة_روحية_${selectedDate}`,
      'المتابعة الروحية',
      filteredMembers.map(m => {
        const val = matrixState[m.id] || { liturgy: 'not_recorded', communion: 'not_recorded', ss: 'not_recorded' };
        return {
          code: m.code,
          name: m.full_name,
          liturgy: val.liturgy === 'yes' ? 'نعم' : (val.liturgy === 'no' ? 'لا' : 'لم يسجل'),
          communion: val.communion === 'yes' ? 'نعم' : (val.communion === 'no' ? 'لا' : 'لم يسجل'),
          sundaySchool: val.ss === 'yes' ? 'نعم' : (val.ss === 'no' ? 'لا' : 'لم يسجل'),
        };
      }),
      [
        { key: 'code', label: 'كود المخدوم' },
        { key: 'name', label: 'اسم المخدوم' },
        { key: 'liturgy', label: 'حضور القداس' },
        { key: 'communion', label: 'التناول' },
        { key: 'sundaySchool', label: 'مدارس الأحد' },
      ]
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4 max-w-xl mx-auto pb-24">
        {/* Header */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#702C3B]"></span>
            <h1 className="text-lg md:text-xl font-bold text-[#282326]">
              المتابعة الروحية وسجل القداسات
            </h1>
          </div>
          <p className="text-xs text-[#81777A]">
            رصد حضور القداس الإلهي والتناول من الأسرار المقدسة
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl border border-[#EAE3E4] bg-white text-xs font-bold text-[#282326] hover:bg-[#FAF5F6] flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#166534]" />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>

        {/* Privacy Notice Banner */}
        <div className="p-3 rounded-2xl bg-[#FAF5F6] border border-[#EAE3E4] text-[11px] text-[#81777A] flex items-start gap-2 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-[#702C3B] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#282326]">سياسة الخصوصية الكنسية: </strong>
            لا يتم تسجيل أي أسرار اعتراف على الإطلاق، وتقتصر البيانات فقط على حضور القداس والتناول ومدارس الأحد.
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#81777A] absolute right-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم المخدوم أو الكود..."
            className="w-full pr-10 pl-3 py-2.5 text-xs rounded-2xl border border-[#EAE3E4] bg-white focus:outline-none focus:border-[#702C3B] shadow-2xs"
          />
        </div>

        {/* Member Follow-up Cards */}
        <div className="space-y-2.5">
          {filteredMembers.map((m) => {
            const val = matrixState[m.id] || { liturgy: 'not_recorded', communion: 'not_recorded', ss: 'not_recorded' };
            const initials = m.full_name.split(' ').slice(0, 2).map(n => n[0]).join('');

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-[#EAE3E4] p-3 shadow-2xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#FAF5F6] text-[#702C3B] font-bold text-xs flex items-center justify-center border border-[#EAE3E4]">
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs md:text-sm text-[#282326]">{m.full_name}</h3>
                      <div className="text-[10px] text-[#81777A]">{m.code} • أسرة إعدادي بنين</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Liturgy toggle pill */}
                    <button
                      onClick={() => handleStatusChange(m.id, 'liturgy', val.liturgy === 'yes' ? 'no' : 'yes')}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                        val.liturgy === 'yes'
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : val.liturgy === 'no'
                          ? 'bg-[#FEE2E2] text-[#991B1B]'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      القداس {val.liturgy === 'yes' ? '✓' : val.liturgy === 'no' ? '❌' : '—'}
                    </button>

                    {/* Communion toggle pill */}
                    <button
                      onClick={() => handleStatusChange(m.id, 'communion', val.communion === 'yes' ? 'no' : 'yes')}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                        val.communion === 'yes'
                          ? 'bg-[#DCFCE7] text-[#166534]'
                          : val.communion === 'no'
                          ? 'bg-[#FEE2E2] text-[#991B1B]'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      التناول {val.communion === 'yes' ? '✓' : val.communion === 'no' ? '❌' : '—'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Save Button */}
        <div className="fixed bottom-16 md:bottom-6 left-0 right-0 max-w-xl mx-auto px-4 z-20 pointer-events-none">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="pointer-events-auto w-full py-3.5 rounded-2xl bg-[#5A1E2D] hover:bg-[#421923] text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-98 disabled:opacity-75"
          >
            {saveSuccess ? (
              <>
                <Check className="w-5 h-5 text-[#10B981]" />
                <span>تم حفظ المتابعة الروحية بنجاح!</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{saving ? 'جارٍ الحفظ...' : 'حفظ المتابعة الروحية'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}