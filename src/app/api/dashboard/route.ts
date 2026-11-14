import { NextRequest, NextResponse } from 'next/server';
import {
  getPriestDashboardData,
  getSecretaryDashboardData,
  getFamilyLeaderDashboardData,
  getServantDashboardData,
} from '@/lib/services/organa-service';
import { isNeonConfigured, getDashboardDataPg } from '@/lib/services/neon-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'admin';
    const familyId = searchParams.get('familyId') || undefined;
    const servantId = searchParams.get('servantId') || undefined;

    if (isNeonConfigured()) {
      const data = await getDashboardDataPg();
      return NextResponse.json({ success: true, data });
    }

    let data;
    if (role === 'admin' || role === 'priest') {
      data = getPriestDashboardData();
    } else if (role === 'service_secretary') {
      data = getSecretaryDashboardData();
    } else if (role === 'family_leader') {
      data = getFamilyLeaderDashboardData(familyId || 'fam-prep-boys');
    } else {
      data = getServantDashboardData(servantId || '', familyId);
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
