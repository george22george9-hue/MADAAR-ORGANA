// ====================================================================
// ORGANA — Meeting Attendance API (/api/meetings/[id]/attendance)
// The Great Martyr St. George Church – Sandbees, Egypt
// RBAC-Protected & Audit-Logged Attendance Endpoint
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getMeetingAttendance,
  recordMemberAttendance,
  bulkSaveMemberAttendance,
  recordServantAttendance,
  bulkSaveServantAttendance,
} from '@/lib/services/organa-service';
import {
  isNeonConfigured,
  getMeetingByIdPg,
  getMeetingAttendancePg,
  bulkSaveMemberAttendancePg,
  bulkSaveServantAttendancePg,
  logAuditActionPg,
} from '@/lib/services/neon-service';
import { authenticateRequest, canAccessFamily } from '@/lib/auth/server-auth';

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
      const meeting = await getMeetingByIdPg(params.id);
      if (!meeting) {
        return NextResponse.json({ success: false, error: 'الاجتماع غير موجود (Meeting not found)' }, { status: 404 });
      }

      // RBAC: Verify user has permission to view this meeting's attendance
      if (!canAccessFamily(auth.user, meeting.family_id)) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك بعرض كشف حضور هذه الأسرة (Forbidden)' },
          { status: 403 }
        );
      }

      const data = await getMeetingAttendancePg(params.id);
      return NextResponse.json({ success: true, ...data });
    }

    const data = getMeetingAttendance(params.id, {
      userRole: auth.user.role,
      userFamilyId: auth.user.assigned_family_id || undefined,
    });
    return NextResponse.json({ success: true, ...data });
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

    if (isNeonConfigured()) {
      const meeting = await getMeetingByIdPg(params.id);
      if (!meeting) {
        return NextResponse.json({ success: false, error: 'الاجتماع غير موجود (Meeting not found)' }, { status: 404 });
      }

      // RBAC: Cannot record attendance if user doesn't belong to this family or have church-wide admin rights
      if (!canAccessFamily(auth.user, meeting.family_id)) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك بتسجيل الحضور لأسرة أخرى (Forbidden)' },
          { status: 403 }
        );
      }

      // Validate meeting is not cancelled
      if (meeting.status === 'cancelled') {
        return NextResponse.json(
          { success: false, error: 'لا يمكن تسجيل الحضور لاجتماع ملغى (Meeting Cancelled)' },
          { status: 400 }
        );
      }

      const recorder = { id: auth.user.id, name: auth.user.full_name };

      if (body.type === 'bulk_members') {
        await bulkSaveMemberAttendancePg(params.id, body.records, recorder);
      } else if (body.type === 'bulk_servants') {
        await bulkSaveServantAttendancePg(params.id, body.records, recorder);
      } else if (body.type === 'single_member') {
        await bulkSaveMemberAttendancePg(params.id, [{
          memberId: body.memberId,
          status: body.status,
          excuseReason: body.excuseReason,
          attendedLiturgy: body.details?.attended_liturgy,
          attendedCommunion: body.details?.attended_communion,
          attendedClass: body.details?.attended_class,
          attendedConfession: body.details?.attended_confession,
        }], recorder);
      } else if (body.type === 'single_servant') {
        await bulkSaveServantAttendancePg(params.id, [{
          servantId: body.servantId,
          status: body.status,
          excuseReason: body.excuseReason,
          didOpening: body.details?.did_opening,
          didWorkshop: body.details?.did_workshop,
          didPreparation: body.details?.did_preparation,
          didLesson: body.details?.did_lesson,
        }], recorder);
      }

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'SAVE_ATTENDANCE',
        'meeting_attendance',
        params.id,
        `حفظ سجل حضور الاجتماع (${meeting.title}) بنوع: ${body.type}`,
        null,
        { recordCount: body.records?.length || 1, type: body.type }
      );

      return NextResponse.json({ success: true });
    }

    if (body.type === 'bulk_members') {
      bulkSaveMemberAttendance(params.id, body.records, auth.user);
    } else if (body.type === 'bulk_servants') {
      bulkSaveServantAttendance(params.id, body.records, auth.user);
    } else if (body.type === 'single_member') {
      recordMemberAttendance(params.id, body.memberId, body.status, body.excuseReason || null, auth.user, body.details);
    } else if (body.type === 'single_servant') {
      recordServantAttendance(params.id, body.servantId, body.status, body.excuseReason || null, auth.user, body.details);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
