import { NextRequest, NextResponse } from 'next/server';
import { getFamilies, createFamily, updateFamily } from '@/lib/services/organa-service';
import { isNeonConfigured, getFamiliesPg } from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get('role') as UserRole) || 'priest';
    let familyId = searchParams.get('familyId') || searchParams.get('userFamilyId');
    if ((role === 'servant' || role === 'family_leader') && !familyId) {
      familyId = INITIAL_PERSONAS[role]?.assigned_family_id || null;
    }

    if (isNeonConfigured()) {
      let families = await getFamiliesPg();
      if ((role === 'servant' || role === 'family_leader') && familyId) {
        families = families.filter(f => f.id === familyId);
      }
      return NextResponse.json({ success: true, families });
    }

    const families = getFamilies({ userRole: role, userFamilyId: familyId });
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

    const family = updateFamily(id, data, actor);
    return NextResponse.json({ success: true, family });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
