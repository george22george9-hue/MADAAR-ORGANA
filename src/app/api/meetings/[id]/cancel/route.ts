// ====================================================================
// ORGANA — Cancel Meeting API (/api/meetings/[id]/cancel)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { isNeonConfigured, getMeetingByIdPg, cancelMeetingPg, logAuditActionPg } from '@/lib/services/neon-service';
import { authenticateRequest, canAccessFamily, canManageAll } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    // Cancellation is restricted to Family Leader (for own family) or Admin/Priest/Secretary
    if (auth.user.role === 'servant') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح للخادم بإلغاء الاجتماع رسمياً (Unauthorized)' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const reason = (body.cancellation_reason || body.reason || '').trim();
    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال سبب الإلغاء (Cancellation Reason Required)' },
        { status: 400 }
      );
    }

    if (isNeonConfigured()) {
      const meeting = await getMeetingByIdPg(params.id);
      if (!meeting) {
        return NextResponse.json({ success: false, error: 'الاجتماع غير موجود (Meeting not found)' }, { status: 404 });
      }

      if (!canAccessFamily(auth.user, meeting.family_id)) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك بإلغاء اجتماع هذه الأسرة (Forbidden)' },
          { status: 403 }
        );
      }

      await cancelMeetingPg(params.id, reason, auth.user.id);

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'CANCEL_MEETING',
        'meeting',
        params.id,
        `إلغاء الاجتماع: ${meeting.title} - السبب: ${reason}`,
        { previous_status: meeting.status },
        { status: 'cancelled', cancellation_reason: reason }
      );

      return NextResponse.json({ success: true, message: 'تم إلغاء الاجتماع وتوثيق السبب' });
    }

    return NextResponse.json({ success: true, message: 'تم إلغاء الاجتماع' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
