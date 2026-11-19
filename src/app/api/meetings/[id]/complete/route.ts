// ====================================================================
// ORGANA — Confirm Meeting Completion API (/api/meetings/[id]/complete)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { isNeonConfigured, getMeetingByIdPg, confirmMeetingCompletionPg, logAuditActionPg } from '@/lib/services/neon-service';
import { authenticateRequest, canAccessFamily } from '@/lib/auth/server-auth';

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

    if (isNeonConfigured()) {
      const meeting = await getMeetingByIdPg(params.id);
      if (!meeting) {
        return NextResponse.json({ success: false, error: 'الاجتماع غير موجود (Meeting not found)' }, { status: 404 });
      }

      if (!canAccessFamily(auth.user, meeting.family_id)) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك بتأكيد اكتمال هذا الاجتماع (Forbidden)' },
          { status: 403 }
        );
      }

      await confirmMeetingCompletionPg(params.id, auth.user.id);

      await logAuditActionPg(
        { id: auth.user.id, name: auth.user.full_name, role: auth.user.role },
        'CONFIRM_MEETING_COMPLETED',
        'meeting',
        params.id,
        `تأكيد انعقاد واكتمال الاجتماع: ${meeting.title}`,
        { previous_status: meeting.status },
        { status: 'completed', completed_by: auth.user.id }
      );

      return NextResponse.json({ success: true, message: 'تم تأكيد انعقاد واكتمال الاجتماع بنجاح' });
    }

    return NextResponse.json({ success: true, message: 'تم تأكيد اكتمال الاجتماع' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
