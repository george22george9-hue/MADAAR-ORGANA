import { NextResponse } from 'next/server';
import {
  getServantAcademicAssignmentsPg,
  saveServantAcademicAssignmentsPg,
  copyPreviousYearServantAssignmentsPg,
  compareServantAssignmentsPg,
  getActiveAcademicYearPg,
} from '@/lib/services/neon-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let yearId = searchParams.get('yearId');
    if (!yearId) {
      const activeYear = await getActiveAcademicYearPg();
      yearId = activeYear?.id || null;
    }

    if (!yearId) {
      return NextResponse.json({ success: true, assignments: [] });
    }

    const assignments = await getServantAcademicAssignmentsPg(yearId);
    return NextResponse.json({ success: true, assignments, academicYearId: yearId });
  } catch (error: any) {
    console.error('Error fetching servant assignments:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch servant assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, actor = { id: 'usr-admin', name: 'أدمن النظام', role: 'admin' } } = body;

    if (action === 'save') {
      const { academicYearId, assignments } = body;
      if (!academicYearId || !Array.isArray(assignments)) {
        return NextResponse.json(
          { success: false, error: 'academicYearId and assignments array are required' },
          { status: 400 }
        );
      }
      await saveServantAcademicAssignmentsPg(academicYearId, assignments, actor);
      return NextResponse.json({ success: true, message: 'تم حفظ توزيعة الخدام بنجاح' });
    }

    if (action === 'copy') {
      const { fromYearId, toYearId } = body;
      if (!fromYearId || !toYearId) {
        return NextResponse.json(
          { success: false, error: 'fromYearId and toYearId are required' },
          { status: 400 }
        );
      }
      const result = await copyPreviousYearServantAssignmentsPg(fromYearId, toYearId, actor);
      return NextResponse.json({
        success: true,
        message: `تم نسخ ${result.copiedCount} خادماً من العام السابق بنجاح`,
        ...result,
      });
    }

    if (action === 'compare') {
      const { fromYearId, toYearId } = body;
      if (!fromYearId || !toYearId) {
        return NextResponse.json(
          { success: false, error: 'fromYearId and toYearId are required' },
          { status: 400 }
        );
      }
      const comparison = await compareServantAssignmentsPg(fromYearId, toYearId);
      return NextResponse.json({ success: true, comparison });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling servant assignments action:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process servant assignments' },
      { status: 500 }
    );
  }
}
