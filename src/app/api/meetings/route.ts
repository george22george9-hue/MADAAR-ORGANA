import { NextRequest, NextResponse } from 'next/server';
import { getMeetings, createMeeting } from '@/lib/services/organa-service';
import { isNeonConfigured, getMeetingsPg, createMeetingPg } from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId') || undefined;
    const date = searchParams.get('date') || undefined;
    const role = (searchParams.get('role') as UserRole) || 'priest';
    let userFamilyId = searchParams.get('userFamilyId') || searchParams.get('familyId') || undefined;
    if ((role === 'servant' || role === 'family_leader') && !userFamilyId) {
      userFamilyId = INITIAL_PERSONAS[role]?.assigned_family_id || undefined;
    }

    if (isNeonConfigured()) {
      const targetFamily = (role === 'servant' || role === 'family_leader') ? userFamilyId : familyId;
      const meetings = await getMeetingsPg(targetFamily, date);
      return NextResponse.json({ success: true, meetings });
    }

    const meetings = getMeetings({ familyId, userRole: role, userFamilyId });
    return NextResponse.json({ success: true, meetings });
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
      const meeting = await createMeetingPg(body);
      return NextResponse.json({ success: true, meeting });
    }

    const meeting = createMeeting(body, actor);
    return NextResponse.json({ success: true, meeting });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
