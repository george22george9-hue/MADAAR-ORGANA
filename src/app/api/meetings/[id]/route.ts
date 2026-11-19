// ====================================================================
// ORGANA — Meeting Details & Update API (/api/meetings/[id])
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getMeetingById, updateMeeting } from '@/lib/services/organa-service';
import { isNeonConfigured, getMeetingByIdPg, updateMeetingPg, logAuditActionPg } from '@/lib/services/neon-service';
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

      if (!canAccessFamily(auth.user, meeting.family_id)) {
        return NextResponse.json({ success: false, error: 'غير مصرح لك بعرض هذا الاجتماع (Forbidden)' }, { status: 403 });
      }

      return NextResponse.json({ success: true, meeting });
    }

    const meeting = getMeetingById(params.id, { userRole: auth.user.role, userFamilyId: auth.user.assigned_family_id || undefined });
    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, meeting });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
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
      const existing = await getMeetingByIdPg(params.id);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'تعذر العثور على الاجتماع لتحديثه' }, { status: 404 });
      }

      if (!canAccessFamily(auth.user, existing.family_id)) {
        return NextResponse.json({ success: false, error: 'غير مصرح لك بتعديل بيانات اجتماع أسرة أخرى (Forbidden)' }, { status: 403 });
      }

      const meeting = await updateMeetingPg(params.id, {
        title: body.title,
        date: body.date,
        lesson_title: body.lesson_title || body.lessonTitle,
        lesson_topic: body.lesson_topic || body.lessonTopic,
        start_time: body.start_time || body.startTime,
        end_time: body.end_time || body.endTime,
        status: body.status,
        notes: body.notes,
        family_id: body.family_id || body.familyId,
      });

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'UPDATE_MEETING',
        'meeting',
        params.id,
        `تعديل تفاصيل الاجتماع: ${existing.title}`,
        existing,
        meeting
      );

      return NextResponse.json({ success: true, meeting });
    }

    const meeting = updateMeeting(params.id, body, auth.user);
    return NextResponse.json({ success: true, meeting });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
