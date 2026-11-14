import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/services/organa-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = getAuditLogs(150);
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

