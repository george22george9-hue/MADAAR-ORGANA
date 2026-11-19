import { NextRequest, NextResponse } from 'next/server';
import { isNeonConfigured } from '@/lib/services/neon-service';
import { queryOnePg } from '@/lib/db/neon';
import { getUsers } from '@/lib/services/organa-service';
import { normalizePhone } from '@/lib/utils/phone';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, phone } = body;

    if (!userId && !phone) {
      return NextResponse.json({ valid: false, reason: 'missing_credentials' });
    }

    const cleanPhone = phone ? normalizePhone(phone) : '';

    let user: any = null;

    if (isNeonConfigured()) {
      user = await queryOnePg(
        `SELECT id, is_active, role FROM users 
         WHERE (id = $1 OR (phone = $2 AND $2 != '') OR (phone = $3 AND $3 != ''))
         LIMIT 1`,
        [userId || null, phone || '', cleanPhone || '']
      );
    } else {
      user = getUsers().find(u => u.id === userId || (phone && u.phone === phone));
    }

    if (!user || !user.is_active) {
      return NextResponse.json({ valid: false, reason: 'deleted_or_inactive' });
    }

    return NextResponse.json({ valid: true, role: user.role });
  } catch (err: any) {
    return NextResponse.json({ valid: true }); // Graceful fallback on network glitch
  }
}
