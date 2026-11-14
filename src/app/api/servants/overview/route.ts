// ====================================================================
// ORGANA — Servants Pastoral Overview API (/api/servants/overview)
// Live Pastoral Report for Priest & Service Secretary
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { isNeonConfigured, getServantsPastoralOverviewPg } from '@/lib/services/neon-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId') || undefined;

    if (isNeonConfigured()) {
      const data = await getServantsPastoralOverviewPg(familyId);
      return NextResponse.json({ success: true, ...data });
    }

    return NextResponse.json({
      success: true,
      servants: [],
      summary: {
        totalServants: 0,
        presentCount: 0,
        absentCount: 0,
        liturgyCount: 0,
        notebookCount: 0,
        lessonCount: 0,
        liturgyRate: 0,
        notebookRate: 0,
      },
    });
  } catch (err: any) {
    console.error('Error fetching pastoral overview:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
