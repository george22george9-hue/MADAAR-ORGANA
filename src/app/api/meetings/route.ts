// ====================================================================
// ORGANA — Meetings API (/api/meetings)
// RBAC-Protected & Validated Server-Side Operations
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getMeetings, createMeeting } from '@/lib/services/organa-service';
import { isNeonConfigured, getMeetingsPg, createMeetingPg, logAuditActionPg } from '@/lib/services/neon-service';
import { authenticateRequest, canAccessFamily, canManageAll } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const requestedFamilyId = searchParams.get('familyId') || undefined;
    const date = searchParams.get('date') || undefined;

    // RBAC: Check family access
    if (requestedFamilyId && !canAccessFamily(auth.user, requestedFamilyId)) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بعرض اجتماعات هذه الأسرة (Forbidden Family Access)' },
        { status: 403 }
      );
    }

    const targetFamily = requestedFamilyId || (canManageAll(auth.user) ? undefined : auth.user.assigned_family_id || undefined);

    if (isNeonConfigured()) {
      const meetings = await getMeetingsPg(targetFamily, date);
      return NextResponse.json({ success: true, meetings });
    }

    const meetings = getMeetings({ familyId: targetFamily, userRole: auth.user.role, userFamilyId: auth.user.assigned_family_id || undefined });
    return NextResponse.json({ success: true, meetings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await request.json();

    // Validation
    if (!body.title || !body.family_id || !body.date) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال عنوان وتاريخ والأسرة التابع لها الاجتماع' },
        { status: 400 }
      );
    }

    // RBAC: Can this user create a meeting for this family?
    if (!canAccessFamily(auth.user, body.family_id)) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بإنشاء اجتماع لأسرة أخرى (Forbidden)' },
        { status: 403 }
      );
    }

    if (isNeonConfigured()) {
      const meeting = await createMeetingPg({
        ...body,
        created_by: auth.user.id,
      });

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'CREATE_MEETING',
        'meeting',
        meeting.id,
        `إنشاء اجتماع جديد: ${meeting.title}`,
        null,
        meeting
      );

      return NextResponse.json({ success: true, meeting });
    }

    const meeting = createMeeting(body, auth.user);
    return NextResponse.json({ success: true, meeting });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
