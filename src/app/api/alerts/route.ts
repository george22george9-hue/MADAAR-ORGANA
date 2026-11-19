// ====================================================================
// ORGANA — Absence Alerts & Engine API (/api/alerts)
// RBAC-Protected & Validated Server-Side Operations
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAbsenceAlerts, updateAbsenceAlertStatus } from '@/lib/services/organa-service';
import {
  isNeonConfigured,
  getAbsenceAlertsPg,
  updateAbsenceAlertStatusPg,
  runAbsenceAnalysisEnginePg,
  getActiveAcademicYearPg,
  logAuditActionPg,
} from '@/lib/services/neon-service';
import { queryOnePg, queryPg } from '@/lib/db/neon';
import { authenticateRequest, canAccessFamily, canResolveAlert, canManageAll } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const requestedFamilyId = searchParams.get('familyId') || undefined;
    const status = searchParams.get('status') || undefined;
    const academicYearId = searchParams.get('academicYearId') || undefined;
    const riskCategory = searchParams.get('riskCategory') || undefined;
    const priority = searchParams.get('priority') || undefined;

    // RBAC: Check family permission
    if (requestedFamilyId && !canAccessFamily(auth.user, requestedFamilyId)) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك باستعراض تنبيهات غياب هذه الأسرة (Forbidden)' },
        { status: 403 }
      );
    }

    const targetFamily = requestedFamilyId || (canManageAll(auth.user) ? undefined : auth.user.assigned_family_id || undefined);

    if (isNeonConfigured()) {
      let alerts = await getAbsenceAlertsPg({
        familyId: targetFamily,
        status,
        academicYearId,
        riskCategory,
        priority,
      });

      // If user is a regular servant, filter alerts to only members in their assigned class/family or assigned to them
      const currentUser = auth.user;
      if (currentUser.role === 'servant') {
        alerts = alerts.filter(a => 
          a.family_id === currentUser.assigned_family_id || a.assigned_servant_id === currentUser.id
        );
      }

      return NextResponse.json({ success: true, alerts });
    }

    const alerts = getAbsenceAlerts({
      familyId: targetFamily,
      status,
      userRole: auth.user.role,
      userFamilyId: auth.user.assigned_family_id || undefined,
    });
    return NextResponse.json({ success: true, alerts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Triggers the Intelligent Absence Engine to scan completed meetings and generate/update alerts.
 * Restricted to: Family Leader, Secretary, Priest, Admin.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    // Regular servants are not authorized to trigger full absence analysis
    if (auth.user.role === 'servant') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح للخادم بتشغيل محرك الغياب العام (Unauthorized)' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let targetYearId = body.academicYearId;

    if (!targetYearId && isNeonConfigured()) {
      const activeYear = await getActiveAcademicYearPg();
      targetYearId = activeYear?.id || 'ay-2026-2027';
    }

    const targetFamily = auth.user.role === 'family_leader' ? auth.user.assigned_family_id : body.familyId;

    if (isNeonConfigured()) {
      const result = await runAbsenceAnalysisEnginePg(targetYearId, {
        familyId: targetFamily || undefined,
        stage: body.stage || undefined,
        thresholds: body.thresholds || undefined,
      });

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'RUN_ABSENCE_ENGINE',
        'absence_alerts',
        targetYearId,
        `تشغيل محرك الغياب الذكي: ${result.newAlertsCreated} تنبيه جديد، ${result.existingAlertsUpdated} تنبيه محدث`,
        null,
        result
      );

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ success: true, analyzedMembersCount: 0, newAlertsCreated: 0, existingAlertsUpdated: 0 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Resolves or dismisses an absence alert with an auditable reason.
 * Restricted to: Family Leader (for own family), Secretary, Priest, Admin.
 * Regular servants are FORBIDDEN (403).
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { alertId, action, status, reason } = body;
    const targetStatus = status || (action === 'dismiss' ? 'dismissed' : 'resolved');

    if (!alertId) {
      return NextResponse.json({ success: false, error: 'معرف التنبيه مطلوب (alertId Required)' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      const alert = await queryOnePg(`SELECT * FROM absence_alerts WHERE id = $1`, [alertId]);
      if (!alert) {
        return NextResponse.json({ success: false, error: 'التنبيه غير موجود (Alert Not Found)' }, { status: 404 });
      }

      // RBAC: Check if user has permission to resolve alerts in this family
      if (!canResolveAlert(auth.user, alert.family_id)) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك بحل أو إغلاق هذا التنبيه (Forbidden to resolve alert)' },
          { status: 403 }
        );
      }

      const resolutionReason = reason || (action === 'dismiss' ? 'تم التجاوز بقرار المسؤول' : 'تم الافتقاد والحل');

      if (targetStatus === 'resolved') {
        await queryPg(`
          UPDATE absence_alerts SET
            status = 'resolved',
            resolved_reason = $2,
            resolved_by = $3,
            resolved_at = now()
          WHERE id = $1
        `, [alertId, resolutionReason, auth.user.id]);
      } else if (targetStatus === 'dismissed') {
        await queryPg(`
          UPDATE absence_alerts SET
            status = 'dismissed',
            dismissed_reason = $2,
            dismissed_by = $3,
            dismissed_at = now()
          WHERE id = $1
        `, [alertId, resolutionReason, auth.user.id]);
      } else {
        await updateAbsenceAlertStatusPg(alertId, targetStatus);
      }

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'RESOLVE_ABSENCE_ALERT',
        'absence_alerts',
        alertId,
        `تحديث حالة تنبيه الغياب إلى (${targetStatus}) - السبب: ${resolutionReason}`,
        { previous_status: alert.status },
        { status: targetStatus, reason: resolutionReason }
      );

      return NextResponse.json({ success: true, message: `تم تحديث التنبيه إلى ${targetStatus}` });
    }

    updateAbsenceAlertStatus(alertId, targetStatus, auth.user);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
