import { NextRequest, NextResponse } from 'next/server';
import {
  isNeonConfigured,
  getPromotionRulesPg,
  savePromotionRulePg,
  deletePromotionRulePg,
} from '@/lib/services/neon-service';
import { INITIAL_PERSONAS } from '@/lib/constants/personas';
import { UserRole } from '@/types/organa';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (isNeonConfigured()) {
      const rules = await getPromotionRulesPg();
      return NextResponse.json({ success: true, rules });
    }
    return NextResponse.json({ success: true, rules: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole as UserRole) || 'admin';
    const actor = INITIAL_PERSONAS[actorRole] || { id: 'usr-admin', full_name: 'إدارة المنظومة', role: 'admin' };

    if (isNeonConfigured()) {
      const rule = await savePromotionRulePg(body, {
        id: actor.id,
        name: actor.full_name,
        role: actor.role,
      });
      return NextResponse.json({ success: true, rule });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const actorRole = (searchParams.get('actorRole') as UserRole) || 'admin';
    const actor = INITIAL_PERSONAS[actorRole] || { id: 'usr-admin', full_name: 'إدارة المنظومة', role: 'admin' };

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف القاعدة مطلوب' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      await deletePromotionRulePg(id, {
        id: actor.id,
        name: actor.full_name,
        role: actor.role,
      });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
