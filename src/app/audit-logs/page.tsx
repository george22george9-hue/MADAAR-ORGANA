'use client';

// ====================================================================
// ORGANA — Audit Logs & Security Traceability (/audit-logs)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import React, { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/context/auth-context';
import { AuditLog } from '@/types/organa';
import {
  History,
  Shield,
  Search,
  Filter,
  User,
  Clock,
  Printer
} from 'lucide-react';
import { exportToPrintablePDF } from '@/lib/export/pdf';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/audit-logs')
      .then(r => r.json())
      .then(res => {
        if (res.success) setLogs(res.logs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(l =>
    !search || l.description.includes(search) || l.user_name.includes(search) || l.action.includes(search)
  );

  const handlePrint = () => {
    exportToPrintablePDF(
      'سجل التدقيق والعمليات الإدارية (Audit Logs)',
      'كنيسة الشهيد العظيم مارجرجس بسندبيس — الرقابة الإدارية',
      ['المستخدم', 'الدور', 'العملية', 'البيان والتفاصيل', 'التوقيت'],
      filteredLogs.map(l => [
        l.user_name,
        l.user_role,
        l.action,
        l.description,
        new Date(l.created_at).toLocaleString('ar-EG'),
      ]),
      [
        { label: 'عدد العمليات الموثقة', value: filteredLogs.length },
      ]
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-[#EAE3E4] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <History className="w-5 h-5 text-[#702C3B]" />
              <h1 className="text-xl md:text-2xl font-bold text-[#421923]">
                سجل العمليات والتدقيق (Audit Logs)
              </h1>
            </div>
            <p className="text-xs text-[#81777A]">
              توثيق لحظي غير قابل للتعديل لكافة الإجراءات: تسجيل المخدومين، النقل، الحضور، واعتماد الكشاكيل
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl border border-[#EAE3E4] bg-white text-xs font-bold text-[#702C3B] hover:bg-[#FAF5F6] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة السجل</span>
          </button>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl p-4 border border-[#EAE3E4] shadow-sm flex items-center justify-between">
          <div className="text-xs text-[#81777A]">
            إجمالي السجلات: <strong className="text-[#421923]">{filteredLogs.length}</strong>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-[#81777A] absolute right-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في السجلات..."
              className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-[#EAE3E4] bg-[#FAF5F6] focus:outline-none focus:border-[#702C3B]"
            />
          </div>
        </div>

        {/* Logs Timeline */}
        <div className="bg-white rounded-2xl border border-[#EAE3E4] shadow-sm p-6 space-y-3">
          {filteredLogs.map((l) => (
            <div
              key={l.id}
              className="p-3.5 rounded-xl border border-[#EAE3E4] bg-[#FAF5F6]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[#702C3B]">{l.user_name}</span>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-[#FAF5F6] text-[#81777A] border border-[#EAE3E4]">
                    {l.user_role}
                  </span>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-white text-[#421923] border border-[#EAE3E4]">
                    {l.action}
                  </span>
                </div>
                <div className="text-[#282326] font-medium leading-relaxed">
                  {l.description}
                </div>
              </div>

              <div className="text-[10px] text-[#81777A] text-left shrink-0">
                {new Date(l.created_at).toLocaleString('ar-EG', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

