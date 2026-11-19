// ====================================================================
// ORGANA — Meeting Servant Roles API (/api/meetings/[id]/roles)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  isNeonConfigured,
  getMeetingByIdPg,
  getMeetingServantRolesPg,
  recordMeetingServantRolesPg,
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
        return NextResponse.json({ success: false, error: 'الاجتماع غير موجود' }, { status: 404 });
      }

      if (!canAccessFamily(auth.user, meeting.family_id)) {
        return NextResponse.json({ success: false, error: 'غير مصرح بعرض أدوار هذا الاجتماع' }, { status: 403 });
      }

      const roles = await getMeetingServantRolesPg(params.id);
      return NextResponse.json({ success: true, roles });
    }

    return NextResponse.json({ success: true, roles: [] });
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

    const meeting = await getMeetingByIdPg(params.id);
    if (!meeting) {
      return NextResponse.json({ success: false, error: 'الاجتماع غير موجود' }, { status: 404 });
    }

    if (!canAccessFamily(auth.user, meeting.family_id)) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل أدوار هذا الاجتماع' }, { status: 403 });
    }

    const body = await request.json();
    if (!Array.isArray(body.roles)) {
      return NextResponse.json({ success: false, error: 'يجب إرسال مصفوفة أدوار الخدام (roles)' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      await recordMeetingServantRolesPg(params.id, body.roles);

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'UPDATE_MEETING_ROLES',
        'meeting_servant_roles',
        params.id,
        `تحديث أدوار الخدام المشاركين في الاجتماع (${meeting.title})`,
        null,
        { rolesCount: body.roles.length }
      );

      return NextResponse.json({ success: true, message: 'تم حفظ أدوار الخدام المشاركين بنجاح' });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
