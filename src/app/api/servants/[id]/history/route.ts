import { NextResponse } from 'next/server';
import { getServantHistoricalProfilePg } from '@/lib/services/neon-service';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const servantId = params.id;
    if (!servantId) {
      return NextResponse.json(
        { success: false, error: 'Servant ID is required' },
        { status: 400 }
      );
    }

    const data = await getServantHistoricalProfilePg(servantId);
    if (!data.servant) {
      return NextResponse.json(
        { success: false, error: 'الخادم غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Error fetching servant history profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch servant history' },
      { status: 500 }
    );
  }
}
