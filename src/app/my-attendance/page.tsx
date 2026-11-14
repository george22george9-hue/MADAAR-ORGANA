'use client';

// ====================================================================
// ORGANA — Servant Personal Attendance & History (/my-attendance)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import {
  UserCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Award
} from 'lucide-react';

export default function MyAttendancePage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sId = currentUser.id || '';
    const fId = currentUser.assigned_family_id || '';
    fetch(`/api/dashboard?role=servant&servantId=${sId}&familyId=${fId}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentUser.id, currentUser.assigned_family_id]);

  if (loading || !data) {
    return (
      <AppLayout>
        <div className="space-y-4 animate-pulse max-w-2xl mx-auto">
          <div className="h-28 bg-white rounded-2xl border border-[#EAE3E4]"></div>
          <div className="h-40 bg-white rounded-2xl border border-[#EAE3E4]"></div>
        </div>
      </AppLayout>
    );
  }

  const srv = data.servant;
  const history = data.history || [];

  return (
    <AppLayout>
      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-5 h-5 text-[#702C3B]" />
              <h1 className="text-xl font-bold text-[#421923]">سجل حضوري ومشاركاتي</h1>
            </div>
            <p className="text-xs text-[#81777A]">
              الخادم: {srv?.full_name} • نسبة الالتزام بالحضور: <strong className="text-[#10B981]">{srv?.attendance_rate || 100}%</strong>
            </p>
          </div>

          <div className="text-center p-3 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4]">
            <span className="text-[10px] text-[#81777A] block">الأنشطة المنفذة</span>
            <span className="text-xl font-bold text-[#702C3B]">{srv?.activities_count || 0}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm space-y-4">
          <h2 className="font-bold text-sm text-[#421923] border-b border-[#EAE3E4] pb-3">
            سجل المشاركات الموثقة باللقاءات
          </h2>

          {history.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#81777A]">لا توجد مشاركات مسجلة بعد.</div>
          ) : (
            <div className="space-y-2.5">
              {history.map((h: any) => (
                <div key={h.id} className="p-3.5 rounded-xl bg-[#FAF5F6] border border-[#EAE3E4] text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#282326] text-sm">{h.activity_title}</div>
                    <div className="text-[11px] text-[#81777A] mt-0.5">{h.meeting_title}</div>
                  </div>

                  <div className="text-left">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      شارك بالفعل
                    </span>
                    <span className="text-[10px] text-[#81777A] block mt-0.5">{h.meeting_date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

