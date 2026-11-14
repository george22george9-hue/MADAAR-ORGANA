import { NextRequest, NextResponse } from 'next/server';
import { getJoinRequests, createJoinRequest } from '@/lib/services/organa-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const requests = getJoinRequests(status);
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    return NextResponse.json({ success: true, requests, pendingCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = createJoinRequest({
      fullName: body.fullName || body.full_name,
      phone: body.phone,
      email: body.email,
      requestedRole: body.requestedRole || body.requested_role,
      requestedFamilyId: body.requestedFamilyId || body.requested_family_id,
      notes: body.notes,
      password: body.password,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, request: result.request });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
