// ====================================================================
// ORGANA — Review Weekly Report API (/api/reports/[id]/review)
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { reviewWeeklyReport } from '@/lib/services/organa-service';
import { isNeonConfigured, reviewWeeklyReportPg } from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, reviewNotes, reviewerName } = body;
    const actorRole = (body.actorRole as UserRole) || 'service_secretary';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      const report = await reviewWeeklyReportPg(params.id, status, reviewNotes, reviewerName || actor?.full_name);
      return NextResponse.json({ success: true, report });
    }

    const report = reviewWeeklyReport(params.id, status, reviewNotes, actor);
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
