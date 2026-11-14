import { NextRequest, NextResponse } from 'next/server';
import { getJoinRequestById, approveJoinRequest, rejectJoinRequest } from '@/lib/services/organa-service';
import {
  isNeonConfigured,
  getJoinRequestByIdPg,
  approveJoinRequestPg,
  rejectJoinRequestPg,
} from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (isNeonConfigured()) {
      const reqItem = await getJoinRequestByIdPg(params.id);
      if (!reqItem) {
        return NextResponse.json({ success: false, error: 'الطلب غير موجود' }, { status: 404 });
      }
      return NextResponse.json({ success: true, request: reqItem });
    }

    const reqItem = getJoinRequestById(params.id);
    if (!reqItem) {
      return NextResponse.json({ success: false, error: 'الطلب غير موجود' }, { status: 404 });
    }
    return NextResponse.json({ success: true, request: reqItem });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const action = body.action; // 'approve' | 'reject'
    const reviewerRole = (body.reviewerRole as UserRole) || (body.reviewer?.role as UserRole) || 'admin';
    const reviewerName = body.reviewerName || body.reviewer?.full_name || INITIAL_PERSONAS[reviewerRole]?.full_name || 'إدارة المنظومة';
    const reviewerId = body.reviewerId || body.reviewer?.id || INITIAL_PERSONAS[reviewerRole]?.id || 'usr-admin';

    // Verify authorized role
    if (reviewerRole !== 'admin' && reviewerRole !== 'priest' && reviewerRole !== 'service_secretary') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك باتخاذ إجراء على هذا الطلب. الصلاحية مقتصرة على الإدارة، الكاهن، أو أمين الخدمة فقط.' },
        { status: 403 }
      );
    }

    const reviewer = {
      id: reviewerId,
      full_name: reviewerName,
      role: reviewerRole,
    };

    if (action === 'approve') {
      if (isNeonConfigured()) {
        const result = await approveJoinRequestPg(params.id, reviewer);
        if (!result.success) {
          return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, user: result.user });
      }

      const result = approveJoinRequest(params.id, reviewer);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, user: result.user });
    } else if (action === 'reject') {
      if (isNeonConfigured()) {
        await rejectJoinRequestPg(params.id, body.reason || '', reviewer);
        return NextResponse.json({ success: true, message: 'تم رفض الطلب بنجاح' });
      }

      const result = rejectJoinRequest(params.id, reviewer, body.reason);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'تم رفض الطلب بنجاح' });
    } else {
      return NextResponse.json({ success: false, error: 'إجراء غير معروف. يجب أن يكون approve أو reject' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
