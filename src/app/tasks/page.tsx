'use client';

// ====================================================================
// ORGANA — Follow-up Tasks Module (/tasks)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { FollowupTask } from '@/types/organa';
import {
  HeartHandshake,
  CheckCircle2,
  Clock,
  Phone,
  Home,
  MessageCircle,
  Check,
  Search,
  Filter
} from 'lucide-react';

export default function TasksPage() {
  const { currentRole } = useAuth();
  const [tasks, setTasks] = useState<FollowupTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  const loadData = () => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(res => {
        if (res.success) setTasks(res.tasks);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          result: 'successful_contact',
          notes: 'تم الافتقاد والتواصل بنجاح وتم التأكيد على الحضور.',
          actorRole: currentRole,
        }),
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filterType === 'pending') return !t.is_completed;
    if (filterType === 'completed') return t.is_completed;
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <HeartHandshake className="w-5 h-5 text-[#702C3B]" />
              <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                مهام الافتقاد والمتابعة الميدانية
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              متابعة الزيارات المنزلية، المكالمات الهاتفية، والتواصل مع أسر المخدومين
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'all' ? 'bg-[#702C3B] text-white' : 'bg-[#FAF5F6] text-[#81777A]'
              }`}
            >
              الكل ({tasks.length})
            </button>
            <button
              onClick={() => setFilterType('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'pending' ? 'bg-[#702C3B] text-white' : 'bg-[#FAF5F6] text-[#81777A]'
              }`}
            >
              معلقة ({tasks.filter(t => !t.is_completed).length})
            </button>
            <button
              onClick={() => setFilterType('completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'completed' ? 'bg-[#702C3B] text-white' : 'bg-[#FAF5F6] text-[#81777A]'
              }`}
            >
              مكتملة ({tasks.filter(t => t.is_completed).length})
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`p-5 rounded-2xl border transition-all bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                t.is_completed ? 'border-[#EAE3E4] opacity-80' : 'border-amber-200 bg-amber-50/20 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base text-[#421923]">{t.member_name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF5F6] text-[#702C3B] border border-[#EAE3E4]">
                    {t.task_type === 'phone_call' ? 'مكالمة هاتفية' : (t.task_type === 'home_visit' ? 'زيارة منزلية' : 'تواصل بالكنيسة')}
                  </span>
                  {t.is_completed ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      مكتملة
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      مطلوب الافتقاد
                    </span>
                  )}
                </div>

                <div className="text-xs text-[#282326] mt-1 leading-relaxed">
                  {t.notes}
                </div>

                <div className="text-[11px] text-[#81777A] mt-2 flex items-center gap-3">
                  <span>الخادم المكلف: <strong>{t.servant_name || 'خادم الافتقاد'}</strong></span>
                  <span>•</span>
                  <span>موعد الإنجاز: {t.due_date}</span>
                </div>
              </div>

              {!t.is_completed && (
                <button
                  onClick={() => handleCompleteTask(t.id)}
                  className="px-4 py-2 rounded-xl bg-[#10B981] text-white font-bold text-xs hover:bg-[#059669] transition-colors flex items-center gap-1.5 self-end sm:self-center shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد إتمام الافتقاد</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

