import { NextRequest, NextResponse } from 'next/server';
import { reviewWeeklyReport } from '@/lib/services/organa-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, reviewNotes } = body;
    const actorRole = (body.actorRole as UserRole) || 'service_secretary';
    const actor = INITIAL_PERSONAS[actorRole];

    const report = reviewWeeklyReport(params.id, status, reviewNotes, actor);
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

