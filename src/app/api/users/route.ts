import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, updateUser, getUserById, deleteUser } from '@/lib/services/organa-service';
import {
  isNeonConfigured,
  getUsersPg,
  getUserByIdPg,
  createUserPg,
  updateUserPg,
  deleteUserPg,
} from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (isNeonConfigured()) {
      const users = await getUsersPg();
      return NextResponse.json({ success: true, users });
    }
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

    if (isNeonConfigured()) {
      const user = await createUserPg(body);
      return NextResponse.json({ success: true, user });
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

    if (isNeonConfigured()) {
      const existing = await getUserByIdPg(id);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
      }
      if (existing.role === 'admin' && actorRole !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'لا يمكن تعديل حساب إدارة المنظومة إلا بواسطة مسؤول الإدارة نفسه.' },
          { status: 403 }
        );
      }
      const user = await updateUserPg(id, updates);
      return NextResponse.json({ success: true, user });
    }

    const existing = getUserById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 });
    }
    if (existing.role === 'admin' && actorRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'لا يمكن تعديل حساب إدارة المنظومة إلا بواسطة مسؤول الإدارة نفسه.' },
        { status: 403 }
      );
    }

    const actor = INITIAL_PERSONAS[actorRole] || INITIAL_PERSONAS.admin;
    const user = updateUser(id, updates, actor);
    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const actorRole = (searchParams.get('actorRole') as UserRole) || 'admin';

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرّف الحساب مطلوب' }, { status: 400 });
    }

    if (actorRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'حذف الحسابات مقتصر حصراً على إدارة المنظومة.' },
        { status: 403 }
      );
    }

    if (isNeonConfigured()) {
      await deleteUserPg(id);
      return NextResponse.json({ success: true, message: 'تم حذف الحساب بنجاح' });
    }

    const actor = INITIAL_PERSONAS[actorRole] || INITIAL_PERSONAS.admin;
    deleteUser(id, actor);
    return NextResponse.json({ success: true, message: 'تم حذف الحساب بنجاح' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
