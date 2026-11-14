import { NextRequest, NextResponse } from 'next/server';
import {
  getMeetingAttendance,
  recordMemberAttendance,
  bulkSaveMemberAttendance,
  recordServantAttendance,
  bulkSaveServantAttendance,
} from '@/lib/services/organa-service';
import {
  isNeonConfigured,
  getMeetingAttendancePg,
  bulkSaveMemberAttendancePg,
  bulkSaveServantAttendancePg,
} from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

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

    if (isNeonConfigured()) {
      const data = await getMeetingAttendancePg(params.id);
      return NextResponse.json({ success: true, ...data });
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
    const actor = INITIAL_PERSONAS[actorRole] || { id: 'usr-admin', full_name: 'إدارة المنظومة' };

    if (isNeonConfigured()) {
      if (body.type === 'bulk_members') {
        await bulkSaveMemberAttendancePg(params.id, body.records, { id: actor.id, name: actor.full_name });
      } else if (body.type === 'bulk_servants') {
        await bulkSaveServantAttendancePg(params.id, body.records, { id: actor.id, name: actor.full_name });
      } else if (body.type === 'single_member') {
        await bulkSaveMemberAttendancePg(params.id, [{
          memberId: body.memberId,
          status: body.status,
          excuseReason: body.excuseReason,
          attendedLiturgy: body.details?.attended_liturgy,
          attendedCommunion: body.details?.attended_communion,
          attendedClass: body.details?.attended_class,
          attendedConfession: body.details?.attended_confession,
        }], { id: actor.id, name: actor.full_name });
      } else if (body.type === 'single_servant') {
        await bulkSaveServantAttendancePg(params.id, [{
          servantId: body.servantId,
          status: body.status,
          excuseReason: body.excuseReason,
          didOpening: body.details?.did_opening,
          didWorkshop: body.details?.did_workshop,
          didPreparation: body.details?.did_preparation,
          didLesson: body.details?.did_lesson,
        }], { id: actor.id, name: actor.full_name });
      }
      return NextResponse.json({ success: true });
    }

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
