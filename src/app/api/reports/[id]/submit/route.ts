// ====================================================================
// ORGANA — Submit Weekly Report API (/api/reports/[id]/submit)
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { submitWeeklyReport } from '@/lib/services/organa-service';
import { isNeonConfigured, submitWeeklyReportPg } from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const actorRole = (body.actorRole as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      const report = await submitWeeklyReportPg(params.id, body.submittedBy || actor?.full_name);
      return NextResponse.json({ success: true, report });
    }

    const report = submitWeeklyReport(params.id, actor);
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
