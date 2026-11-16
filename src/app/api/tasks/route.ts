import { NextRequest, NextResponse } from 'next/server';
import { getFollowupTasks, completeFollowupTask } from '@/lib/services/organa-service';
import { isNeonConfigured, getFollowupTasksPg, completeFollowupTaskPg } from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const servantId = searchParams.get('servantId') || undefined;

    if (isNeonConfigured()) {
      const tasks = await getFollowupTasksPg(servantId);
      return NextResponse.json({ success: true, tasks });
    }

    const tasks = getFollowupTasks(servantId);
    return NextResponse.json({ success: true, tasks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, result, notes } = body;
    const actorRole = (body.actorRole as UserRole) || 'servant';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      await completeFollowupTaskPg(taskId, result, notes, actor?.full_name);
      return NextResponse.json({ success: true });
    }

    completeFollowupTask(taskId, result, notes, actor);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

