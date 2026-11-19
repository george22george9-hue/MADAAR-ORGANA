// ====================================================================
// ORGANA — Follow-up Task Contact Logs API (/api/tasks/[id]/contact-logs)
// Append-Only Contact Attempt Records with State Transition
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  isNeonConfigured,
  addFollowupContactLogPg,
  getFollowupContactLogsPg,
  logAuditActionPg,
} from '@/lib/services/neon-service';
import { queryOnePg } from '@/lib/db/neon';
import { authenticateRequest, canAccessTask } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    if (isNeonConfigured()) {
      const task = await queryOnePg(`SELECT * FROM followup_tasks WHERE id = $1`, [params.id]);
      if (!task) {
        return NextResponse.json({ success: false, error: 'مهمة الافتقاد غير موجودة (Task Not Found)' }, { status: 404 });
      }

      // RBAC: Check task permission
      if (!canAccessTask(auth.user, { family_id: task.family_id, servant_id: task.servant_id })) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك باستعراض سجلات التواصل لهذه الحالة (Forbidden)' },
          { status: 403 }
        );
      }

      const logs = await getFollowupContactLogsPg(params.id);
      return NextResponse.json({ success: true, logs });
    }

    return NextResponse.json({ success: true, logs: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { contact_date, contact_method, outcome, notes, next_followup_date, is_correction, correction_for_id, correction_reason, servant_id } = body;

    if (!contact_date || !contact_method || !outcome) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال تاريخ وطريقة ونتيجة التواصل (Missing Required Contact Fields)' },
        { status: 400 }
      );
    }

    if (isNeonConfigured()) {
      const task = await queryOnePg(`SELECT * FROM followup_tasks WHERE id = $1`, [params.id]);
      if (!task) {
        return NextResponse.json({ success: false, error: 'مهمة الافتقاد غير موجودة (Task Not Found)' }, { status: 404 });
      }

      // RBAC: Check task permission
      if (!canAccessTask(auth.user, { family_id: task.family_id, servant_id: task.servant_id })) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك بتسجيل محاولة تواصل لهذه الحالة (Forbidden)' },
          { status: 403 }
        );
      }

      const effectiveServantId = servant_id || task.servant_id || auth.user.id;

      const log = await addFollowupContactLogPg(params.id, {
        servant_id: effectiveServantId,
        contact_date,
        contact_method,
        outcome,
        notes,
        next_followup_date,
        is_correction: Boolean(is_correction),
        correction_for_id,
        correction_reason,
        created_by: auth.user.id,
      });

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'RECORD_CONTACT_LOG',
        'followup_contact_logs',
        log.id,
        `تسجيل محاولة تواصل جديدة بطريقة (${contact_method}) - النتيجة: ${outcome}`,
        null,
        log
      );

      return NextResponse.json({ success: true, log, message: 'تم حفظ سجل محاولة التواصل بنجاح' });
    }

    return NextResponse.json({ success: true, message: 'تم حفظ محاولة التواصل' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
