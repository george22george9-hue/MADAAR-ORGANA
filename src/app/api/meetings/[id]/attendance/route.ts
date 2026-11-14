import { NextRequest, NextResponse } from 'next/server';
import {
  getMeetingAttendance,
  recordMemberAttendance,
  bulkSaveMemberAttendance,
  recordServantAttendance,
  bulkSaveServantAttendance,
} from '@/lib/services/organa-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get('role') as UserRole) || 'priest';
    let userFamilyId = searchParams.get('userFamilyId') || searchParams.get('familyId') || undefined;
    if ((role === 'servant' || role === 'family_leader') && !userFamilyId) {
      userFamilyId = INITIAL_PERSONAS[role]?.assigned_family_id || undefined;
    }

    const data = getMeetingAttendance(params.id, { userRole: role, userFamilyId });
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    if (body.type === 'bulk_members') {
      bulkSaveMemberAttendance(params.id, body.records, actor);
    } else if (body.type === 'bulk_servants') {
      bulkSaveServantAttendance(params.id, body.records, actor);
    } else if (body.type === 'single_member') {
      recordMemberAttendance(params.id, body.memberId, body.status, body.excuseReason || null, actor, body.details);
    } else if (body.type === 'single_servant') {
      recordServantAttendance(params.id, body.servantId, body.status, body.excuseReason || null, actor, body.details);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

