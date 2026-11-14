import { NextRequest, NextResponse } from 'next/server';
import { getSpiritualFollowups, recordSpiritualFollowup } from '@/lib/services/organa-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId') || undefined;
    const memberId = searchParams.get('memberId') || undefined;
    const date = searchParams.get('date') || undefined;
    const role = (searchParams.get('role') as UserRole) || 'priest';
    let userFamilyId = searchParams.get('userFamilyId') || searchParams.get('familyId') || undefined;
    if ((role === 'servant' || role === 'family_leader') && !userFamilyId) {
      userFamilyId = INITIAL_PERSONAS[role]?.assigned_family_id || undefined;
    }

    const followups = getSpiritualFollowups({ familyId, memberId, date, userRole: role, userFamilyId });
    return NextResponse.json({ success: true, followups });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, date, data } = body;
    const actorRole = (body.actorRole as UserRole) || 'servant';
    const actor = INITIAL_PERSONAS[actorRole];

    recordSpiritualFollowup(memberId, date, data, actor);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

