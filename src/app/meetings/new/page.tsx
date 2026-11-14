'use client';

// ====================================================================
// ORGANA — Create New Meeting (/meetings/new)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { Family } from '@/types/organa';
import {
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  BookOpen
} from 'lucide-react';

export default function NewMeetingPage() {
  const router = useRouter();
  const { currentRole, assignedFamilyId, canManageAllFamilies } = useAuth();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [familyId, setFamilyId] = useState('fam-prep-boys');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('19:00');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonTopic, setLessonTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const famParam = !canManageAllFamilies && assignedFamilyId ? `&userFamilyId=${assignedFamilyId}` : '';
    fetch(`/api/families?role=${currentRole}${famParam}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setFamilies(res.families);
          if (assignedFamilyId) setFamilyId(assignedFamilyId);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assignedFamilyId, canManageAllFamilies, currentRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !lessonTitle.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          title: title.trim(),
          date,
          start_time: startTime,
          end_time: endTime,
          lesson_title: lessonTitle.trim(),
          lesson_topic: lessonTopic.trim(),
          notes: notes.trim(),
          actorRole: currentRole,
        }),
      });

      const json = await res.json();
      if (json.success) {
        // Redirect directly to the dynamic activity planner for this meeting!
        router.push(`/meetings/${json.meeting.id}/activities`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Link
            href="/meetings"
            className="text-xs text-[#702C3B] font-bold flex items-center gap-1 hover:underline"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لقائمة اللقاءات</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#EAE3E4] shadow-sm">
          <div className="border-b border-[#EAE3E4] pb-4 mb-6">
            <h1 className="text-xl font-bold text-[#421923]">إنشاء لقاء أسبوعي جديد</h1>
            <p className="text-xs text-[#81777A] mt-1">
              جدولة لقاء وتحديد موضوع الدرس لتهيئة خطة الفقرات وتوزيع الخدام والكشكول الإلكتروني
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#282326] mb-1">الأسرة أو المرحلة:</label>
              <select
                value={familyId}
                onChange={(e) => setFamilyId(e.target.value)}
                disabled={!canManageAllFamilies}
                className={`w-full p-2.5 rounded-xl border border-[#EAE3E4] text-xs focus:outline-none focus:border-[#702C3B] ${
                  !canManageAllFamilies ? 'bg-gray-100 cursor-not-allowed text-[#702C3B] font-bold' : 'bg-white'
                }`}
              >
                {families.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              {!canManageAllFamilies && (
                <span className="text-[10px] text-[#81777A] mt-1 block">
                  مقفلة تلقائياً على أسرتك المكلف بإدارتها
                </span>
              )}
            </div>

            <div>
              <label className="block font-bold text-[#282326] mb-1">عنوان اللقاء الأسبوعي:</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: اللقاء الأسبوعي — الصلاة الدائمة سر القوة"
                className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-[#282326] mb-1">تاريخ اللقاء:</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#282326] mb-1">وقت البدء:</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#282326] mb-1">وقت الانتهاء (اختياري):</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#282326] mb-1">عنوان الدرس الرئيسي:</label>
                <input
                  type="text"
                  required
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="مثال: دانيال في جب الأسود"
                  className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#282326] mb-1">المحور الروحي أو الفكرة العامة:</label>
                <input
                  type="text"
                  required
                  value={lessonTopic}
                  onChange={(e) => setLessonTopic(e.target.value)}
                  placeholder="مثال: الثقة في حفظ الله وسط التجارب"
                  className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#282326] mb-1">ملاحظات عامة عن اللقاء:</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توجيهات للخدام أو تنبيهات للمخدومين..."
                className="w-full p-2.5 rounded-xl border border-[#EAE3E4] focus:outline-none focus:border-[#702C3B]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#EAE3E4]">
              <Link
                href="/meetings"
                className="px-4 py-2 rounded-xl border border-[#EAE3E4] text-[#81777A] font-bold"
              >
                إلغاء
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#702C3B] text-white font-bold hover:bg-[#5A232F] transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>{submitting ? 'جارٍ الإنشاء...' : 'إنشاء وتخطيط الفقرات'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

