import { NextRequest, NextResponse } from 'next/server';
import {
  isNeonConfigured,
  getAnnualPromotionPreviewPg,
} from '@/lib/services/neon-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromYear = searchParams.get('fromYear');
    const toYear = searchParams.get('toYear');

    if (!fromYear || !toYear) {
      return NextResponse.json({ success: false, error: 'يجب تحديد السنة الحالية والسنة القادمة للترحيل' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      const preview = await getAnnualPromotionPreviewPg(fromYear, toYear);
      return NextResponse.json({ success: true, preview });
    }

    return NextResponse.json({ success: false, error: 'Neon database required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
