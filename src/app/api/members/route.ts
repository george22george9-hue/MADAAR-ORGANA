import { NextRequest, NextResponse } from 'next/server';
import { getServedMembers, createServedMember, updateServedMember, getMemberHistory } from '@/lib/services/organa-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId') || undefined;
    const servantId = searchParams.get('servantId') || undefined;
    const search = searchParams.get('search') || undefined;
    const role = (searchParams.get('role') as UserRole) || 'priest';
    let userFamilyId = searchParams.get('userFamilyId') || searchParams.get('familyId') || undefined;
    if ((role === 'servant' || role === 'family_leader') && !userFamilyId) {
      userFamilyId = INITIAL_PERSONAS[role]?.assigned_family_id || undefined;
    }
    const userServantId = searchParams.get('userServantId') || undefined;
    const memberHistoryId = searchParams.get('historyFor');

    if (memberHistoryId) {
      const history = getMemberHistory(memberHistoryId);
      return NextResponse.json({ success: true, history });
    }

    const members = getServedMembers({
      familyId,
      servantId,
      search,
      userRole: role,
      userFamilyId,
      userServantId,
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

    const member = updateServedMember(id, data, actor);
    return NextResponse.json({ success: true, member });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

