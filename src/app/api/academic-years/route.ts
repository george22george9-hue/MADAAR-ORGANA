import { NextRequest, NextResponse } from 'next/server';
import { getAcademicYears, createAcademicYear, setActiveAcademicYear } from '@/lib/services/organa-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export async function GET() {
  try {
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
    const actor = INITIAL_PERSONAS[actorRole];

    const year = createAcademicYear(body.name, body.start_date, body.end_date, actor);
    return NextResponse.json({ success: true, year });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'priest';
    const actor = INITIAL_PERSONAS[actorRole];

    setActiveAcademicYear(body.id, actor);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

