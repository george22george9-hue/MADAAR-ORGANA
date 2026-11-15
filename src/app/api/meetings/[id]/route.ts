// ====================================================================
// ORGANA — Meeting Details & Update API (/api/meetings/[id])
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getMeetingById, updateMeeting } from '@/lib/services/organa-service';
import { isNeonConfigured, getMeetingByIdPg, updateMeetingPg } from '@/lib/services/neon-service';
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
      const meeting = await getMeetingByIdPg(params.id);
      if (!meeting) {
        return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, meeting });
    }

    const meeting = getMeetingById(params.id, { userRole: role, userFamilyId });
    if (!meeting) {
      return NextResponse.json({ success: false, error: 'Meeting not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, meeting });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      const meeting = await updateMeetingPg(params.id, {
        title: body.title,
        date: body.date,
        lesson_title: body.lesson_title || body.lessonTitle,
        lesson_topic: body.lesson_topic || body.lessonTopic,
        start_time: body.start_time || body.startTime,
        end_time: body.end_time || body.endTime,
        status: body.status,
        notes: body.notes,
        family_id: body.family_id || body.familyId,
      });

      if (!meeting) {
        return NextResponse.json({ success: false, error: 'تعذر العثور على الاجتماع لتحديثه' }, { status: 404 });
      }

      return NextResponse.json({ success: true, meeting });
    }

    const meeting = updateMeeting(params.id, body, actor);
    return NextResponse.json({ success: true, meeting });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
