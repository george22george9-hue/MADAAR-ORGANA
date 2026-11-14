import { NextRequest, NextResponse } from 'next/server';
import {
  addMeetingActivity,
  updateMeetingActivity,
  deleteMeetingActivity,
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

    const activity = addMeetingActivity(
      params.id,
      body.title,
      body.description || '',
      body.order_index || 1,
      actor
    );
    return NextResponse.json({ success: true, activity });
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
    const { activityId, ...updates } = body;
    updateMeetingActivity(activityId, updates);
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
    const activityId = searchParams.get('activityId');
    const actorRole = (searchParams.get('actorRole') as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    if (!activityId) {
      return NextResponse.json({ success: false, error: 'activityId required' }, { status: 400 });
    }

    deleteMeetingActivity(activityId, actor);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

