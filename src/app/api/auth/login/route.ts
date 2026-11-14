// ====================================================================
// ORGANA — Secure Server-Side Authentication (/api/auth/login)
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { isNeonConfigured } from '@/lib/services/neon-service';
import { getUsers, getJoinRequests } from '@/lib/services/organa-service';
import { verifyPassword } from '@/lib/auth/password';
import { queryOnePg } from '@/lib/db/neon';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const term = (body.phoneOrEmail || body.phone || '').trim();
    const password = (body.password || '').trim();

    if (!term || !password) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال رقم الهاتف وكلمة المرور' },
        { status: 400 }
      );
    }

    let user: any = null;

    if (isNeonConfigured()) {
      user = await queryOnePg(
        `SELECT * FROM users WHERE phone = $1 OR LOWER(email) = LOWER($1)`,
        [term]
      );
    } else {
      user = getUsers().find(u => u.phone === term || (u.email && u.email.toLowerCase() === term.toLowerCase()));
    }

    if (user) {
      if (!user.is_active) {
        return NextResponse.json({
          success: false,
          pendingNotice: 'حسابك غير نشط حالياً أو تم إيقافه مؤقتاً من قبل الإدارة.',
        });
      }

      const isValid = await verifyPassword(password, user.password_hash);
      if (!isValid) {
        return NextResponse.json({
          success: false,
          error: 'كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.',
        });
      }

      // Safe user object: NEVER leak password_hash to the client!
      const { password_hash, ...safeUser } = user;
      return NextResponse.json({
        success: true,
        user: { ...safeUser, is_active: Boolean(safeUser.is_active) },
      });
    }

    // Check if there is a pending or rejected join request
    let joinReq: any = null;
    if (isNeonConfigured()) {
      joinReq = await queryOnePg(
        `SELECT * FROM join_requests WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
        [term]
      );
    } else {
      const allReqs = getJoinRequests();
      joinReq = allReqs.find(r => r.phone === term);
    }

    if (joinReq) {
      if (joinReq.status === 'pending') {
        return NextResponse.json({
          success: false,
          pendingNotice: `طلب انضمامك لأسرة (${joinReq.requested_family_id || 'الخدمة'}) بصفتك (${joinReq.requested_role === 'family_leader' ? 'أمين أسرة' : 'خادم في الأسرة'}) قيد المراجعة والاعتماد حالياً من قبل إدارة المنظومة أو قدس أبونا الكاهن أو أمين الخدمة. سيتم تفعيل حسابك فور الموافقة.`,
        });
      }
      if (joinReq.status === 'rejected') {
        return NextResponse.json({
          success: false,
          error: `عذراً، تم رفض طلب الانضمام السابق المسجل لهذا الرقم. (السبب: ${joinReq.rejection_reason || 'غير محدد'})`,
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: 'لم يتم العثور على حساب مسجل بهذا الرقم. يمكنك تقديم "طلب انضمام جديد للخدمة" من التبويب بالأعلى أو التواصل مع إدارة المنظومة.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ بالاتصال بالسيرفر أثناء التحقق من الدخول' },
      { status: 500 }
    );
  }
}
