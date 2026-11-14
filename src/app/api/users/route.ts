import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, updateUser, getUserById } from '@/lib/services/organa-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export async function GET() {
  try {
    const users = getUsers();
    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'admin';
    const targetRole = body.role as UserRole;

    // Strict Security Rule:
    // Only Admin can create Admin, Priest, or Service Secretary accounts
    if (targetRole === 'admin' || targetRole === 'priest' || targetRole === 'service_secretary') {
      if (actorRole !== 'admin') {
        return NextResponse.json(
          {
            success: false,
            error: 'عفواً، صلاحية إضافة أو تعيين الآباء الكهنة وأمناء الخدمة مقتصرة حصراً على إدارة المنظومة.',
          },
          { status: 403 }
        );
      }
    }

    const actor = INITIAL_PERSONAS[actorRole] || INITIAL_PERSONAS.admin;
    const user = createUser(body, actor);
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const actorRole = (body.actorRole as UserRole) || 'admin';

    // Verify existing user
    const existing = getUserById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // Protection of Admin account:
    // If the target user is admin, only admin can modify it
    if (existing.role === 'admin' && actorRole !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'لا يمكن تعديل حساب إدارة المنظومة إلا بواسطة مسؤول الإدارة نفسه.',
        },
        { status: 403 }
      );
    }

    // Changing roles to/from priest, secretary, admin requires admin role
    const newRole = updates.role as UserRole | undefined;
    if (
      (newRole && ['admin', 'priest', 'service_secretary'].includes(newRole)) ||
      ['admin', 'priest', 'service_secretary'].includes(existing.role)
    ) {
      if (actorRole !== 'admin') {
        return NextResponse.json(
          {
            success: false,
            error: 'عفواً، تعديل بيانات أو رتبة الكهنة وأمناء الخدمة مقتصر حصراً على إدارة المنظومة.',
          },
          { status: 403 }
        );
      }
    }

    const actor = INITIAL_PERSONAS[actorRole] || INITIAL_PERSONAS.admin;
    const user = updateUser(id, updates, actor);
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
