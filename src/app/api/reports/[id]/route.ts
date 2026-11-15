// ====================================================================
// ORGANA — Weekly Report by ID (/api/reports/[id])
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyReportById } from '@/lib/services/organa-service';
import { isNeonConfigured, getWeeklyReportByIdPg } from '@/lib/services/neon-service';
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
      const report = await getWeeklyReportByIdPg(params.id);
      if (!report) {
        return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    const report = getWeeklyReportById(params.id, { userRole: role, userFamilyId });
    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
