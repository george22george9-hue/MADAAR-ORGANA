import { NextRequest, NextResponse } from 'next/server';
import { getAbsenceAlerts, updateAbsenceAlertStatus } from '@/lib/services/organa-service';
import { isNeonConfigured, getAbsenceAlertsPg, updateAbsenceAlertStatusPg } from '@/lib/services/neon-service';
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
      const alerts = await getAbsenceAlertsPg({ familyId: targetFamily, status });
      return NextResponse.json({ success: true, alerts });
    }

    const alerts = getAbsenceAlerts({ familyId, status, userRole: role, userFamilyId });
    return NextResponse.json({ success: true, alerts });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, status } = body;
    const actorRole = (body.actorRole as UserRole) || 'family_leader';
    const actor = INITIAL_PERSONAS[actorRole];

    if (isNeonConfigured()) {
      await updateAbsenceAlertStatusPg(alertId, status);
      return NextResponse.json({ success: true });
    }

    updateAbsenceAlertStatus(alertId, status, actor);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

