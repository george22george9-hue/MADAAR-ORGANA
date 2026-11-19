// ====================================================================
// ORGANA — Pastoral Follow-up Tasks API (/api/tasks)
// RBAC-Protected & State Machine Validated Operations
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getFollowupTasks, completeFollowupTask } from '@/lib/services/organa-service';
import {
  isNeonConfigured,
  getFollowupTasksPg,
  transitionFollowupTaskStatusPg,
  completeFollowupTaskPg,
  logAuditActionPg,
} from '@/lib/services/neon-service';
import { queryOnePg, queryPg } from '@/lib/db/neon';
import {
  authenticateRequest,
  canAccessFamily,
  canAccessTask,
  canManageAll,
  canViewPastoralNotes,
} from '@/lib/auth/server-auth';
import { FollowupWorkflowStatus } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const currentUser = auth.user;
    const { searchParams } = new URL(request.url);
    const requestedServantId = searchParams.get('servantId') || undefined;
    const requestedFamilyId = searchParams.get('familyId') || undefined;
    const workflowStatus = searchParams.get('status') as FollowupWorkflowStatus | undefined;

    // RBAC: A regular servant can ONLY see tasks assigned to them
    if (currentUser.role === 'servant') {
      if (requestedServantId && requestedServantId !== currentUser.id) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح للخادم باستعراض مهام خادم آخر (Forbidden)' },
          { status: 403 }
        );
      }
    }

    // RBAC: A family leader can ONLY see tasks in their assigned family
    if (currentUser.role === 'family_leader') {
      if (requestedFamilyId && requestedFamilyId !== currentUser.assigned_family_id) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لأمين الأسرة باستعراض مهام أسرة أخرى (Forbidden)' },
          { status: 403 }
        );
      }
    }

    const effectiveServantId = currentUser.role === 'servant' ? currentUser.id : requestedServantId;

    if (isNeonConfigured()) {
      let tasks = await getFollowupTasksPg(effectiveServantId);

      // Filter by family if caller is a family leader
      if (currentUser.role === 'family_leader' && currentUser.assigned_family_id) {
        tasks = tasks.filter((t: any) => t.family_id === currentUser.assigned_family_id || !t.family_id);
      }

      if (workflowStatus) {
        tasks = tasks.filter((t: any) => t.workflow_status === workflowStatus);
      }

      // Pastoral Privacy: Redact sensitive notes if servant is not authorized
      const sanitizedTasks = tasks.map((t: any) => {
        if (!canViewPastoralNotes(currentUser, t.servant_id)) {
          const { notes, ...safeTask } = t;
          return { ...safeTask, notes: '[ملاحظات رعوية خاصة]' };
        }
        return t;
      });

      return NextResponse.json({ success: true, tasks: sanitizedTasks });
    }

    const tasks = getFollowupTasks(effectiveServantId);
    return NextResponse.json({ success: true, tasks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Creates a new follow-up task.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { member_id, servant_id, family_id, task_type, priority, due_date, notes } = body;

    if (!member_id || !task_type) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال المخدوم ونوع المهمة (Missing Required Fields)' },
        { status: 400 }
      );
    }

    // Check family access
    if (family_id && !canAccessFamily(auth.user, family_id)) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بإنشاء مهمة افتقاد لأسرة أخرى (Forbidden)' },
        { status: 403 }
      );
    }

    if (isNeonConfigured()) {
      const taskId = `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const targetServant = servant_id || auth.user.id;

      await queryPg(`
        INSERT INTO followup_tasks (
          id, member_id, servant_id, family_id, task_type,
          workflow_status, priority, is_completed, due_date, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'open', $6, false, COALESCE($7, CURRENT_DATE + 7), $8, now())
      `, [
        taskId,
        member_id,
        targetServant,
        family_id || auth.user.assigned_family_id || null,
        task_type,
        priority || 'normal',
        due_date || null,
        notes || null,
      ]);

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'CREATE_FOLLOWUP_TASK',
        'followup_tasks',
        taskId,
        `إنشاء مهمة افتقاد جديدة للمخدوم: ${member_id}`,
        null,
        { taskId, member_id, targetServant, task_type }
      );

      return NextResponse.json({ success: true, taskId, message: 'تم إنشاء حالة الافتقاد بنجاح' });
    }

    return NextResponse.json({ success: true, message: 'تم إنشاء المهمة' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Transitions task workflow status using state machine gates.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { taskId, status, workflow_status, result, outcome, notes, next_followup_date, closed_reason, assigned_to } = body;
    const targetStatus = (workflow_status || status) as FollowupWorkflowStatus;

    if (!taskId) {
      return NextResponse.json({ success: false, error: 'معرف المهمة مطلوب (taskId Required)' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      const task = await queryOnePg(`SELECT * FROM followup_tasks WHERE id = $1`, [taskId]);
      if (!task) {
        return NextResponse.json({ success: false, error: 'مهمة الافتقاد غير موجودة (Task Not Found)' }, { status: 404 });
      }

      // RBAC: Check task permission
      if (!canAccessTask(auth.user, { family_id: task.family_id, servant_id: task.servant_id })) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك بتعديل مهمة الافتقاد هذه (Forbidden)' },
          { status: 403 }
        );
      }

      if (targetStatus) {
        await transitionFollowupTaskStatusPg(taskId, targetStatus, auth.user.id, {
          assigned_to: assigned_to || undefined,
          outcome: outcome || result || undefined,
          next_followup_date: next_followup_date || undefined,
          closed_reason: closed_reason || undefined,
          notes: notes || undefined,
        });
      } else {
        // Fallback for simple completion
        await completeFollowupTaskPg(taskId, outcome || result || 'تم التواصل', notes, auth.user.full_name);
      }

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'TRANSITION_FOLLOWUP_TASK',
        'followup_tasks',
        taskId,
        `تحديث حالة الافتقاد إلى: ${targetStatus || 'completed'}`,
        { previous_status: task.workflow_status },
        { status: targetStatus, result: outcome || result }
      );

      return NextResponse.json({ success: true, message: 'تم تحديث حالة الافتقاد بنجاح' });
    }

    completeFollowupTask(taskId, outcome || result || 'تم التواصل', notes, auth.user);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
