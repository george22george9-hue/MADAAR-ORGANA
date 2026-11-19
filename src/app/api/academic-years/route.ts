import { NextRequest, NextResponse } from 'next/server';
import { getAcademicYears, createAcademicYear, setActiveAcademicYear } from '@/lib/services/organa-service';
import {
  isNeonConfigured,
  getAcademicYearsPg,
  createAcademicYearPg,
  activateAcademicYearPg,
} from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (isNeonConfigured()) {
      const years = await getAcademicYearsPg();
      return NextResponse.json({ success: true, years });
    }

    const years = getAcademicYears();
    return NextResponse.json({ success: true, years });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'priest';
    const actor = INITIAL_PERSONAS[actorRole] || { id: 'usr-admin', full_name: 'إدارة المنظومة', role: 'admin' };

    if (isNeonConfigured()) {
      const year = await createAcademicYearPg(body.name, body.start_date, body.end_date, {
        id: actor.id,
        name: actor.full_name,
        role: actor.role,
      });
      return NextResponse.json({ success: true, year });
    }

    const year = createAcademicYear(body.name, body.start_date, body.end_date, actor as any);
    return NextResponse.json({ success: true, year });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'priest';
    const actor = INITIAL_PERSONAS[actorRole] || { id: 'usr-admin', full_name: 'إدارة المنظومة', role: 'admin' };

    if (isNeonConfigured()) {
      await activateAcademicYearPg(body.id, {
        id: actor.id,
        name: actor.full_name,
        role: actor.role,
      });
      return NextResponse.json({ success: true });
    }

    setActiveAcademicYear(body.id, actor as any);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

