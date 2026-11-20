import { NextRequest, NextResponse } from 'next/server';
import { getServants, createServant, updateServant, deleteServant } from '@/lib/services/organa-service';
import {
  isNeonConfigured,
  getServantsPg,
  createServantPg,
  updateServantPg,
  deleteServantPg,
} from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';
import { authenticateRequest } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const queryRole = (searchParams.get('role') as UserRole) || 'priest';
    const effectiveRole = auth.user?.role || queryRole;
    const isRestrictedRole = effectiveRole === 'servant' || effectiveRole === 'family_leader';

    // Strict RBAC: Servants and Family Leaders only see servants in their assigned family
    let targetFamily: string | undefined = undefined;
    if (isRestrictedRole) {
      targetFamily = (auth.user?.assigned_family_id || searchParams.get('userFamilyId') || INITIAL_PERSONAS[effectiveRole]?.assigned_family_id) ?? undefined;
      if (!targetFamily) {
        return NextResponse.json({ success: true, servants: [] });
      }
    } else {
      targetFamily = searchParams.get('familyId') || undefined;
    }

    if (isNeonConfigured()) {
      const servants = await getServantsPg(targetFamily);
      return NextResponse.json({ success: true, servants });
    }

    const servants = getServants({ familyId: targetFamily, userRole: effectiveRole, userFamilyId: targetFamily });
    return NextResponse.json({ success: true, servants });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'service_secretary';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      const payload = {
        ...body,
        family_id: body.family_id || (Array.isArray(body.family_ids) ? body.family_ids[0] : undefined),
      };
      const servant = await createServantPg(payload);
      return NextResponse.json({ success: true, servant });
    }

    const servant = createServant(body, actor);
    return NextResponse.json({ success: true, servant });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const actorRole = (body.actorRole as UserRole) || 'service_secretary';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      const payload = {
        ...data,
        family_id: data.family_id || (Array.isArray(data.family_ids) ? data.family_ids[0] : undefined),
      };
      const servant = await updateServantPg(id, payload);
      return NextResponse.json({ success: true, servant });
    }

    const servant = updateServant(id, data, actor);
    return NextResponse.json({ success: true, servant });
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
      return NextResponse.json({ success: false, error: 'معرّف الخادم مطلوب' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      await deleteServantPg(id);
      return NextResponse.json({ success: true, message: 'تم حذف الخادم بنجاح' });
    }

    const actor = INITIAL_PERSONAS[actorRole] || INITIAL_PERSONAS.admin;
    deleteServant(id, actor);
    return NextResponse.json({ success: true, message: 'تم حذف الخادم بنجاح' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
