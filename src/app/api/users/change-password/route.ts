import { NextRequest, NextResponse } from 'next/server';
import { changeUserPassword } from '@/lib/services/organa-service';
import { isNeonConfigured, changeUserPasswordPg } from '@/lib/services/neon-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, currentPassword, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json({ success: false, error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      await changeUserPasswordPg(userId, currentPassword || '', newPassword);
      return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
    }

    const result = changeUserPassword(userId, currentPassword || '', newPassword);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
