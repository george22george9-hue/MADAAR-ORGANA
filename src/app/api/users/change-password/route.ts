import { NextRequest, NextResponse } from 'next/server';
import { changeUserPassword } from '@/lib/services/organa-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, oldPassword, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'البيانات غير مكتملة. يرجى إدخال كلمة المرور الجديدة.' },
        { status: 400 }
      );
    }

    const result = changeUserPassword(userId, oldPassword || '', newPassword);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
