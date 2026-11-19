import { NextResponse } from 'next/server';
import { getAnnualPromotionLogsPg } from '@/lib/services/neon-service';

export async function GET() {
  try {
    const logs = await getAnnualPromotionLogsPg();
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Error fetching promotion history:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch promotion history' },
      { status: 500 }
    );
  }
}
