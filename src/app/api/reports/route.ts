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
import { authenticateRequest } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const queryRole = (searchParams.get('role') as UserRole) || 'priest';
    const effectiveRole = auth.user?.role || queryRole;
    const isRestrictedRole = effectiveRole === 'servant' || effectiveRole === 'family_leader';

    let targetFamily: string | undefined = undefined;
    if (isRestrictedRole) {
      targetFamily = (auth.user?.assigned_family_id || searchParams.get('userFamilyId') || INITIAL_PERSONAS[effectiveRole]?.assigned_family_id) ?? undefined;
      if (!targetFamily) {
        return NextResponse.json({ success: true, reports: [] });
      }
    } else {
      targetFamily = searchParams.get('familyId') || undefined;
    }

    if (isNeonConfigured()) {
      const reports = await getWeeklyReportsPg({ familyId: targetFamily, status });
      return NextResponse.json({ success: true, reports });
    }

    const reports = getWeeklyReports({ familyId: targetFamily, status, userRole: effectiveRole, userFamilyId: targetFamily });
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
