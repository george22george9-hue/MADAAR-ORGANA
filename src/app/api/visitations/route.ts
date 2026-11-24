// ====================================================================
// ORGANA — Pastoral Visitations API (/api/visitations)
// The Great Martyr St. George Church – Sandbees, Egypt
// ====================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  isNeonConfigured,
  getPastoralVisitationsPg,
  recordPastoralVisitationPg,
  deletePastoralVisitationPg,
} from '@/lib/services/neon-service';
import { queryOnePg, queryPg } from '@/lib/db/neon';
import { authenticateRequest } from '@/lib/auth/server-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const currentUser = auth.user;
    const { searchParams } = new URL(request.url);
    const requestedFamilyId = searchParams.get('familyId') || undefined;
    const requestedMemberId = searchParams.get('memberId') || undefined;
    const requestedServantId = searchParams.get('servantId') || undefined;
    const requestedMethod = searchParams.get('method') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let effectiveFamilyId = requestedFamilyId;

    // RBAC: Family Leader or Servant without manage permissions is bound to their family
    if (
      (currentUser.role === 'family_leader' || currentUser.role === 'servant') &&
      currentUser.assigned_family_id
    ) {
      if (requestedFamilyId && requestedFamilyId !== currentUser.assigned_family_id) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح باستعراض افتقادات أسرة أخرى' },
          { status: 403 }
        );
      }
      effectiveFamilyId = currentUser.assigned_family_id;
    }

    if (isNeonConfigured()) {
      const visitations = await getPastoralVisitationsPg({
        familyId: effectiveFamilyId,
        memberId: requestedMemberId,
        servantId: requestedServantId,
        method: requestedMethod,
        dateFrom,
        dateTo,
        limit,
      });

      return NextResponse.json({ success: true, visitations });
    }

    return NextResponse.json({ success: true, visitations: [] });
  } catch (err: any) {
    console.error('Error fetching visitations:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const currentUser = auth.user;
    const body = await request.json();

    const {
      member_id,
      family_id,
      visitation_date,
      method,
      servant_ids,
      servant_names,
      notes,
    } = body;

    // 1. Validation
    if (!member_id) {
      return NextResponse.json({ success: false, error: 'يرجى اختيار المخدوم' }, { status: 400 });
    }

    if (!visitation_date) {
      return NextResponse.json({ success: false, error: 'يرجى تحديد تاريخ الافتقاد' }, { status: 400 });
    }

    if (!method || !['home_visit', 'phone_call', 'church_meeting'].includes(method)) {
      return NextResponse.json(
        { success: false, error: 'طريقة الافتقاد غير صحيحة (زيارة منزلية / تليفون / مقابلة بالكنيسة)' },
        { status: 400 }
      );
    }

    if (!Array.isArray(servant_ids) || servant_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'يجب اختيار خادم واحد على الأقل شارك في الافتقاد' },
        { status: 400 }
      );
    }

    if (!notes || notes.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'يرجى كتابة تقرير أو ملاحظات الافتقاد' },
        { status: 400 }
      );
    }

    // 2. Fetch member info if family_id is missing
    let resolvedFamilyId = family_id;
    if (!resolvedFamilyId && isNeonConfigured()) {
      const member = await queryOnePg(
        `SELECT current_family_id FROM served_members WHERE id = $1`,
        [member_id]
      );
      if (member) {
        resolvedFamilyId = member.current_family_id;
      }
    }

    // 3. Resolve servant names if not provided
    let resolvedServantNames = servant_names || [];
    if ((!resolvedServantNames || resolvedServantNames.length === 0) && isNeonConfigured()) {
      const servantsRes = await queryPg(
        `SELECT id, full_name FROM servants WHERE id = ANY($1)`,
        [servant_ids]
      );
      resolvedServantNames = servantsRes.map((s: any) => s.full_name);
    }

    // 4. Save to Database
    if (isNeonConfigured()) {
      const newVisitation = await recordPastoralVisitationPg({
        memberId: member_id,
        familyId: resolvedFamilyId,
        visitationDate: visitation_date,
        method,
        servantIds: servant_ids,
        servantNames: resolvedServantNames,
        notes: notes.trim(),
        recordedById: currentUser.id,
        recordedByName: currentUser.full_name,
      });

      return NextResponse.json({
        success: true,
        visitation: newVisitation,
        message: 'تم تسجيل وتوثيق الافتقاد بنجاح',
      });
    }

    return NextResponse.json(
      { success: false, error: 'قاعدة البيانات غير مفعلة' },
      { status: 500 }
    );
  } catch (err: any) {
    console.error('Error creating visitation:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const currentUser = auth.user;
    if (
      !['admin', 'priest', 'general_supervisor', 'family_leader'].includes(currentUser.role)
    ) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بحذف سجلات الافتقاد' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الافتقاد مطلوب' }, { status: 400 });
    }

    if (isNeonConfigured()) {
      await deletePastoralVisitationPg(id);
      return NextResponse.json({ success: true, message: 'تم حذف الافتقاد بنجاح' });
    }

    return NextResponse.json({ success: false, error: 'قاعدة البيانات غير متصلة' }, { status: 500 });
  } catch (err: any) {
    console.error('Error deleting visitation:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
