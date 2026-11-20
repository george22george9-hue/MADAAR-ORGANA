import { NextRequest, NextResponse } from 'next/server';
import { getServedMembers, createServedMember, updateServedMember, getMemberHistory, deleteServedMember } from '@/lib/services/organa-service';
import {
  isNeonConfigured,
  getServedMembersPg,
  createServedMemberPg,
  updateServedMemberPg,
  deleteServedMemberPg,
} from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';
import { authenticateRequest } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const memberHistoryId = searchParams.get('historyFor');

    if (memberHistoryId) {
      const history = getMemberHistory(memberHistoryId);
      return NextResponse.json({ success: true, history });
    }

    const queryRole = (searchParams.get('role') as UserRole) || 'priest';
    const effectiveRole = auth.user?.role || queryRole;
    const isRestrictedRole = effectiveRole === 'servant' || effectiveRole === 'family_leader';

    // Strict RBAC: Servants and Family Leaders only see their assigned family
    let targetFamily: string | undefined = undefined;
    if (isRestrictedRole) {
      targetFamily = (auth.user?.assigned_family_id || searchParams.get('userFamilyId') || INITIAL_PERSONAS[effectiveRole]?.assigned_family_id) ?? undefined;
      if (!targetFamily) {
        return NextResponse.json({ success: true, members: [] });
      }
    } else {
      targetFamily = searchParams.get('familyId') || undefined;
    }

    const servantId = searchParams.get('servantId') || undefined;
    const search = searchParams.get('search') || undefined;

    if (isNeonConfigured()) {
      const members = await getServedMembersPg(targetFamily, search);
      return NextResponse.json({ success: true, members });
    }

    const members = getServedMembers({
      familyId: targetFamily,
      servantId,
      search,
      userRole: effectiveRole,
      userFamilyId: targetFamily,
    });

    return NextResponse.json({ success: true, members });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      const member = await createServedMemberPg(body);
      return NextResponse.json({ success: true, member });
    }

    const member = createServedMember(body, actor);
    return NextResponse.json({ success: true, member });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const actorRole = (body.actorRole as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      const member = await updateServedMemberPg(id, data);
      return NextResponse.json({ success: true, member });
    }

    const member = updateServedMember(id, data, actor);
    return NextResponse.json({ success: true, member });
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
      return NextResponse.json({ success: false, error: 'معرّف المخدوم مطلوب' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      await deleteServedMemberPg(id);
      return NextResponse.json({ success: true, message: 'تم حذف المخدوم بنجاح' });
    }

    const actor = INITIAL_PERSONAS[actorRole] || INITIAL_PERSONAS.admin;
    deleteServedMember(id, actor);
    return NextResponse.json({ success: true, message: 'تم حذف المخدوم بنجاح' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
