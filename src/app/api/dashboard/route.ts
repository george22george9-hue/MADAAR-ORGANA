import { NextRequest, NextResponse } from 'next/server';
import {
  getPriestDashboardData,
  getSecretaryDashboardData,
  getFamilyLeaderDashboardData,
  getServantDashboardData,
} from '@/lib/services/organa-service';
import { isNeonConfigured, getDashboardDataPg } from '@/lib/services/neon-service';
import { authenticateRequest } from '@/lib/auth/server-auth';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    let role = (searchParams.get('role') as UserRole) || 'admin';
    let familyId = searchParams.get('familyId') || undefined;
    let servantId = searchParams.get('servantId') || undefined;

    // Strict RBAC: Servants and Family Leaders only see their assigned family
    if (auth.user) {
      if (auth.user.role === 'servant' || auth.user.role === 'family_leader') {
        role = auth.user.role;
        familyId = auth.user.assigned_family_id || undefined;
        servantId = auth.user.id;
      }
    }

    if (isNeonConfigured()) {
      const data = await getDashboardDataPg(role, familyId, servantId);
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
