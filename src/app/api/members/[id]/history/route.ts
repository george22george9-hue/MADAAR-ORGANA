import { NextResponse } from 'next/server';
import { getMemberHistoricalProfilePg } from '@/lib/services/neon-service';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const memberId = params.id;
    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const data = await getMemberHistoricalProfilePg(memberId);
    if (!data.member) {
      return NextResponse.json(
        { success: false, error: 'المخدوم غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error('Error fetching member history profile:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch member history' },
      { status: 500 }
    );
  }
}
