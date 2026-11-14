import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings, updateSystemSettings } from '@/lib/services/organa-service';
import { isNeonConfigured, getSystemSettingsPg, updateSystemSettingsPg } from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (isNeonConfigured()) {
      const settings = await getSystemSettingsPg();
      return NextResponse.json({ success: true, settings });
    }
    const settings = getSystemSettings();
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'admin';

    if (isNeonConfigured()) {
      const settings = await updateSystemSettingsPg(body);
      return NextResponse.json({ success: true, settings });
    }

    const actor = INITIAL_PERSONAS[actorRole] || INITIAL_PERSONAS.admin;
    const settings = updateSystemSettings(body, actor);
    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
