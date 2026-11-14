// ====================================================================
// ORGANA — Web Push Subscription API (/api/push/subscribe)
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { savePushSubscriptionPg, VAPID_PUBLIC_KEY } from '@/lib/services/push-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    publicKey: VAPID_PUBLIC_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subscription, userAgent } = body;

    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, error: 'بيانات الاشتراك في الإشعارات غير مكتملة' },
        { status: 400 }
      );
    }

    const saved = await savePushSubscriptionPg(userId, subscription, userAgent);

    return NextResponse.json({
      success: saved,
      message: saved ? 'تم تسجيل جهاز الخادم في إشعارات الهاتف بنجاح 🔔' : 'تعذر حفظ الاشتراك',
    });
  } catch (err: any) {
    console.error('Error saving push subscription:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
