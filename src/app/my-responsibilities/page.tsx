'use client';

// ====================================================================
// ORGANA — Servant Meeting Responsibilities (/my-responsibilities)
// Mobile-First Experience
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  BookOpen,
  MapPin,
  ChevronLeft
} from 'lucide-react';

export default function MyResponsibilitiesPage() {
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

  const assignments = data.myAssignments || [];

  return (
    <AppLayout>
      <div className="space-y-5 max-w-2xl mx-auto">
        <div className="bg-gradient-to-l from-[#702C3B] to-[#421923] text-white rounded-2xl p-6 shadow-sm">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold mb-2">
            <span>مسؤولياتي في الخدمة</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold">مهام وفقرات اللقاءات القادمة</h1>
          <p className="text-xs text-white/80 mt-1">
            جدول الفقرات والأنشطة المكلف بها من أمين الأسرة (إعداد، شرح، وسائل إيضاح، ورش)
          </p>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-[#EAE3E4] text-center text-xs text-[#81777A]">
            لا توجد تكليفات محددة للقاء القادم حالياً.
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((asn: any) => (
              <div
                key={asn.id}
                className="bg-white rounded-2xl border border-[#EAE3E4] p-5 shadow-sm hover:border-[#702C3B]/50 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-[#81777A] block mb-0.5">{asn.meeting_title}</span>
                    <h3 className="font-bold text-base text-[#421923]">{asn.activity_title}</h3>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F0E4E7] text-[#702C3B] border border-[#EAE3E4]">
                    {asn.responsibility === 'main_presenter' ? 'المقدم الرئيسي' :
                     asn.responsibility === 'assistant' ? 'مساعد' :
                     asn.responsibility === 'lesson_preparer' ? 'إعداد الدرس' :
                     asn.responsibility === 'presenter' ? 'شرح وتقديم' :
                     asn.responsibility === 'organizer' ? 'منظم' :
                     asn.responsibility === 'tech_support' ? 'دعم فني ووسائل' : 'مشارك'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#81777A] pt-2 border-t border-[#EAE3E4]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#702C3B]" />
                    <span>{asn.meeting_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#702C3B]" />
                    <span>الساعة {asn.start_time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

