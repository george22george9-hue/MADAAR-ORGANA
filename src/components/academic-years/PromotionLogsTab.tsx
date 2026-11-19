'use client';

import React, { useState, useEffect } from 'react';
import { AnnualPromotionLog } from '@/types/organa';
import { History, RotateCcw, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

interface PromotionLogsTabProps {
  canManage: boolean;
  onRefresh: () => void;
}

export function PromotionLogsTab({ canManage, onRefresh }: PromotionLogsTabProps) {
  const [logs, setLogs] = useState<AnnualPromotionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/academic-years/promotions/history');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تحميل سجل الترحيل');
      }
      setLogs(data.logs || []);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل السجل');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRollback = async (log: AnnualPromotionLog) => {
    const confirmation = prompt(
      `تحذير أمني: أنت على وشك التراجع عن عملية الترحيل من (${log.from_academic_year_name}) إلى (${log.to_academic_year_name}).\n` +
      `سيتم استعادة المراحل والأكواد السابقة لجميع المخدومين (${log.promoted_count}) بدقة.\n\n` +
      `للتأكيد، اكتب كلمة "تراجع":`
    );

    if (confirmation !== 'تراجع') {
      alert('تم إلغاء التراجع.');
      return;
    }

    setRollingBackId(log.id);
    setError(null);
    try {
      const res = await fetch('/api/academic-years/promotions/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_id: log.id,
          reason: 'تراجع يدوي معتمد من لوحة الإدارة',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل تنفيذ التراجع');
      }
      alert('تم التراجع عن الترحيل واستعادة بيانات المخدومين بنجاح!');
      fetchLogs();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التراجع');
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#EAE3E4] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#421923] flex items-center gap-2">
            <History className="w-5 h-5 text-[#702C3B]" />
            سجل عمليات الترحيل السنوية والأرشيف (Audit Log)
          </h2>
          <p className="text-xs text-[#81777A] mt-1">
            متابعة تاريخية موثقة لجميع عمليات الترحيل المنفذة، مع إمكانية التراجع الآمن (Safe Rollback) في حال حدوث خطأ.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE3E4] text-[#702C3B] hover:bg-[#FAF5F6] text-xs font-bold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Logs List */}
      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EAE3E4] p-8 text-center text-gray-400 text-xs">
            لا توجد عمليات ترحيل سنوي مسجلة حتى الآن
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`p-5 rounded-2xl border bg-white shadow-sm space-y-4 transition-all ${
                log.status === 'completed'
                  ? 'border-emerald-200 hover:border-emerald-300'
                  : 'border-gray-200 bg-gray-50/50 opacity-80'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      log.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#421923]">
                      ترحيل من: {log.from_academic_year_name} ➔ إلى: {log.to_academic_year_name}
                    </h3>
                    <p className="text-[11px] text-[#81777A]">
                      نُفذ بواسطة: <span className="font-semibold text-gray-700">{log.executed_by_name}</span> • بتاريخ:{' '}
                      <span className="font-mono">{log.executed_at?.slice(0, 16).replace('T', ' ')}</span>
                    </p>
                  </div>
                </div>

                <div>
                  {log.status === 'completed' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      مكتمل ومعتمد
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-300">
                      <RotateCcw className="w-3.5 h-3.5" />
                      تم التراجع عنه
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 block text-[10px]">إجمالي المنقولين:</span>
                  <span className="font-bold text-[#421923] text-sm font-mono">{log.promoted_count}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 block text-[10px]">المعيدون لنفس المرحلة:</span>
                  <span className="font-bold text-amber-800 text-sm font-mono">{log.retained_count}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 block text-[10px]">الخريجون:</span>
                  <span className="font-bold text-purple-800 text-sm font-mono">{log.graduated_count}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 block text-[10px]">كود العملية (Log ID):</span>
                  <span className="font-mono text-[11px] text-gray-500 truncate block">{log.id}</span>
                </div>
              </div>

              {/* Action */}
              {log.status === 'completed' && canManage && (
                <div className="pt-2 flex justify-end">
                  <button
                    disabled={rollingBackId === log.id}
                    onClick={() => handleRollback(log)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${rollingBackId === log.id ? 'animate-spin' : ''}`} />
                    <span>{rollingBackId === log.id ? 'جاري التراجع الآمن...' : 'تراجع آمن عن هذا الترحيل (Safe Rollback)'}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
