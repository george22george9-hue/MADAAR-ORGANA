// ====================================================================
// ORGANA — Weekly Reports API (/api/reports)
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyReports, updateWeeklyReport } from '@/lib/services/organa-service';
import { isNeonConfigured, getWeeklyReportsPg, updateWeeklyReportPg } from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId') || undefined;
    const status = searchParams.get('status') || undefined;
    const role = (searchParams.get('role') as UserRole) || 'priest';
    let userFamilyId = searchParams.get('userFamilyId') || searchParams.get('familyId') || undefined;
    if ((role === 'servant' || role === 'family_leader') && !userFamilyId) {
      userFamilyId = INITIAL_PERSONAS[role]?.assigned_family_id || undefined;
    }

    if (isNeonConfigured()) {
      const targetFamily = (role === 'servant' || role === 'family_leader') ? userFamilyId : familyId;
      const reports = await getWeeklyReportsPg({ familyId: targetFamily, status });
      return NextResponse.json({ success: true, reports });
    }

    const reports = getWeeklyReports({ familyId, status, userRole: role, userFamilyId });
    return NextResponse.json({ success: true, reports });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    const actorRole = (body.actorRole as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      const report = await updateWeeklyReportPg(id, data);
      return NextResponse.json({ success: true, report });
    }

    const report = updateWeeklyReport(id, data, actor);
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
