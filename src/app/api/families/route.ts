import { NextRequest, NextResponse } from 'next/server';
import { getFamilies, createFamily, updateFamily } from '@/lib/services/organa-service';
import { isNeonConfigured, getFamiliesPg, createFamilyPg, updateFamilyPg } from '@/lib/services/neon-service';
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

    let familyId: string | undefined = undefined;
    if (isRestrictedRole) {
      familyId = auth.user?.assigned_family_id || searchParams.get('userFamilyId') || INITIAL_PERSONAS[effectiveRole]?.assigned_family_id || undefined;
    } else {
      familyId = searchParams.get('familyId') || undefined;
    }

    if (isNeonConfigured()) {
      let families = await getFamiliesPg();
      if (isRestrictedRole) {
        families = families.filter(f => f.id === familyId);
      }
      return NextResponse.json({ success: true, families });
    }

    let families = getFamilies({ userRole: effectiveRole, userFamilyId: familyId });
    if (isRestrictedRole && familyId) {
      families = families.filter(f => f.id === familyId);
    }
    return NextResponse.json({ success: true, families });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'priest';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      const family = await createFamilyPg(body);
      return NextResponse.json({ success: true, family });
    }

    const family = createFamily(body, actor);
    return NextResponse.json({ success: true, family });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const actorRole = (body.actorRole as UserRole) || 'priest';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      const family = await updateFamilyPg(id, data);
      return NextResponse.json({ success: true, family });
    }

    const family = updateFamily(id, data, actor);
    return NextResponse.json({ success: true, family });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
