import { NextRequest, NextResponse } from 'next/server';
import {
  assignServantToActivity,
  updateActivityAssignmentStatus,
  removeServantFromActivity,
} from '@/lib/services/organa-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    const assignment = assignServantToActivity(body, actor);
    return NextResponse.json({ success: true, assignment });
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
    const { assignmentId, updates } = body;
    const actorRole = (body.actorRole as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    updateActivityAssignmentStatus(assignmentId, updates, actor);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const actorRole = (searchParams.get('actorRole') as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    if (!assignmentId) {
      return NextResponse.json({ success: false, error: 'assignmentId required' }, { status: 400 });
    }

    removeServantFromActivity(assignmentId, actor);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

