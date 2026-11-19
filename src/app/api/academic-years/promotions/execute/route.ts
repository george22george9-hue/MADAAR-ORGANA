import { NextRequest, NextResponse } from 'next/server';
import {
  isNeonConfigured,
  executeAnnualPromotionPg,
} from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromYearId, toYearId, customizedDecisions } = body;
    const actorRole = (body.actorRole as UserRole) || 'admin';
    const actorName = body.actorName || INITIAL_PERSONAS[actorRole]?.full_name || 'إدارة المنظومة';
    const actorId = body.actorId || INITIAL_PERSONAS[actorRole]?.id || 'usr-admin';

    if (!fromYearId || !toYearId) {
      return NextResponse.json({ success: false, error: 'معرفات الأعوام الكنسية مطلوبة' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      const log = await executeAnnualPromotionPg(
        fromYearId,
        toYearId,
        customizedDecisions || {},
        { id: actorId, name: actorName, role: actorRole }
      );
      return NextResponse.json({ success: true, log });
    }

    return NextResponse.json({ success: false, error: 'Neon database required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
