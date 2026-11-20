// ====================================================================
// ORGANA Neon Cloud PostgreSQL Service Layer
// 100% Persistent, Reliable Cloud Data Operations
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { getPgPool, queryPg, queryOnePg } from '@/lib/db/neon';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { sendPushToUserPg, sendPushToAdminsPg } from '@/lib/services/push-service';
import {
  ChurchUser,
  UserRole,
  SystemSettings,
  Family,
  Servant,
  ServedMember,
  JoinRequest,
  Meeting,
  AbsenceAlert,
  AbsenceAlertType,
  AbsenceRiskCategory,
  AttendanceTrend,
  AbsenceEngineThresholds,
  ChurchNotification,
  AcademicYear,
  PromotionRule,
  MemberAcademicHistory,
  AnnualPromotionLog,
  ServantAcademicAssignment,
  AnnualPromotionPreview,
  PromotionPreviewItem,
  MeetingServantRole,
  MeetingServantRoleType,
  FollowupContactLog,
  FollowupWorkflowStatus,
  FollowupPriority,
} from '@/types/organa';
import { getStagesForFamily, getFamilyCodeLetter, getStageCodeLetter } from '@/lib/constants/stages';
import { normalizePhone } from '@/lib/utils/phone';

export function isNeonConfigured(): boolean {
  // Always use Neon Cloud PostgreSQL for 100% persistent data across all deployments & Vercel
  return true;
}

// --------------------------------------------------------------------
// 1. System Settings
// --------------------------------------------------------------------
export async function getSystemSettingsPg(): Promise<SystemSettings> {
  const row = await queryOnePg(`SELECT * FROM system_settings WHERE id = 'default'`);
  if (!row) {
    await queryPg(`
      INSERT INTO system_settings (id, church_name_ar, church_name_en, consecutive_absence_threshold, active_academic_year_id)
      VALUES ('default', 'كنيسة الشهيد العظيم مارجرجس بسندبيس', 'The Great Martyr St. George Church – Sandbees, Egypt', 3, 'ay-2026-2027')
      ON CONFLICT (id) DO NOTHING
    `);
    return {
      id: 'default',
      church_name_ar: 'كنيسة الشهيد العظيم مارجرجس بسندبيس',
      church_name_en: 'The Great Martyr St. George Church – Sandbees, Egypt',
      consecutive_absence_threshold: 3,
      active_academic_year_id: 'ay-2026-2027',
      servant_can_view_all_family_members: false,
      allow_servant_attendance_recording: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return {
    ...row,
    servant_can_view_all_family_members: Boolean(row.servant_can_view_all_family_members),
    allow_servant_attendance_recording: Boolean(row.allow_servant_attendance_recording),
  };
}

export async function updateSystemSettingsPg(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  await queryPg(`
    UPDATE system_settings
    SET church_name_ar = COALESCE($1, church_name_ar),
        church_name_en = COALESCE($2, church_name_en),
        consecutive_absence_threshold = COALESCE($3, consecutive_absence_threshold),
        servant_can_view_all_family_members = COALESCE($4, servant_can_view_all_family_members),
        allow_servant_attendance_recording = COALESCE($5, allow_servant_attendance_recording),
        updated_at = now()
    WHERE id = 'default'
  `, [
    settings.church_name_ar ?? null,
    settings.church_name_en ?? null,
    settings.consecutive_absence_threshold ?? null,
    settings.servant_can_view_all_family_members !== undefined ? settings.servant_can_view_all_family_members : null,
    settings.allow_servant_attendance_recording !== undefined ? settings.allow_servant_attendance_recording : null,
  ]);
  return getSystemSettingsPg();
}

// --------------------------------------------------------------------
// 2. Users & Authentication
// --------------------------------------------------------------------
export async function getUsersPg(): Promise<ChurchUser[]> {
  const rows = await queryPg(`SELECT * FROM users ORDER BY full_name ASC`);
  if (rows.length === 0) {
    await queryPg(`
      INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, is_active, password_hash)
      VALUES ('usr-admin', 'admin@organa.eg', 'إدارة المنظومة (مسؤول النظام)', '01202074649', 'admin', NULL, true, 'George-O229')
      ON CONFLICT (id) DO NOTHING
    `);
    const fresh = await queryPg(`SELECT * FROM users ORDER BY full_name ASC`);
    return fresh.map(r => ({ ...r, is_active: Boolean(r.is_active) }));
  }
  return rows.map(r => ({
    ...r,
    is_active: Boolean(r.is_active),
  }));
}

export async function getUserByIdPg(id: string): Promise<ChurchUser | null> {
  const row = await queryOnePg(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!row) return null;
  return { ...row, is_active: Boolean(row.is_active) };
}

export async function getUserByPhonePg(phone: string): Promise<ChurchUser | null> {
  const row = await queryOnePg(`SELECT * FROM users WHERE phone = $1`, [phone]);
  if (!row) return null;
  return { ...row, is_active: Boolean(row.is_active) };
}

export async function createUserPg(data: {
  email?: string;
  full_name: string;
  phone: string;
  role: UserRole;
  assigned_family_id?: string;
  assigned_stage?: string;
  confession_father?: string;
  password?: string;
}): Promise<ChurchUser> {
  const rawPhone = data.phone.trim();
  const cleanPhone = normalizePhone(rawPhone) || rawPhone;
  const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const rawPass = data.password ? data.password.trim() : 'George-O229';
  const passwordHash = await hashPassword(rawPass);

  await queryPg(`
    INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, assigned_stage, confession_father, password_hash, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
  `, [
    id,
    data.email?.trim() || `${cleanPhone}@organa.eg`,
    data.full_name.trim(),
    cleanPhone,
    data.role,
    data.assigned_family_id || null,
    data.assigned_stage?.trim() || null,
    data.confession_father?.trim() || null,
    passwordHash,
  ]);

  // If role is servant or family_leader, link or create profile in servants
  if (data.role === 'servant' || data.role === 'family_leader') {
    const existingServant = await queryOnePg(
      `SELECT id FROM servants WHERE phone = $1 OR phone = $2`,
      [rawPhone, cleanPhone]
    );
    if (existingServant) {
      await queryPg(`UPDATE servants SET user_id = $1 WHERE id = $2`, [id, existingServant.id]);
    } else {
      const sId = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await queryPg(`
        INSERT INTO servants (id, full_name, phone, confession_father, joining_date, is_active, user_id, assigned_stage)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, true, $5, $6)
      `, [
        sId,
        data.full_name.trim(),
        cleanPhone,
        data.confession_father?.trim() || null,
        id,
        data.assigned_stage?.trim() || null,
      ]);

      if (data.assigned_family_id) {
        const fsId = `fs-${data.assigned_family_id}-${sId}`;
        await queryPg(`
          INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family, stage)
          VALUES ($1, $2, $3, 'ay-2026-2027', $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [
          fsId,
          data.assigned_family_id,
          sId,
          data.role === 'family_leader' ? 'أمين أسرة' : 'خادم',
          data.assigned_stage?.trim() || null,
        ]);
      }
    }
  }

  return (await getUserByIdPg(id))!;
}

export async function updateUserPg(id: string, updates: Partial<ChurchUser> & { assigned_stage?: string; password?: string }): Promise<ChurchUser> {
  const oldUser = await getUserByIdPg(id);
  const rawPhone = updates.phone ? updates.phone.trim() : null;
  const cleanPhone = rawPhone ? (normalizePhone(rawPhone) || rawPhone) : null;

  let passHash: string | undefined = undefined;
  if (updates.password && updates.password.trim()) {
    passHash = await hashPassword(updates.password.trim());
  }

  await queryPg(`
    UPDATE users
    SET full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        email = COALESCE($3, email),
        role = COALESCE($4, role),
        assigned_family_id = CASE WHEN $5::text = '__CLEAR__' THEN NULL WHEN $5::text IS NOT NULL THEN $5 ELSE assigned_family_id END,
        assigned_stage = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE assigned_stage END,
        confession_father = COALESCE($7, confession_father),
        is_active = COALESCE($8, is_active),
        password_hash = COALESCE($9, password_hash),
        updated_at = now()
    WHERE id = $10
  `, [
    updates.full_name ?? null,
    cleanPhone ?? null,
    updates.email ?? null,
    updates.role ?? null,
    updates.assigned_family_id === null ? '__CLEAR__' : (updates.assigned_family_id ?? null),
    updates.assigned_stage ?? null,
    updates.confession_father ?? null,
    updates.is_active !== undefined ? updates.is_active : null,
    passHash ?? null,
    id,
  ]);

  // Synchronize servant record automatically whenever user details, family or stage are edited
  const targetFamilyId = updates.assigned_family_id || oldUser?.assigned_family_id;
  const targetStage = updates.assigned_stage || oldUser?.assigned_stage;

  await queryPg(`
    UPDATE servants
    SET full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        confession_father = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE confession_father END,
        is_active = COALESCE($4, is_active),
        assigned_stage = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE assigned_stage END,
        user_id = $6,
        updated_at = now()
    WHERE user_id = $6 OR phone = $7 OR (phone = $2 AND $2 IS NOT NULL)
  `, [
    updates.full_name ?? null,
    cleanPhone ?? null,
    updates.confession_father ?? null,
    updates.is_active !== undefined ? updates.is_active : null,
    targetStage ?? null,
    id,
    oldUser?.phone || null,
  ]);

  if (targetFamilyId) {
    const servantRow = await queryOnePg(
      `SELECT id FROM servants WHERE user_id = $1 OR phone = $2 OR phone = $3`,
      [id, cleanPhone || '', oldUser?.phone || '']
    );
    if (servantRow) {
      await queryPg(`DELETE FROM family_servants WHERE servant_id = $1 AND family_id <> $2`, [servantRow.id, targetFamilyId]);
      const fsId = `fs-${targetFamilyId}-${servantRow.id}`;
      await queryPg(`
        INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family, stage)
        VALUES ($1, $2, $3, 'ay-2026-2027', $4, $5)
        ON CONFLICT (id) DO UPDATE SET family_id = EXCLUDED.family_id, stage = COALESCE(EXCLUDED.stage, family_servants.stage)
      `, [
        fsId,
        targetFamilyId,
        servantRow.id,
        (updates.role || oldUser?.role) === 'family_leader' ? 'أمين أسرة' : 'خادم',
        targetStage ?? null,
      ]);
    }
  }

  return (await getUserByIdPg(id))!;
}

export async function deleteUserPg(id: string): Promise<boolean> {
  const user = await getUserByIdPg(id);
  if (!user) return false;
  const cleanPhone = normalizePhone(user.phone);
  if (user.id === 'usr-admin' || user.phone === '01202074649' || cleanPhone === '01202074649') {
    throw new Error('لا يمكن حذف حساب إدارة المنظومة الأساسي.');
  }

  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Find all servant records linked to this user or phone
    const sRows = (await client.query(
      `SELECT id FROM servants WHERE user_id = $1 OR phone = $2 OR phone = $3`,
      [id, user.phone, cleanPhone]
    )).rows;

    for (const s of sRows) {
      await client.query(`UPDATE served_members SET assigned_servant_id = NULL WHERE assigned_servant_id = $1`, [s.id]);
      await client.query(`UPDATE families SET leader_id = NULL WHERE leader_id = $1`, [s.id]);
      await client.query(`UPDATE absence_alerts SET assigned_servant_id = NULL WHERE assigned_servant_id = $1`, [s.id]);
      await client.query(`UPDATE member_academic_history SET servant_id = NULL WHERE servant_id = $1`, [s.id]);
      await client.query(`DELETE FROM family_servants WHERE servant_id = $1`, [s.id]);
      await client.query(`DELETE FROM servant_attendance WHERE servant_id = $1`, [s.id]);
      await client.query(`DELETE FROM followup_tasks WHERE servant_id = $1`, [s.id]);
      await client.query(`DELETE FROM servant_academic_assignments WHERE servant_id = $1`, [s.id]);
      await client.query(`DELETE FROM servants WHERE id = $1`, [s.id]);
    }

    // 2. Also ensure any lingering servants with this user_id or phone are removed
    await client.query(`DELETE FROM servants WHERE user_id = $1 OR phone = $2 OR phone = $3`, [id, user.phone, cleanPhone]);

    // 3. Delete from join_requests
    await client.query(`DELETE FROM join_requests WHERE phone = $1 OR phone = $2`, [user.phone, cleanPhone]);

    // 4. Delete user account from users table
    await client.query(`
      DELETE FROM users 
      WHERE (id = $1 OR phone = $2 OR phone = $3)
      AND id != 'usr-admin'
      AND phone != '01202074649'
    `, [id, user.phone, cleanPhone]);

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function changeUserPasswordPg(userId: string, currentPass: string, newPass: string): Promise<boolean> {
  const user = await queryOnePg(`SELECT * FROM users WHERE id = $1`, [userId]);
  if (!user) throw new Error('المستخدم غير موجود');
  const isValid = await verifyPassword(currentPass.trim(), user.password_hash);
  if (!isValid) {
    throw new Error('كلمة المرور الحالية غير صحيحة');
  }
  const newHash = await hashPassword(newPass.trim());
  await queryPg(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [newHash, userId]);
  return true;
}

// --------------------------------------------------------------------
// 3. Join Requests & Public Registration Approval
// --------------------------------------------------------------------
export async function getJoinRequestsPg(): Promise<JoinRequest[]> {
  const rows = await queryPg(`
    SELECT r.*, f.name as requested_family_name
    FROM join_requests r
    LEFT JOIN families f ON r.requested_family_id = f.id
    ORDER BY r.created_at DESC
  `);
  return rows.map(r => ({
    ...r,
    requested_family_name: r.requested_family_name || 'عام / لم تحدد',
  }));
}

export async function getJoinRequestByIdPg(id: string): Promise<JoinRequest | null> {
  const row = await queryOnePg(`
    SELECT r.*, f.name as requested_family_name
    FROM join_requests r
    LEFT JOIN families f ON r.requested_family_id = f.id
    WHERE r.id = $1
  `, [id]);
  return row ? { ...row, requested_family_name: row.requested_family_name || 'عام' } : null;
}

export async function createJoinRequestPg(data: {
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
  requestedRole: UserRole;
  requestedFamilyId?: string;
  requestedStage?: string;
  confessionFather?: string;
  nationalId?: string;
  jobOrStudy?: string;
  address?: string;
  birthDate?: string;
  notes?: string;
}): Promise<JoinRequest> {
  const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const rawPass = data.password?.trim() || 'George-O229';
  const passwordHash = await hashPassword(rawPass);

  await queryPg(`
    INSERT INTO join_requests (
      id, full_name, phone, email, password_hash, requested_role, requested_family_id, requested_stage,
      confession_father, national_id, job_or_study, address, birth_date, notes, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending')
  `, [
    id,
    data.fullName.trim(),
    data.phone.trim(),
    data.email?.trim() || null,
    passwordHash,
    data.requestedRole,
    data.requestedFamilyId || null,
    data.requestedStage?.trim() || null,
    data.confessionFather?.trim() || null,
    data.nationalId?.trim() || null,
    data.jobOrStudy?.trim() || null,
    data.address?.trim() || null,
    data.birthDate || null,
    data.notes?.trim() || null,
  ]);

  const savedReq = await getJoinRequestByIdPg(id);

  // Send in-app notification and lock-screen push notification to administrators and priests
  const roleNameMap: Record<string, string> = {
    admin: 'إدارة',
    priest: 'كاهن',
    service_secretary: 'أمين خدمة',
    family_leader: 'أمين أسرة',
    servant: 'خادم',
  };
  const roleTitle = roleNameMap[data.requestedRole] || 'خادم';
  const notifMsg = `وصل طلب انضمام جديد من (${data.fullName.trim()}) بصفة [${roleTitle}] بانتظار مراجعة واعتماد الإدارة.`;

  // Send in-app notification ONLY to the system administrator
  const adminUsers = await queryPg(`SELECT id FROM users WHERE role = 'admin'`);
  const adminIds = adminUsers.length > 0 ? adminUsers.map((u: any) => u.id) : ['usr-admin'];
  for (const adminId of adminIds) {
    createNotificationPg({
      target_type: 'user',
      target_id: adminId,
      sender_name: 'بوابة الانضمام للخدمة',
      sender_role: 'admin',
      title: 'طلب انضمام جديد للخدمة 📋',
      message: notifMsg,
      type: 'general',
    }).catch(console.error);
  }

  sendPushToAdminsPg({
    title: '📋 طلب انضمام جديد — مارجرجس سندبيس',
    body: notifMsg,
    url: '/users?tab=requests',
    tag: 'new-join-request',
  }).catch(console.error);

  return savedReq!;
}

export async function approveJoinRequestPg(
  requestId: string,
  reviewer: { id: string; full_name: string; role: UserRole }
): Promise<{ success: boolean; user?: ChurchUser; error?: string }> {
  const req = await getJoinRequestByIdPg(requestId);
  if (!req) return { success: false, error: 'الطلب غير موجود' };
  if (req.status !== 'pending') {
    return { success: false, error: `الطلب تم التعامل معه مسبقاً (${req.status})` };
  }

  const pool = getPgPool()!;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Mark request as approved
    await client.query(`
      UPDATE join_requests
      SET status = 'approved',
          reviewed_by = $1,
          reviewed_at = now()
      WHERE id = $2
    `, [`${reviewer.full_name} (${reviewer.role})`, requestId]);

    // 2. Upsert user in `users`
    const userRow = (await client.query(`SELECT id FROM users WHERE phone = $1`, [req.phone])).rows[0];
    let userId = userRow?.id;

    const finalPassHash = req.password_hash
      ? (req.password_hash.startsWith('$2') ? req.password_hash : await hashPassword(req.password_hash))
      : await hashPassword('George-O229');

    if (userRow) {
      await client.query(`
        UPDATE users
        SET full_name = $1,
            role = $2,
            assigned_family_id = COALESCE($3, assigned_family_id),
            assigned_stage = COALESCE($4, assigned_stage),
            confession_father = COALESCE($5, confession_father),
            password_hash = COALESCE($6, password_hash),
            is_active = true,
            updated_at = now()
        WHERE id = $7
      `, [
        req.full_name,
        req.requested_role,
        req.requested_family_id || null,
        req.requested_stage || null,
        req.confession_father || null,
        finalPassHash,
        userId,
      ]);
    } else {
      userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await client.query(`
        INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, assigned_stage, confession_father, password_hash, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      `, [
        userId,
        req.email || `${req.phone}@organa.eg`,
        req.full_name,
        req.phone,
        req.requested_role,
        req.requested_family_id || null,
        req.requested_stage || null,
        req.confession_father || null,
        finalPassHash,
      ]);
    }

    // 3. Upsert servant profile if role is servant or family_leader
    if (req.requested_role === 'servant' || req.requested_role === 'family_leader') {
      const servantRow = (await client.query(`SELECT id FROM servants WHERE phone = $1`, [req.phone])).rows[0];
      let servantId = servantRow?.id;

      if (!servantRow) {
        servantId = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await client.query(`
          INSERT INTO servants (id, user_id, full_name, phone, national_id, confession_father, job_or_study, joining_date, is_active, notes, assigned_stage)
          VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, true, $8, $9)
        `, [
          servantId,
          userId,
          req.full_name,
          req.phone,
          req.national_id || null,
          req.confession_father || null,
          req.job_or_study || null,
          req.notes || null,
          req.requested_stage || null,
        ]);
      } else {
        await client.query(`
          UPDATE servants
          SET user_id = $1,
              full_name = $2,
              confession_father = COALESCE($3, confession_father),
              assigned_stage = COALESCE($4, assigned_stage),
              is_active = true,
              updated_at = now()
          WHERE id = $5
        `, [userId, req.full_name, req.confession_father || null, req.requested_stage || null, servantId]);
      }

      // Link family in `family_servants`
      if (req.requested_family_id && servantId) {
        const fsId = `fs-${req.requested_family_id}-${servantId}`;
        await client.query(`
          INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family, stage)
          VALUES ($1, $2, $3, 'ay-2026-2027', $4, $5)
          ON CONFLICT (id) DO UPDATE SET role_in_family = EXCLUDED.role_in_family, stage = COALESCE(EXCLUDED.stage, family_servants.stage)
        `, [fsId, req.requested_family_id, servantId, req.requested_role === 'family_leader' ? 'أمين أسرة' : 'خادم', req.requested_stage || null]);

        if (req.requested_role === 'family_leader') {
          await client.query(`UPDATE families SET leader_id = $1 WHERE id = $2`, [userId, req.requested_family_id]);
        }
      }
    }

    await client.query('COMMIT');
    const finalUser = await getUserByIdPg(userId);
    return { success: true, user: finalUser! };
  } catch (err: any) {
    await client.query('ROLLBACK');
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function rejectJoinRequestPg(
  requestId: string,
  reason: string,
  reviewer: { id: string; full_name: string; role: UserRole }
): Promise<boolean> {
  await queryPg(`
    UPDATE join_requests
    SET status = 'rejected',
        rejection_reason = $1,
        reviewed_by = $2,
        reviewed_at = now()
    WHERE id = $3
  `, [reason.trim() || 'تم الرفض بواسطة الإدارة', `${reviewer.full_name} (${reviewer.role})`, requestId]);
  return true;
}

// --------------------------------------------------------------------
// 4. Families
// --------------------------------------------------------------------
export async function getFamiliesPg(): Promise<Family[]> {
  const rows = await queryPg(`
    SELECT f.*, u.full_name as leader_name, u.phone as leader_phone
    FROM families f
    LEFT JOIN users u ON f.leader_id = u.id
    ORDER BY f.id ASC
  `);
  return rows.map(r => ({
    ...r,
    stages: getStagesForFamily(r.id, r.name, r.stages),
    leader_name: r.leader_name || null,
    leader_phone: r.leader_phone || null,
  }));
}

export async function getFamilyByIdPg(id: string): Promise<Family | null> {
  const row = await queryOnePg(`
    SELECT f.*, u.full_name as leader_name, u.phone as leader_phone
    FROM families f
    LEFT JOIN users u ON f.leader_id = u.id
    WHERE f.id = $1
  `, [id]);
  return row ? { 
    ...row, 
    stages: getStagesForFamily(row.id, row.name, row.stages),
    leader_name: row.leader_name || null, 
    leader_phone: row.leader_phone || null 
  } : null;
}

export async function createFamilyPg(data: {
  name: string;
  type: string;
  leader_id?: string | null;
  academic_year_id?: string;
  meeting_day?: string;
  meeting_time?: string;
  location?: string;
  description?: string;
  color_code?: string;
  stages?: string[];
}): Promise<Family> {
  const id = `fam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const academicYearId = data.academic_year_id || 'ay-2026-2027';
  const stages = data.stages || getStagesForFamily(id, data.name);

  await queryPg(`
    INSERT INTO families (id, name, type, leader_id, academic_year_id, meeting_day, meeting_time, location, description, color_code, stages, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now(), now())
  `, [
    id,
    data.name.trim(),
    data.type || 'primary',
    data.leader_id || null,
    academicYearId,
    data.meeting_day || 'Friday',
    data.meeting_time || '17:00',
    data.location || null,
    data.description || null,
    data.color_code || '#702C3B',
    stages,
  ]);

  return (await getFamilyByIdPg(id))!;
}

export async function updateFamilyPg(
  id: string,
  data: Partial<Family> & { leader_id?: string; stages?: string[] }
): Promise<Family | null> {
  await queryPg(`
    UPDATE families SET
      name = COALESCE($1, name),
      type = COALESCE($2, type),
      color_code = COALESCE($3, color_code),
      description = COALESCE($4, description),
      meeting_day = COALESCE($5, meeting_day),
      meeting_time = COALESCE($6, meeting_time),
      location = COALESCE($7, location),
      leader_id = COALESCE($8, leader_id),
      stages = CASE WHEN $9::text[] IS NOT NULL THEN $9 ELSE stages END,
      updated_at = now()
    WHERE id = $10
  `, [
    data.name || null,
    data.type || null,
    data.color_code || null,
    data.description || null,
    data.meeting_day || null,
    data.meeting_time || null,
    data.location || null,
    data.leader_id || null,
    data.stages || null,
    id,
  ]);

  return getFamilyByIdPg(id);
}

// --------------------------------------------------------------------
// 5. Servants Management
// --------------------------------------------------------------------
export async function getServantsPg(familyId?: string): Promise<Servant[]> {
  const sql = `
    SELECT 
      s.id,
      s.user_id,
      COALESCE(u.full_name, s.full_name) as full_name,
      COALESCE(u.phone, s.phone) as phone,
      COALESCE(u.confession_father, s.confession_father, '') as confession_father,
      COALESCE(s.job_or_study, '') as job_or_study,
      COALESCE(s.national_id, '') as national_id,
      COALESCE(s.notes, '') as notes,
      s.joining_date,
      s.is_active,
      COALESCE(s.assigned_stage, u.assigned_stage) as assigned_stage,
      (SELECT COUNT(DISTINCT meeting_id) FROM servant_attendance sa WHERE sa.servant_id = s.id AND sa.status = 'present') as attended_meetings,
      (SELECT COUNT(DISTINCT activity_id) FROM meeting_activity_assignments maa WHERE maa.servant_id = s.id AND maa.participation_status = 'participated') as activities_count,
      (SELECT COUNT(*) FROM meeting_activity_assignments maa WHERE maa.servant_id = s.id AND maa.responsibility = 'lesson_preparer' AND maa.participation_status = 'participated') as lesson_prep_count,
      (SELECT COUNT(*) FROM meeting_activity_assignments maa WHERE maa.servant_id = s.id AND (maa.responsibility = 'main_presenter' OR maa.responsibility = 'presenter') AND maa.participation_status = 'participated') as lesson_explain_count,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', f.id, 'name', f.name, 'role', fs.role_in_family, 'stage', fs.stage)) 
        FILTER (WHERE f.id IS NOT NULL),
        '[]'::json
      ) as families_info
    FROM servants s
    LEFT JOIN users u ON (s.user_id = u.id OR s.phone = u.phone)
    LEFT JOIN family_servants fs ON s.id = fs.servant_id
    LEFT JOIN families f ON (fs.family_id = f.id OR u.assigned_family_id = f.id)
    GROUP BY s.id, u.id, u.full_name, u.phone, u.confession_father, u.assigned_stage
    ORDER BY COALESCE(u.full_name, s.full_name) ASC
  `;
  const rows = await queryPg(sql);

  let result: Servant[] = rows.map((r: any) => {
    const famsInfo: Array<{ id: string; name: string; role?: string; stage?: string }> = Array.isArray(r.families_info) ? r.families_info : [];
    const assigned_family_ids = famsInfo.map(f => f.id);
    const assigned_family_names = famsInfo.map(f => f.name);
    const primaryFam = famsInfo[0];
    const attended = Number(r.attended_meetings || 0);

    return {
      id: r.id,
      user_id: r.user_id,
      full_name: r.full_name,
      phone: r.phone,
      confession_father: r.confession_father || undefined,
      job_or_study: r.job_or_study || undefined,
      national_id: r.national_id || undefined,
      notes: r.notes || undefined,
      is_active: Boolean(r.is_active),
      assigned_stage: r.assigned_stage || primaryFam?.stage || undefined,
      joining_date: r.joining_date instanceof Date ? r.joining_date.toISOString().split('T')[0] : (r.joining_date ? String(r.joining_date).split('T')[0] : ''),
      assigned_family_ids,
      assigned_family_names,
      family_id: primaryFam?.id || null,
      family_name: primaryFam?.name || 'غير محدد',
      role_in_family: primaryFam?.role || 'خادم',
      activities_count: Number(r.activities_count || 0),
      lesson_prep_count: Number(r.lesson_prep_count || 0),
      lesson_explain_count: Number(r.lesson_explain_count || 0),
      attendance_rate: attended > 0 ? Math.min(100, Math.round((attended / 4) * 100)) : 100,
    } as Servant;
  });

  if (familyId) {
    result = result.filter(s => s.assigned_family_ids && s.assigned_family_ids.includes(familyId));
  }

  return result;
}

export async function getServantsPastoralOverviewPg(familyId?: string): Promise<{
  servants: Array<{
    id: string;
    full_name: string;
    phone: string;
    confession_father?: string;
    role_in_family: string;
    family_id: string;
    family_name: string;
    status: 'present' | 'absent' | 'excused' | 'not_recorded';
    attended_liturgy: boolean;
    did_opening: boolean;
    prepared_notebook: boolean;
    taught_lesson: boolean;
    attended_class: boolean;
    meeting_date?: string | null;
    excuse_reason?: string | null;
  }>;
  summary: {
    totalServants: number;
    presentCount: number;
    absentCount: number;
    liturgyCount: number;
    openingCount: number;
    notebookCount: number;
    lessonCount: number;
    liturgyRate: number;
    openingRate: number;
    notebookRate: number;
  };
}> {
  let sql = `
    SELECT 
      s.id,
      COALESCE(u.full_name, s.full_name) as full_name,
      COALESCE(u.phone, s.phone) as phone,
      COALESCE(u.confession_father, s.confession_father) as confession_father,
      COALESCE(fs.role_in_family, 'خادم') as role_in_family,
      COALESCE(fs.family_id, 'fam-eb') as family_id,
      COALESCE(f.name, 'غير محدد') as family_name,
      COALESCE(latest_att.status, 'not_recorded') as status,
      COALESCE(latest_att.attended_liturgy, 0) as attended_liturgy,
      COALESCE(latest_att.did_opening, 0) as did_opening,
      COALESCE(latest_att.did_preparation, 0) as prepared_notebook,
      COALESCE(latest_att.did_lesson, 0) as taught_lesson,
      COALESCE(latest_att.did_workshop, 0) as attended_class,
      latest_att.excuse_reason,
      latest_att.meeting_date
    FROM servants s
    LEFT JOIN users u ON (s.user_id = u.id OR s.phone = u.phone)
    LEFT JOIN family_servants fs ON s.id = fs.servant_id
    LEFT JOIN families f ON fs.family_id = f.id
    LEFT JOIN LATERAL (
      SELECT 
        sa.status, 
        COALESCE(sa.attended_liturgy, 0) as attended_liturgy,
        sa.did_opening, 
        sa.did_preparation, 
        sa.did_lesson, 
        sa.did_workshop,
        sa.excuse_reason,
        m.date as meeting_date
      FROM servant_attendance sa
      JOIN meetings m ON sa.meeting_id = m.id
      WHERE sa.servant_id = s.id
      ORDER BY m.date DESC, sa.recorded_at DESC
      LIMIT 1
    ) latest_att ON true
    WHERE s.is_active = true
  `;
  const params: any[] = [];
  if (familyId) {
    params.push(familyId);
    sql += ` AND fs.family_id = $${params.length}`;
  }
  sql += ` ORDER BY f.id ASC, s.full_name ASC`;

  const rows = await queryPg(sql, params);
  const servants = rows.map((r: any) => ({
    id: r.id,
    full_name: r.full_name,
    phone: r.phone,
    confession_father: r.confession_father || undefined,
    role_in_family: r.role_in_family || 'خادم',
    family_id: r.family_id,
    family_name: r.family_name,
    status: (r.status || 'not_recorded') as 'present' | 'absent' | 'excused' | 'not_recorded',
    attended_liturgy: Number(r.attended_liturgy) > 0,
    did_opening: Number(r.did_opening) > 0,
    prepared_notebook: Number(r.prepared_notebook) > 0,
    taught_lesson: Number(r.taught_lesson) > 0,
    attended_class: Number(r.attended_class) > 0,
    meeting_date: r.meeting_date instanceof Date ? r.meeting_date.toISOString().split('T')[0] : (r.meeting_date ? String(r.meeting_date).split('T')[0] : null),
    excuse_reason: r.excuse_reason || null,
  }));

  const totalServants = servants.length;
  const presentCount = servants.filter(s => s.status === 'present').length;
  const absentCount = servants.filter(s => s.status === 'absent').length;
  const liturgyCount = servants.filter(s => s.attended_liturgy).length;
  const openingCount = servants.filter(s => s.did_opening).length;
  const notebookCount = servants.filter(s => s.prepared_notebook).length;
  const lessonCount = servants.filter(s => s.taught_lesson).length;

  return {
    servants,
    summary: {
      totalServants,
      presentCount,
      absentCount,
      liturgyCount,
      openingCount,
      notebookCount,
      lessonCount,
      liturgyRate: totalServants > 0 ? Math.round((liturgyCount / totalServants) * 100) : 0,
      openingRate: totalServants > 0 ? Math.round((openingCount / totalServants) * 100) : 0,
      notebookRate: totalServants > 0 ? Math.round((notebookCount / totalServants) * 100) : 0,
    }
  };
}

export async function createServantPg(data: {
  full_name: string;
  phone: string;
  family_id?: string;
  assigned_stage?: string;
  role_in_family?: string;
  confession_father?: string;
  national_id?: string;
  job_or_study?: string;
  notes?: string;
}): Promise<Servant> {
  const rawPhone = data.phone.trim();
  const cleanPhone = normalizePhone(rawPhone) || rawPhone;
  const targetFamilyId = data.family_id || (Array.isArray((data as any).family_ids) ? (data as any).family_ids[0] : undefined);

  // 1. Ensure user account exists in users table so servant can log in
  let userId: string;
  const existingUser = await queryOnePg(
    `SELECT id FROM users WHERE phone = $1 OR phone = $2`,
    [rawPhone, cleanPhone]
  );

  if (existingUser) {
    userId = existingUser.id;
    await queryPg(
      `UPDATE users SET assigned_family_id = COALESCE($1, assigned_family_id), assigned_stage = COALESCE($2, assigned_stage) WHERE id = $3`,
      [targetFamilyId || null, data.assigned_stage?.trim() || null, userId]
    );
  } else {
    userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const defaultHash = await hashPassword('George-O229');
    await queryPg(`
      INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, assigned_stage, confession_father, password_hash, is_active)
      VALUES ($1, $2, $3, $4, 'servant', $5, $6, $7, $8, true)
    `, [
      userId,
      `${cleanPhone}@organa.eg`,
      data.full_name.trim(),
      cleanPhone,
      targetFamilyId || null,
      data.assigned_stage?.trim() || null,
      data.confession_father?.trim() || null,
      defaultHash,
    ]);
  }

  // 2. Insert into servants table with user_id linked
  const id = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await queryPg(`
    INSERT INTO servants (id, full_name, phone, national_id, confession_father, job_or_study, joining_date, is_active, notes, assigned_stage, user_id)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, true, $7, $8, $9)
  `, [
    id,
    data.full_name.trim(),
    cleanPhone,
    data.national_id?.trim() || null,
    data.confession_father?.trim() || null,
    data.job_or_study?.trim() || null,
    data.notes?.trim() || null,
    data.assigned_stage?.trim() || null,
    userId,
  ]);

  // 3. Assign to family
  if (targetFamilyId) {
    const fsId = `fs-${targetFamilyId}-${id}`;
    await queryPg(`
      INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family, stage)
      VALUES ($1, $2, $3, 'ay-2026-2027', $4, $5)
      ON CONFLICT (id) DO UPDATE SET family_id = EXCLUDED.family_id, stage = EXCLUDED.stage
    `, [fsId, targetFamilyId, id, data.role_in_family?.trim() || 'خادم', data.assigned_stage?.trim() || null]);
  }

  const all = await getServantsPg();
  const found = all.find(s => s.id === id);
  if (found) return found;
  const fallback = await queryOnePg(`SELECT * FROM servants WHERE id = $1`, [id]);
  return { ...fallback, is_active: Boolean(fallback?.is_active) } as Servant;
}

export async function updateServantPg(id: string, data: Partial<Servant> & { family_id?: string; family_ids?: string[]; role_in_family?: string; assigned_stage?: string }): Promise<Servant> {
  const oldServant = await queryOnePg(`SELECT * FROM servants WHERE id = $1`, [id]);
  const newRawPhone = data.phone ? data.phone.trim() : null;
  const newCleanPhone = newRawPhone ? (normalizePhone(newRawPhone) || newRawPhone) : null;

  // Resolve user_id if null
  let userId = oldServant?.user_id;
  if (!userId && (oldServant?.phone || newCleanPhone)) {
    const matchedUser = await queryOnePg(
      `SELECT id FROM users WHERE phone = $1 OR phone = $2 OR phone = $3`,
      [oldServant?.phone || '', newRawPhone || '', newCleanPhone || '']
    );
    if (matchedUser) {
      userId = matchedUser.id;
    }
  }

  await queryPg(`
    UPDATE servants
    SET full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        confession_father = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE confession_father END,
        job_or_study = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE job_or_study END,
        national_id = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE national_id END,
        notes = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE notes END,
        is_active = COALESCE($7, is_active),
        assigned_stage = CASE WHEN $8::text IS NOT NULL THEN $8 ELSE assigned_stage END,
        user_id = COALESCE($9, user_id),
        updated_at = now()
    WHERE id = $10
  `, [
    data.full_name ?? null,
    newCleanPhone || newRawPhone || null,
    data.confession_father !== undefined ? data.confession_father : null,
    data.job_or_study !== undefined ? data.job_or_study : null,
    data.national_id !== undefined ? data.national_id : null,
    data.notes !== undefined ? data.notes : null,
    data.is_active !== undefined ? data.is_active : null,
    data.assigned_stage !== undefined ? data.assigned_stage : null,
    userId || null,
    id,
  ]);

  // Synchronize user account whenever servant full_name, phone, confession_father, or assigned_stage is edited
  await queryPg(`
    UPDATE users
    SET full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        confession_father = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE confession_father END,
        is_active = COALESCE($4, is_active),
        assigned_stage = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE assigned_stage END,
        updated_at = now()
    WHERE id = $6 OR phone = $7 OR (phone = $2 AND $2 IS NOT NULL)
  `, [
    data.full_name ?? null,
    newCleanPhone || newRawPhone || null,
    data.confession_father !== undefined ? data.confession_father : null,
    data.is_active !== undefined ? data.is_active : null,
    data.assigned_stage !== undefined ? data.assigned_stage : null,
    userId || null,
    oldServant?.phone || null,
  ]);

  const targetFamilyId = data.family_id || (Array.isArray(data.family_ids) ? data.family_ids[0] : undefined);
  if (targetFamilyId) {
    // Delete any older assignments in other families to prevent duplicate servant cards
    await queryPg(`DELETE FROM family_servants WHERE servant_id = $1 AND family_id <> $2`, [id, targetFamilyId]);

    const fsId = `fs-${targetFamilyId}-${id}`;
    await queryPg(`
      INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family, stage)
      VALUES ($1, $2, $3, 'ay-2026-2027', $4, $5)
      ON CONFLICT (id) DO UPDATE SET family_id = EXCLUDED.family_id, role_in_family = EXCLUDED.role_in_family, stage = COALESCE(EXCLUDED.stage, family_servants.stage)
    `, [fsId, targetFamilyId, id, data.role_in_family || 'خادم', data.assigned_stage || null]);

    await queryPg(`
      UPDATE users
      SET assigned_family_id = $1
      WHERE id = $2 OR phone = $3
    `, [targetFamilyId, userId || oldServant?.user_id || null, newCleanPhone || oldServant?.phone || null]);
  } else if (data.assigned_stage) {
    await queryPg(`UPDATE family_servants SET stage = $1 WHERE servant_id = $2`, [data.assigned_stage, id]);
  }

  const all = await getServantsPg();
  const found = all.find(s => s.id === id);
  if (found) return found;
  const fallback = await queryOnePg(`SELECT * FROM servants WHERE id = $1`, [id]);
  return { ...fallback, is_active: Boolean(fallback?.is_active) } as Servant;
}

export async function deleteServantPg(id: string): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Locate servant by id, user_id, or phone
    const servantRes = await client.query(
      `SELECT id, user_id, phone, full_name FROM servants WHERE id = $1 OR user_id = $1 OR phone = $1`,
      [id]
    );
    const servant = servantRes.rows[0];

    const servantId = servant?.id || id;
    const userId = servant?.user_id;
    const rawPhone = servant?.phone;
    const cleanPhone = rawPhone ? normalizePhone(rawPhone) : '';

    // Safety check: Never delete primary admin
    if (userId === 'usr-admin' || rawPhone === '01202074649' || cleanPhone === '01202074649') {
      throw new Error('لا يمكن حذف حساب إدارة المنظومة الأساسي.');
    }

    // 2. Clear FK references pointing to servants
    await client.query(`UPDATE served_members SET assigned_servant_id = NULL WHERE assigned_servant_id = $1`, [servantId]);
    await client.query(`UPDATE families SET leader_id = NULL WHERE leader_id = $1`, [servantId]);
    await client.query(`UPDATE absence_alerts SET assigned_servant_id = NULL WHERE assigned_servant_id = $1`, [servantId]);
    await client.query(`UPDATE member_academic_history SET servant_id = NULL WHERE servant_id = $1`, [servantId]);
    await client.query(`DELETE FROM family_servants WHERE servant_id = $1`, [servantId]);
    await client.query(`DELETE FROM servant_attendance WHERE servant_id = $1`, [servantId]);
    await client.query(`DELETE FROM followup_tasks WHERE servant_id = $1`, [servantId]);
    await client.query(`DELETE FROM servant_academic_assignments WHERE servant_id = $1`, [servantId]);

    // 3. Delete from servants table
    await client.query(`DELETE FROM servants WHERE id = $1`, [servantId]);
    if (rawPhone) {
      await client.query(`DELETE FROM servants WHERE phone = $1 OR phone = $2`, [rawPhone, cleanPhone]);
    }

    // 4. Delete login credentials from users table (by user_id AND by phone)
    await client.query(`
      DELETE FROM users 
      WHERE (
        (id = $1 AND $1 IS NOT NULL AND $1 != '')
        OR (phone = $2 AND $2 IS NOT NULL AND $2 != '')
        OR (phone = $3 AND $3 IS NOT NULL AND $3 != '')
      )
      AND id != 'usr-admin' 
      AND phone != '01202074649'
    `, [userId || null, rawPhone || null, cleanPhone || null]);

    // 5. Delete any matching join_requests so they cannot re-enter or cause ghost states
    if (rawPhone || cleanPhone) {
      await client.query(`
        DELETE FROM join_requests 
        WHERE phone = $1 OR phone = $2
      `, [rawPhone || null, cleanPhone || null]);
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// --------------------------------------------------------------------
// 6. Served Members Management
// --------------------------------------------------------------------
export async function getServedMembersPg(familyId?: string, search?: string): Promise<ServedMember[]> {
  let sql = `
    SELECT m.*, f.name as family_name, s.full_name as assigned_servant_name
    FROM served_members m
    LEFT JOIN families f ON m.current_family_id = f.id
    LEFT JOIN servants s ON m.assigned_servant_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (familyId) {
    params.push(familyId);
    sql += ` AND m.current_family_id = $${params.length}`;
  }
  if (search) {
    params.push(`%${search.trim()}%`);
    sql += ` AND (m.full_name ILIKE $${params.length} OR m.phone ILIKE $${params.length} OR m.guardian_phone ILIKE $${params.length} OR m.code ILIKE $${params.length})`;
  }
  sql += ` ORDER BY m.full_name ASC`;

  const rows = await queryPg(sql, params);
  return rows.map(r => ({
    ...r,
    is_active: Boolean(r.is_active),
    current_family_name: r.family_name || 'غير محدد',
    family_name: r.family_name || 'غير محدد',
    assigned_servant_name: r.assigned_servant_name || 'غير معين',
    birth_date: r.birth_date instanceof Date ? r.birth_date.toISOString().split('T')[0] : String(r.birth_date || '').split('T')[0],
  }));
}

export async function getMemberByIdPg(id: string): Promise<ServedMember | null> {
  const row = await queryOnePg(`
    SELECT m.*, f.name as family_name, s.full_name as assigned_servant_name
    FROM served_members m
    LEFT JOIN families f ON m.current_family_id = f.id
    LEFT JOIN servants s ON m.assigned_servant_id = s.id
    WHERE m.id = $1
  `, [id]);
  return row ? {
    ...row,
    is_active: Boolean(row.is_active),
    current_family_name: row.family_name || 'غير محدد',
    family_name: row.family_name || 'غير محدد',
    assigned_servant_name: row.assigned_servant_name || 'غير معين',
    birth_date: row.birth_date instanceof Date ? row.birth_date.toISOString().split('T')[0] : String(row.birth_date || '').split('T')[0],
  } : null;
}

export async function createServedMemberPg(data: {
  full_name: string;
  code?: string;
  gender?: 'male' | 'female';
  birth_date?: string;
  stage?: string;
  current_family_id: string;
  assigned_servant_id?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_relationship?: string;
  phone?: string;
  address?: string;
  confession_father?: string;
  national_id?: string;
  academic_year_or_job?: string;
  notes?: string;
  photo_url?: string;
}): Promise<ServedMember> {
  const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const stageVal = data.stage?.trim() || 'عام';

  // Smart Structured Code: [FamilyLetter][StageLetter][01..99]
  let code = data.code?.trim();
  if (!code || code.startsWith('MEM-')) {
    const famLetter = getFamilyCodeLetter(data.current_family_id);
    const stageLetter = getStageCodeLetter(stageVal);
    const prefix = `${famLetter}${stageLetter}`;
    const latest = await queryOnePg<{ code: string }>(`
      SELECT code FROM served_members 
      WHERE code LIKE $1 
      ORDER BY code DESC 
      LIMIT 1
    `, [`${prefix}%`]);
    let nextNum = 1;
    if (latest?.code && latest.code.startsWith(prefix)) {
      const parsed = parseInt(latest.code.replace(prefix, ''), 10);
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }
    code = `${prefix}${String(nextNum).padStart(2, '0')}`;
  }

  // Automatic servant assignment according to stage (يتسقط علطول حسب المرحلة)
  let assignedServantId = data.assigned_servant_id || null;
  if (!assignedServantId && stageVal) {
    const matchServant = await queryOnePg<{ id: string }>(`
      SELECT s.id 
      FROM servants s
      LEFT JOIN family_servants fs ON s.id = fs.servant_id
      WHERE (s.assigned_stage = $1 OR fs.stage = $1)
        AND (fs.family_id = $2 OR s.id IN (SELECT servant_id FROM family_servants WHERE family_id = $2))
      LIMIT 1
    `, [stageVal, data.current_family_id]);
    if (matchServant) {
      assignedServantId = matchServant.id;
    }
  }

  const gender = data.gender || 'male';
  const birthDate = data.birth_date || '2013-05-15';
  const guardianName = data.guardian_name?.trim() || 'ولي أمر';
  const guardianPhone = data.guardian_phone?.trim() || data.phone?.trim() || '01000000000';
  const guardianRel = data.guardian_relationship?.trim() || 'الأب';

  await queryPg(`
    INSERT INTO served_members (
      id, code, full_name, gender, birth_date, stage, current_family_id, assigned_servant_id,
      guardian_name, guardian_phone, guardian_relationship, phone, address,
      confession_father, national_id, academic_year_or_job, is_active, notes, photo_url
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13,
      $14, $15, $16, true, $17, $18
    )
  `, [
    id,
    code,
    data.full_name.trim(),
    gender,
    birthDate,
    stageVal,
    data.current_family_id,
    assignedServantId,
    guardianName,
    guardianPhone,
    guardianRel,
    data.phone?.trim() || null,
    data.address?.trim() || null,
    data.confession_father?.trim() || null,
    data.national_id?.trim() || null,
    data.academic_year_or_job?.trim() || null,
    data.notes?.trim() || null,
    data.photo_url?.trim() || null,
  ]);

  return (await getMemberByIdPg(id))!;
}

export async function updateServedMemberPg(id: string, data: Partial<ServedMember> & Record<string, any>): Promise<ServedMember> {
  await queryPg(`
    UPDATE served_members
    SET full_name = COALESCE($1, full_name),
        gender = COALESCE($2, gender),
        birth_date = COALESCE($3, birth_date),
        stage = COALESCE($4, stage),
        current_family_id = COALESCE($5, current_family_id),
        assigned_servant_id = CASE WHEN $6::text = '__CLEAR__' THEN NULL WHEN $6::text IS NOT NULL THEN $6 ELSE assigned_servant_id END,
        guardian_name = COALESCE($7, guardian_name),
        guardian_phone = COALESCE($8, guardian_phone),
        guardian_relationship = COALESCE($9, guardian_relationship),
        phone = COALESCE($10, phone),
        address = COALESCE($11, address),
        confession_father = COALESCE($12, confession_father),
        national_id = COALESCE($13, national_id),
        academic_year_or_job = COALESCE($14, academic_year_or_job),
        notes = COALESCE($15, notes),
        is_active = COALESCE($16, is_active),
        updated_at = now()
    WHERE id = $17
  `, [
    data.full_name ?? null,
    data.gender ?? null,
    data.birth_date ?? null,
    data.stage ?? null,
    data.current_family_id ?? null,
    data.assigned_servant_id === null ? '__CLEAR__' : (data.assigned_servant_id ?? null),
    data.guardian_name ?? null,
    data.guardian_phone ?? null,
    data.guardian_relationship ?? null,
    data.phone ?? null,
    data.address ?? null,
    data.confession_father ?? null,
    data.national_id ?? null,
    data.academic_year_or_job ?? null,
    data.notes ?? null,
    data.is_active !== undefined ? data.is_active : null,
    id,
  ]);
  return (await getMemberByIdPg(id))!;
}

export async function deleteServedMemberPg(id: string): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM meeting_attendance WHERE member_id = $1`, [id]);
    await client.query(`DELETE FROM absence_alerts WHERE member_id = $1`, [id]);
    await client.query(`DELETE FROM followup_tasks WHERE member_id = $1`, [id]);
    await client.query(`DELETE FROM member_history WHERE member_id = $1`, [id]);
    await client.query(`DELETE FROM served_members WHERE id = $1`, [id]);
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// --------------------------------------------------------------------
// 7. Meetings & Attendance
// --------------------------------------------------------------------
export async function getMeetingsPg(familyId?: string, date?: string): Promise<Meeting[]> {
  let sql = `
    SELECT m.*, m.date::text as date_str, f.name as family_name, f.color_code as family_color
    FROM meetings m
    JOIN families f ON m.family_id = f.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (familyId) {
    params.push(familyId);
    sql += ` AND m.family_id = $${params.length}`;
  }
  if (date) {
    params.push(date);
    sql += ` AND m.date = $${params.length}`;
  }
  sql += ` ORDER BY m.date ASC`;

  const rows = await queryPg(sql, params);
  return rows.map(r => ({
    ...r,
    date: r.date_str || (r.date instanceof Date ? `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}-${String(r.date.getDate()).padStart(2, '0')}` : String(r.date).split('T')[0]),
  }));
}

export async function createMeetingPg(data: {
  family_id: string;
  date: string;
  title?: string;
  lesson_title?: string;
  lesson_topic?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  status?: string;
}): Promise<Meeting> {
  const dateStr = String(data.date).split('T')[0];
  const existing = await queryOnePg(`
    SELECT m.*, m.date::text as date_str, f.name as family_name, f.color_code as family_color
    FROM meetings m
    JOIN families f ON m.family_id = f.id
    WHERE m.family_id = $1 AND m.date = $2
  `, [data.family_id, dateStr]);

  if (existing) {
    return {
      ...existing,
      date: existing.date_str || (existing.date instanceof Date ? `${existing.date.getFullYear()}-${String(existing.date.getMonth() + 1).padStart(2, '0')}-${String(existing.date.getDate()).padStart(2, '0')}` : String(existing.date).split('T')[0]),
    };
  }

  const id = `mtg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const title = data.title || `لقاء الجمعة (${dateStr})`;
  await queryPg(`
    INSERT INTO meetings (
      id, family_id, academic_year_id, date, title, lesson_title, lesson_topic, start_time, end_time, status, notes
    ) VALUES ($1, $2, 'ay-2026-2027', $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    id,
    data.family_id,
    dateStr,
    title,
    data.lesson_title || null,
    data.lesson_topic || null,
    data.start_time || '17:00',
    data.end_time || '19:00',
    data.status || 'scheduled',
    data.notes || null,
  ]);

  const meeting = await queryOnePg(`
    SELECT m.*, m.date::text as date_str, f.name as family_name, f.color_code as family_color
    FROM meetings m
    JOIN families f ON m.family_id = f.id
    WHERE m.id = $1
  `, [id]);

  return {
    ...meeting,
    date: meeting?.date_str || (meeting?.date instanceof Date ? `${meeting.date.getFullYear()}-${String(meeting.date.getMonth() + 1).padStart(2, '0')}-${String(meeting.date.getDate()).padStart(2, '0')}` : String(meeting?.date || '').split('T')[0]),
  };
}

export async function getMeetingByIdPg(id: string): Promise<Meeting | null> {
  const row = await queryOnePg(`
    SELECT m.*, m.date::text as date_str, f.name as family_name, f.color_code as family_color
    FROM meetings m
    JOIN families f ON m.family_id = f.id
    WHERE m.id = $1
  `, [id]);

  if (!row) return null;

  return {
    ...row,
    date: row.date_str || (row.date instanceof Date ? `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}-${String(row.date.getDate()).padStart(2, '0')}` : String(row.date).split('T')[0]),
  };
}

export async function updateMeetingPg(
  id: string,
  data: {
    title?: string;
    date?: string;
    lesson_title?: string;
    lesson_topic?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    notes?: string;
    family_id?: string;
  }
): Promise<Meeting | null> {
  const existing = await queryOnePg(`SELECT * FROM meetings WHERE id = $1`, [id]);
  if (!existing) return null;

  const dateStr = data.date ? String(data.date).split('T')[0] : existing.date;

  await queryPg(`
    UPDATE meetings SET
      title = COALESCE($1, title),
      date = COALESCE($2, date),
      lesson_title = COALESCE($3, lesson_title),
      lesson_topic = COALESCE($4, lesson_topic),
      start_time = COALESCE($5, start_time),
      end_time = COALESCE($6, end_time),
      status = COALESCE($7, status),
      notes = COALESCE($8, notes),
      family_id = COALESCE($9, family_id),
      updated_at = now()
    WHERE id = $10
  `, [
    data.title || null,
    dateStr,
    data.lesson_title || null,
    data.lesson_topic || null,
    data.start_time || null,
    data.end_time || null,
    data.status || null,
    data.notes || null,
    data.family_id || null,
    id,
  ]);

  return getMeetingByIdPg(id);
}

export async function getMeetingAttendancePg(meetingId: string): Promise<{
  members: any[];
  servants: any[];
}> {
  const meeting = await queryOnePg(`SELECT family_id FROM meetings WHERE id = $1`, [meetingId]);
  if (!meeting) {
    return { members: [], servants: [] };
  }

  const familyId = meeting.family_id;

  const members = await queryPg(`
    SELECT 
      COALESCE(ma.id, 'att-' || $1 || '-' || sm.id) as id,
      $1 as meeting_id,
      sm.id as member_id,
      COALESCE(ma.status, 'not_recorded') as status,
      ma.excuse_reason,
      COALESCE(ma.attended_liturgy, 0) as attended_liturgy,
      COALESCE(ma.attended_communion, 0) as attended_communion,
      COALESCE(ma.attended_class, 0) as attended_class,
      COALESCE(ma.attended_confession, 0) as attended_confession,
      sm.full_name as member_name, 
      sm.code, 
      sm.stage,
      sm.guardian_phone,
      sm.confession_father,
      s.full_name as assigned_servant_name
    FROM served_members sm
    LEFT JOIN meeting_attendance ma ON ma.meeting_id = $1 AND ma.member_id = sm.id
    LEFT JOIN servants s ON sm.assigned_servant_id = s.id
    WHERE sm.current_family_id = $2 AND sm.is_active = true
    ORDER BY sm.full_name ASC
  `, [meetingId, familyId]);

  const servants = await queryPg(`
    SELECT 
      COALESCE(sa.id, 'satt-' || $1 || '-' || s.id) as id,
      $1 as meeting_id,
      s.id as servant_id,
      COALESCE(sa.status, 'not_recorded') as status,
      sa.excuse_reason,
      COALESCE(sa.attended_liturgy, 0) as attended_liturgy,
      COALESCE(sa.did_opening, 0) as did_opening,
      COALESCE(sa.did_workshop, 0) as did_workshop,
      COALESCE(sa.did_preparation, 0) as did_preparation,
      COALESCE(sa.did_lesson, 0) as did_lesson,
      s.full_name as servant_name, 
      s.phone,
      s.confession_father,
      fs.role_in_family
    FROM family_servants fs
    JOIN servants s ON fs.servant_id = s.id
    LEFT JOIN servant_attendance sa ON sa.meeting_id = $1 AND sa.servant_id = s.id
    WHERE fs.family_id = $2 AND s.is_active = true
    ORDER BY s.full_name ASC
  `, [meetingId, familyId]);

  return { members, servants };
}

export async function bulkSaveMemberAttendancePg(
  meetingId: string,
  records: Array<{
    memberId?: string;
    member_id?: string;
    status: string;
    attended_liturgy?: number | boolean;
    attendedLiturgy?: number | boolean;
    attended_communion?: number | boolean;
    attendedCommunion?: number | boolean;
    attended_class?: number | boolean;
    attendedClass?: number | boolean;
    attended_confession?: number | boolean;
    attendedConfession?: number | boolean;
    excuse_reason?: string;
    excuseReason?: string;
  }>,
  recorder: { id: string; name: string }
): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch meeting context for historical snapshotting
    const meetingRes = await client.query(`SELECT family_id, academic_year_id FROM meetings WHERE id = $1`, [meetingId]);
    const meetingFamilyId = meetingRes.rows[0]?.family_id || null;
    const meetingYearId = meetingRes.rows[0]?.academic_year_id || null;

    for (const r of records) {
      const memberId = r.memberId || r.member_id;
      if (!memberId) continue;

      const id = `att-m-${meetingId}-${memberId}`;
      const attendedLiturgy = (r.attended_liturgy || r.attendedLiturgy) ? 1 : 0;
      const attendedCommunion = (r.attended_communion || r.attendedCommunion) ? 1 : 0;
      const attendedClass = (r.attended_class || r.attendedClass) ? 1 : 0;
      const attendedConfession = (r.attended_confession || r.attendedConfession) ? 1 : 0;
      const excuse = r.excuse_reason || r.excuseReason || null;

      // Determine stage_at_time accurately from member_academic_history without unverified guessing
      let stageAtTime: string | null = null;
      if (meetingYearId) {
        const histRes = await client.query(`
          SELECT stage FROM member_academic_history
          WHERE member_id = $1 AND academic_year_id = $2
        `, [memberId, meetingYearId]);
        stageAtTime = histRes.rows[0]?.stage || null;

        if (!stageAtTime) {
          const curRes = await client.query(`
            SELECT sm.stage FROM served_members sm
            JOIN system_settings ss ON ss.id = 'default' AND ss.active_academic_year_id = $2
            WHERE sm.id = $1
          `, [memberId, meetingYearId]);
          stageAtTime = curRes.rows[0]?.stage || null;
        }
      }

      await client.query(`
        INSERT INTO meeting_attendance (
          id, meeting_id, member_id, status, attended_liturgy, attended_communion,
          attended_class, attended_confession, excuse_reason, recorded_by, recorded_at,
          family_id_at_time, stage_at_time, academic_year_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), $11, $12, $13)
        ON CONFLICT (meeting_id, member_id) DO UPDATE SET
          status = EXCLUDED.status,
          attended_liturgy = EXCLUDED.attended_liturgy,
          attended_communion = EXCLUDED.attended_communion,
          attended_class = EXCLUDED.attended_class,
          attended_confession = EXCLUDED.attended_confession,
          excuse_reason = EXCLUDED.excuse_reason,
          last_modified_by = EXCLUDED.recorded_by,
          last_modified_at = now()
      `, [
        id,
        meetingId,
        memberId,
        r.status || 'not_recorded',
        attendedLiturgy,
        attendedCommunion,
        attendedClass,
        attendedConfession,
        excuse,
        recorder.name,
        meetingFamilyId,
        stageAtTime,
        meetingYearId,
      ]);
    }
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function bulkSaveServantAttendancePg(
  meetingId: string,
  records: Array<{
    servantId?: string;
    servant_id?: string;
    status: string;
    attended_liturgy?: number | boolean;
    attendedLiturgy?: number | boolean;
    did_opening?: number | boolean;
    didOpening?: number | boolean;
    did_workshop?: number | boolean;
    didWorkshop?: number | boolean;
    did_preparation?: number | boolean;
    didPreparation?: number | boolean;
    did_lesson?: number | boolean;
    didLesson?: number | boolean;
    excuse_reason?: string;
    excuseReason?: string;
  }>,
  recorder: { id: string; name: string }
): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of records) {
      const servantId = r.servantId || r.servant_id;
      if (!servantId) continue;

      const id = `att-s-${meetingId}-${servantId}`;
      const attendedLiturgy = (r.attended_liturgy || r.attendedLiturgy) ? 1 : 0;
      const didOpening = (r.did_opening || r.didOpening) ? 1 : 0;
      const didWorkshop = (r.did_workshop || r.didWorkshop) ? 1 : 0;
      const didPreparation = (r.did_preparation || r.didPreparation) ? 1 : 0;
      const didLesson = (r.did_lesson || r.didLesson) ? 1 : 0;
      const excuse = r.excuse_reason || r.excuseReason || null;

      await client.query(`
        INSERT INTO servant_attendance (
          id, meeting_id, servant_id, status, attended_liturgy, did_opening, did_workshop,
          did_preparation, did_lesson, excuse_reason, recorded_by, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
        ON CONFLICT (meeting_id, servant_id) DO UPDATE SET
          status = EXCLUDED.status,
          attended_liturgy = EXCLUDED.attended_liturgy,
          did_opening = EXCLUDED.did_opening,
          did_workshop = EXCLUDED.did_workshop,
          did_preparation = EXCLUDED.did_preparation,
          did_lesson = EXCLUDED.did_lesson,
          excuse_reason = EXCLUDED.excuse_reason,
          last_modified_by = EXCLUDED.recorded_by,
          last_modified_at = now()
      `, [
        id,
        meetingId,
        servantId,
        r.status || 'not_recorded',
        attendedLiturgy,
        didOpening,
        didWorkshop,
        didPreparation,
        didLesson,
        excuse,
        recorder.name,
      ]);

      if (r.status === 'absent') {
        sendServantAbsenceNotificationPg(servantId).catch(console.error);
      }
    }
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// --------------------------------------------------------------------
// 8. Absence Alerts & Pastoral Care
// --------------------------------------------------------------------
let phase2SchemaEnsured = false;
export async function ensurePhase2SchemaPg(): Promise<void> {
  if (phase2SchemaEnsured) return;
  try {
    await queryPg(`
      ALTER TABLE absence_alerts
        ADD COLUMN IF NOT EXISTS academic_year_id text,
        ADD COLUMN IF NOT EXISTS alert_type text DEFAULT 'consecutive',
        ADD COLUMN IF NOT EXISTS risk_category text,
        ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS detection_reason text,
        ADD COLUMN IF NOT EXISTS attendance_trend text DEFAULT 'unknown',
        ADD COLUMN IF NOT EXISTS suggested_servant_id text,
        ADD COLUMN IF NOT EXISTS servant_workload_count integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_unassigned boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS resolved_reason text,
        ADD COLUMN IF NOT EXISTS resolved_by text,
        ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
        ADD COLUMN IF NOT EXISTS dismissed_reason text,
        ADD COLUMN IF NOT EXISTS dismissed_by text,
        ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

      ALTER TABLE followup_tasks
        ADD COLUMN IF NOT EXISTS academic_year_id text,
        ADD COLUMN IF NOT EXISTS family_id text,
        ADD COLUMN IF NOT EXISTS workflow_status text DEFAULT 'open',
        ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';

      ALTER TABLE meetings
        ADD COLUMN IF NOT EXISTS completed_by text,
        ADD COLUMN IF NOT EXISTS completed_at timestamptz,
        ADD COLUMN IF NOT EXISTS cancellation_reason text,
        ADD COLUMN IF NOT EXISTS stage text,
        ADD COLUMN IF NOT EXISTS lesson_teacher_id text;

      ALTER TABLE meeting_attendance
        ADD COLUMN IF NOT EXISTS family_id_at_time text,
        ADD COLUMN IF NOT EXISTS stage_at_time text,
        ADD COLUMN IF NOT EXISTS academic_year_id text;
    `);
    phase2SchemaEnsured = true;
  } catch (err) {
    // Non-fatal if already applied or restricted
  }
}

export async function getAbsenceAlertsPg(filters?: {
  familyId?: string;
  status?: string;
  academicYearId?: string;
  riskCategory?: string;
  priority?: string;
}): Promise<AbsenceAlert[]> {
  await ensurePhase2SchemaPg();
  let sql = `
    SELECT aa.*, 
           sm.full_name as member_name, 
           f.name as family_name, 
           s.full_name as assigned_servant_name,
           sugg_s.full_name as suggested_servant_name
    FROM absence_alerts aa
    JOIN served_members sm ON aa.member_id = sm.id
    JOIN families f ON aa.family_id = f.id
    LEFT JOIN servants s ON aa.assigned_servant_id = s.id
    LEFT JOIN servants sugg_s ON aa.suggested_servant_id = sugg_s.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (filters?.familyId) {
    params.push(filters.familyId);
    sql += ` AND aa.family_id = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND aa.status = $${params.length}`;
  }
  if (filters?.academicYearId) {
    params.push(filters.academicYearId);
    sql += ` AND aa.academic_year_id = $${params.length}`;
  }
  if (filters?.riskCategory) {
    params.push(filters.riskCategory);
    sql += ` AND aa.risk_category = $${params.length}`;
  }
  sql += ` ORDER BY aa.priority_score DESC, aa.consecutive_absences_count DESC, aa.created_at DESC`;
  const rows = await queryPg(sql, params);
  return rows.map(r => ({
    ...r,
    priority_score: typeof r.priority_score === 'number' ? r.priority_score : (parseInt(r.priority_score, 10) || 0),
    servant_workload_count: typeof r.servant_workload_count === 'number' ? r.servant_workload_count : (parseInt(r.servant_workload_count, 10) || 0),
    is_unassigned: Boolean(r.is_unassigned),
    last_attendance_date: r.last_attendance_date instanceof Date 
      ? r.last_attendance_date.toISOString().split('T')[0] 
      : (r.last_attendance_date ? String(r.last_attendance_date).split('T')[0] : 'غير محدد'),
  }));
}

export async function updateAbsenceAlertStatusPg(alertId: string, status: string): Promise<boolean> {
  await queryPg(`UPDATE absence_alerts SET status = $1 WHERE id = $2`, [status, alertId]);
  return true;
}

// --------------------------------------------------------------------
// 9. Notifications & Pastoral Care Broadcasts
// --------------------------------------------------------------------
export async function getNotificationsPg(userId?: string, familyId?: string): Promise<ChurchNotification[]> {
  let sql = `
    SELECT * FROM notifications
    WHERE target_type = 'all'
  `;
  const params: any[] = [];
  if (userId) {
    params.push(userId);
    sql += ` OR (target_type = 'user' AND target_id = $${params.length})`;
  }
  if (familyId) {
    params.push(familyId);
    sql += ` OR (target_type = 'family' AND target_id = $${params.length})`;
  }
  sql += ` ORDER BY created_at DESC LIMIT 50`;

  const rows = await queryPg(sql, params);
  return rows.map(r => ({
    ...r,
    is_read: Boolean(r.is_read),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

export async function createNotificationPg(data: {
  target_type?: 'all' | 'servants' | 'family' | 'user';
  target_id?: string;
  sender_id?: string;
  sender_name: string;
  sender_role: string;
  title: string;
  message: string;
  type?: 'priest_broadcast' | 'tuesday_prep' | 'servant_absence' | 'general';
}): Promise<ChurchNotification> {
  const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await queryPg(`
    INSERT INTO notifications (id, target_type, target_id, sender_id, sender_name, sender_role, title, message, type, is_read, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, now())
  `, [
    id,
    data.target_type || 'all',
    data.target_id || null,
    data.sender_id || null,
    data.sender_name,
    data.sender_role,
    data.title,
    data.message,
    data.type || 'general',
  ]);

  const row = await queryOnePg(`SELECT * FROM notifications WHERE id = $1`, [id]);
  return {
    ...row,
    is_read: Boolean(row.is_read),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function markNotificationAsReadPg(id: string): Promise<boolean> {
  await queryPg(`UPDATE notifications SET is_read = true WHERE id = $1`, [id]);
  return true;
}

export async function deleteNotificationPg(id: string): Promise<boolean> {
  await queryPg(`DELETE FROM notifications WHERE id = $1`, [id]);
  return true;
}

export async function sendTuesdayNotebookReminderPg(senderName: string = 'إدارة الأبلكيشن'): Promise<ChurchNotification> {
  // Server-side Deduplication: Ensure only ONE Tuesday reminder exists per week (last 5 days)
  const existing = await queryOnePg<ChurchNotification>(`
    SELECT * FROM notifications 
    WHERE type = 'tuesday_prep' AND created_at >= (now() - interval '5 days')
    ORDER BY created_at DESC 
    LIMIT 1
  `);
  if (existing) {
    return existing;
  }

  return createNotificationPg({
    target_type: 'all',
    sender_name: senderName,
    sender_role: 'admin',
    title: 'تذكير تحضير الكشكول 📓',
    message: 'برجاء التأكيد من التحضير وارسال الكشكول في الموعد المحدد.',
    type: 'tuesday_prep',
  });
}

export async function sendServantAbsenceNotificationPg(servantId: string): Promise<ChurchNotification | null> {
  const servant = await queryOnePg(`SELECT * FROM servants WHERE id = $1`, [servantId]);
  if (!servant) return null;

  const message = `سلام ونعمة أ/ ${servant.full_name}.. افتقدناك اليوم في خدمة مارجرجس بسندبيس، بنصلي تكون بكل خير ونفرح بوجودك الجمعة القادمة.`;
  const targetUserId = servant.user_id || servant.id;

  const notif = await createNotificationPg({
    target_type: 'user',
    target_id: targetUserId,
    sender_name: 'إدارة الخدمة',
    sender_role: 'admin',
    title: 'افتقدناك اليوم في الخدمة',
    message: message,
    type: 'servant_absence',
  });

  // Push to servant's phone screen even if closed
  if (targetUserId) {
    sendPushToUserPg(targetUserId, {
      title: '💌 افتقدناك اليوم — مارجرجس سندبيس',
      body: message,
      url: '/my-attendance',
      tag: 'servant-absence',
    }).catch(console.error);
  }

  return notif;
}

// --------------------------------------------------------------------
// 10. Weekly Reports (الكشاكيل)
// --------------------------------------------------------------------
export async function getWeeklyReportsPg(filters?: { familyId?: string; status?: string }): Promise<any[]> {
  let sql = `
    SELECT wr.*, f.name as family_name, f.color_code as family_color
    FROM weekly_reports wr
    JOIN families f ON wr.family_id = f.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (filters?.familyId) {
    params.push(filters.familyId);
    sql += ` AND wr.family_id = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND wr.status = $${params.length}`;
  }
  sql += ` ORDER BY wr.meeting_date DESC, wr.created_at DESC`;

  const rows = await queryPg(sql, params);
  return rows.map(r => ({
    ...r,
    meeting_date: r.meeting_date instanceof Date ? r.meeting_date.toISOString().split('T')[0] : String(r.meeting_date || '').split('T')[0],
  }));
}

export async function getWeeklyReportByIdPg(id: string): Promise<any | null> {
  const row = await queryOnePg(`
    SELECT wr.*, f.name as family_name, f.color_code as family_color
    FROM weekly_reports wr
    JOIN families f ON wr.family_id = f.id
    WHERE wr.id = $1
  `, [id]);
  if (!row) return null;
  return {
    ...row,
    meeting_date: row.meeting_date instanceof Date ? row.meeting_date.toISOString().split('T')[0] : String(row.meeting_date || '').split('T')[0],
  };
}

export async function updateWeeklyReportPg(id: string, data: any): Promise<any> {
  await queryPg(`
    UPDATE weekly_reports SET
      lesson_title = COALESCE($1, lesson_title),
      lesson_topic = COALESCE($2, lesson_topic),
      opening_paragraph_notes = COALESCE($3, opening_paragraph_notes),
      visual_aid_notes = COALESCE($4, visual_aid_notes),
      workshop_notes = COALESCE($5, workshop_notes),
      competition_notes = COALESCE($6, competition_notes),
      general_notes = COALESCE($7, general_notes),
      followup_requirements = COALESCE($8, followup_requirements),
      updated_at = now()
    WHERE id = $9
  `, [
    data.lesson_title ?? null,
    data.lesson_topic ?? null,
    data.opening_paragraph_notes ?? null,
    data.visual_aid_notes ?? null,
    data.workshop_notes ?? null,
    data.competition_notes ?? null,
    data.general_notes ?? null,
    data.followup_requirements ?? null,
    id,
  ]);
  return getWeeklyReportByIdPg(id);
}

export async function submitWeeklyReportPg(id: string, submitterName?: string): Promise<any> {
  await queryPg(`
    UPDATE weekly_reports SET
      status = 'submitted',
      submitted_at = now(),
      submitted_by = COALESCE($1, submitted_by, 'أمين الأسرة'),
      updated_at = now()
    WHERE id = $2
  `, [submitterName || null, id]);
  return getWeeklyReportByIdPg(id);
}

export async function reviewWeeklyReportPg(id: string, status: string, reviewNotes?: string, reviewerName?: string): Promise<any> {
  await queryPg(`
    UPDATE weekly_reports SET
      status = $1,
      review_notes = COALESCE($2, review_notes),
      reviewed_by = COALESCE($3, reviewed_by, 'أمين الخدمة'),
      reviewed_at = now(),
      updated_at = now()
    WHERE id = $4
  `, [status, reviewNotes || null, reviewerName || null, id]);
  return getWeeklyReportByIdPg(id);
}

// --------------------------------------------------------------------
// 11. High-Performance Dashboard Aggregations (Multi-Role Real-Time)
// --------------------------------------------------------------------
export async function getDashboardDataPg(role: string = 'admin', familyId?: string, servantId?: string) {
  const [fCount, sCount, mCount, mtgCount] = await Promise.all([
    queryOnePg<{ c: string }>(`SELECT COUNT(*) as c FROM families`),
    queryOnePg<{ c: string }>(`SELECT COUNT(*) as c FROM servants WHERE is_active = true`),
    queryOnePg<{ c: string }>(`SELECT COUNT(*) as c FROM served_members WHERE is_active = true`),
    queryOnePg<{ c: string }>(`SELECT COUNT(*) as c FROM meetings`),
  ]);

  const reports = await queryOnePg<{
    submitted: string;
    awaiting: string;
    approved: string;
    returned: string;
  }>(`
    SELECT
      COUNT(CASE WHEN status IN ('submitted', 'under_review', 'approved') THEN 1 END) as submitted,
      COUNT(CASE WHEN status IN ('submitted', 'under_review') THEN 1 END) as awaiting,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'returned_for_corrections' THEN 1 END) as returned
    FROM weekly_reports
  `);

  const attAgg = await queryOnePg<{
    present: string;
    absent: string;
    excused: string;
  }>(`
    SELECT
      COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
      COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
      COUNT(CASE WHEN status = 'excused' THEN 1 END) as excused
    FROM meeting_attendance
  `);

  const present = Number(attAgg?.present || 0);
  const absent = Number(attAgg?.absent || 0);
  const excused = Number(attAgg?.excused || 0);
  const totalAtt = present + absent + excused;
  const attendanceRate = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 0;

  const familyStats = await queryPg(`
    SELECT f.id, f.name, f.type, f.color_code,
           (SELECT COUNT(*) FROM served_members WHERE current_family_id = f.id AND is_active = true) as members_count,
           (SELECT COUNT(*) FROM family_servants WHERE family_id = f.id) as servants_count,
           (SELECT COUNT(*) FROM weekly_reports WHERE family_id = f.id AND status = 'approved') as approved_reports,
           (SELECT COUNT(*) FROM absence_alerts WHERE family_id = f.id AND status = 'pending_followup') as open_alerts,
           (SELECT COUNT(*) FROM meetings WHERE family_id = f.id AND status = 'completed') as completed_meetings
    FROM families f
    ORDER BY f.id ASC
  `);

  // Urgent high-risk pastoral cases for Priest and Admin
  const urgentCases = await queryPg(`
    SELECT a.id, a.member_id, a.family_id, a.consecutive_absences_count, a.risk_category, a.priority_score, a.priority_tier, a.detection_reason, a.created_at,
           m.full_name as member_name, m.code as member_code, m.stage as member_stage, m.phone as member_phone, m.guardian_name, m.guardian_phone,
           f.name as family_name,
           s.full_name as assigned_servant_name, s.phone as assigned_servant_phone
    FROM absence_alerts a
    JOIN served_members m ON a.member_id = m.id
    LEFT JOIN families f ON a.family_id = f.id
    LEFT JOIN servants s ON a.assigned_servant_id = s.id
    WHERE a.status = 'pending_followup'
    ORDER BY a.priority_score DESC, a.consecutive_absences_count DESC
    LIMIT 10
  `);

  const pendingRequests = await queryOnePg<{ c: string }>(`
    SELECT COUNT(*) as c FROM join_requests WHERE status = 'pending'
  `);

  const alertsCount = await queryOnePg<{ c: string }>(`
    SELECT COUNT(*) as c FROM absence_alerts WHERE status = 'pending_followup'
  `);

  // Pending reports for Secretary/Priest
  const pendingReports = await queryPg(`
    SELECT wr.*, f.name as family_name, wr.submitted_by as submitted_by_name
    FROM weekly_reports wr
    JOIN families f ON wr.family_id = f.id
    WHERE wr.status IN ('submitted', 'under_review')
    ORDER BY wr.submitted_at DESC NULLS LAST
  `);

  // Notebook followup per family for Secretary
  const notebookFollowup = await queryPg(`
    SELECT f.id as family_id, f.name as family_name, f.type,
           u.full_name as leader_name,
           (SELECT COUNT(*) FROM meetings m WHERE m.family_id = f.id) as meetings_count,
           (SELECT COUNT(*) FROM weekly_reports wr WHERE wr.family_id = f.id AND wr.status = 'approved') as approved_count,
           (SELECT COUNT(*) FROM weekly_reports wr WHERE wr.family_id = f.id AND wr.status IN ('submitted', 'under_review')) as pending_count,
           (SELECT COUNT(*) FROM weekly_reports wr WHERE wr.family_id = f.id AND wr.status = 'returned_for_corrections') as returned_count,
           (SELECT COUNT(*) FROM weekly_reports wr WHERE wr.family_id = f.id AND wr.status = 'draft') as draft_count,
           (SELECT meeting_date FROM weekly_reports wr WHERE wr.family_id = f.id ORDER BY wr.meeting_date DESC LIMIT 1) as last_report_date
    FROM families f
    LEFT JOIN users u ON f.leader_id = u.id
    ORDER BY f.id ASC
  `);

  // For family_leader specific queries:
  let famData = null;
  let latestMeeting = null;
  let famMeetingsCount = 0;
  let famReports: any[] = [];
  let famAlerts: any[] = [];
  let famServantsCount = 0;
  let famMembersCount = 0;

  if (role === 'family_leader') {
    const targetFamilyId = familyId || (familyStats[0]?.id as string) || 'fam-prep-boys';
    famData = await getFamilyByIdPg(targetFamilyId);
    const mRows = await queryPg(`SELECT * FROM meetings WHERE family_id = $1 ORDER BY date DESC LIMIT 1`, [targetFamilyId]);
    latestMeeting = mRows[0] || null;
    const mCountRow = await queryOnePg<{ c: string }>(`SELECT COUNT(*) as c FROM meetings WHERE family_id = $1`, [targetFamilyId]);
    famMeetingsCount = Number(mCountRow?.c || 0);
    const sCountRow = await queryOnePg<{ c: string }>(`SELECT COUNT(*) as c FROM family_servants WHERE family_id = $1`, [targetFamilyId]);
    famServantsCount = Number(sCountRow?.c || 0);
    const memCountRow = await queryOnePg<{ c: string }>(`SELECT COUNT(*) as c FROM served_members WHERE current_family_id = $1 AND is_active = true`, [targetFamilyId]);
    famMembersCount = Number(memCountRow?.c || 0);
    famReports = await queryPg(`SELECT * FROM weekly_reports WHERE family_id = $1 ORDER BY meeting_date DESC LIMIT 10`, [targetFamilyId]);
    famAlerts = await queryPg(`SELECT * FROM absence_alerts WHERE family_id = $1 AND status = 'pending_followup'`, [targetFamilyId]);
  }

  // For servant specific queries:
  let assignedMembers: any[] = [];
  let pendingTasks: any[] = [];
  if (role === 'servant' && servantId) {
    assignedMembers = await queryPg(`SELECT * FROM served_members WHERE assigned_servant_id = $1 AND is_active = true`, [servantId]);
    pendingTasks = await queryPg(`SELECT * FROM followup_tasks WHERE assigned_to = $1 AND is_completed = false`, [servantId]);
  }

  const formattedFamilyStats = familyStats.map(f => ({
    ...f,
    members_count: Number(f.members_count || 0),
    servants_count: Number(f.servants_count || 0),
    approved_reports: Number(f.approved_reports || 0),
    open_alerts: Number(f.open_alerts || 0),
    completed_meetings: Number(f.completed_meetings || 0),
  }));

  return {
    // Top-level stats for PriestDashboard, AdminDashboard, SecretaryDashboard
    servantsCount: role === 'family_leader' ? famServantsCount : Number(sCount?.c || 0),
    membersCount: role === 'family_leader' ? famMembersCount : Number(mCount?.c || 0),
    familiesCount: Number(fCount?.c || 10),
    totalMeetings: Number(mtgCount?.c || 520),
    submittedReports: Number(reports?.submitted || 0),
    awaitingReview: Number(reports?.awaiting || 0),
    returnedReports: Number(reports?.returned || 0),
    approvedReports: Number(reports?.approved || 0),
    alertsCount: Number(alertsCount?.c || 0),
    attendanceRate,
    presentCount: present,
    absentCount: absent,
    excusedCount: excused,
    familyStats: formattedFamilyStats,
    urgentPastoralCases: urgentCases.map(c => ({
      ...c,
      consecutive_absences_count: Number(c.consecutive_absences_count || 0),
      priority_score: Number(c.priority_score || 0),
      created_at: c.created_at instanceof Date ? c.created_at.toISOString().split('T')[0] : String(c.created_at || '').split('T')[0],
    })),
    pendingReports: pendingReports.map(r => ({
      ...r,
      meeting_date: r.meeting_date instanceof Date ? r.meeting_date.toISOString().split('T')[0] : String(r.meeting_date || '').split('T')[0],
    })),
    notebookFollowup,
    recentLogs: [],

    // Family leader specific
    family: famData,
    latestMeeting: latestMeeting ? {
      ...latestMeeting,
      date: latestMeeting.date instanceof Date ? latestMeeting.date.toISOString().split('T')[0] : String(latestMeeting.date || '').split('T')[0],
    } : null,
    meetingsCount: famMeetingsCount,
    reports: famReports,
    alerts: famAlerts,

    // Servant specific
    assignedMembers,
    pendingTasks,

    // Nested compatibility structures
    overview: {
      familiesCount: Number(fCount?.c || 10),
      servantsCount: Number(sCount?.c || 0),
      membersCount: Number(mCount?.c || 0),
      totalMeetings: Number(mtgCount?.c || 520),
      attendanceRate,
      pendingRequestsCount: Number(pendingRequests?.c || 0),
    },
    notebookStats: {
      totalFamilies: Number(fCount?.c || 10),
      submittedReports: Number(reports?.submitted || 0),
      awaitingReview: Number(reports?.awaiting || 0),
      approvedReports: Number(reports?.approved || 0),
      returnedReports: Number(reports?.returned || 0),
      completionRate: Number(reports?.submitted || 0) > 0 ? 100 : 0,
    },
    attendanceStats: {
      totalRecorded: totalAtt,
      present,
      absent,
      excused,
      rate: attendanceRate,
    },
    familyBreakdown: formattedFamilyStats,
    recentAlerts: [],
    recentActivities: [],
  };
}

// --------------------------------------------------------------------
// 12. Followup Tasks Management
// --------------------------------------------------------------------
export async function getFollowupTasksPg(servantId?: string): Promise<any[]> {
  let sql = `
    SELECT ft.*, sm.full_name as member_name, sm.phone as member_phone,
           sm.guardian_name, sm.guardian_phone
    FROM followup_tasks ft
    LEFT JOIN served_members sm ON ft.member_id = sm.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (servantId) {
    params.push(servantId);
    sql += ` AND ft.servant_id = $${params.length}`;
  }
  sql += ` ORDER BY ft.created_at DESC`;
  return queryPg(sql, params);
}

export async function completeFollowupTaskPg(
  taskId: string,
  result: string,
  notes?: string,
  actorName?: string
): Promise<boolean> {
  await queryPg(`
    UPDATE followup_tasks SET
      is_completed = true,
      completed_at = now(),
      outcome = $1,
      notes = COALESCE($2, notes),
      updated_at = now()
    WHERE id = $3
  `, [result, notes || null, taskId]);
  return true;
}

// ====================================================================
// 13. Audit Logging (سجل العمليات الرعوية والإدارية)
// ====================================================================
export async function logAuditActionPg(
  actor: { id?: string; name?: string; role?: string },
  action: string,
  recordType: string,
  recordId: string,
  description: string,
  previousValue?: any,
  newValue?: any,
  ipAddress?: string
): Promise<void> {
  try {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await queryPg(`
      INSERT INTO audit_logs (id, user_id, user_name, user_role, action, record_type, record_id, description, previous_value, new_value, ip_address, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
    `, [
      id,
      actor.id || null,
      actor.name || 'مستخدم المنظومة',
      actor.role || 'admin',
      action,
      recordType,
      recordId,
      description,
      previousValue ? JSON.stringify(previousValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      ipAddress || null,
    ]);
  } catch (err) {
    console.error('Failed to write to audit_logs:', err);
  }
}

// ====================================================================
// 14. Academic Years Management (إدارة الأعوام الكنسية)
// ====================================================================
export async function getAcademicYearsPg(): Promise<AcademicYear[]> {
  const rows = await queryPg(`
    SELECT * FROM academic_years ORDER BY start_date DESC
  `);
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    start_date: r.start_date instanceof Date ? r.start_date.toISOString().split('T')[0] : String(r.start_date).split('T')[0],
    end_date: r.end_date instanceof Date ? r.end_date.toISOString().split('T')[0] : String(r.end_date).split('T')[0],
    is_active: Boolean(r.is_active),
    is_archived: Boolean(r.is_archived),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  }));
}

export async function getActiveAcademicYearPg(): Promise<AcademicYear | null> {
  const years = await getAcademicYearsPg();
  return years.find(y => y.is_active) || years[0] || null;
}

export async function createAcademicYearPg(
  name: string,
  startDate: string,
  endDate: string,
  actor?: { id: string; name: string; role: string }
): Promise<AcademicYear> {
  const cleanName = name.trim();
  const id = `ay-${cleanName.replace(/[^0-9]/g, '-')}`;
  await queryPg(`
    INSERT INTO academic_years (id, name, start_date, end_date, is_active, is_archived, created_at, updated_at)
    VALUES ($1, $2, $3, $4, false, false, now(), now())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      updated_at = now()
  `, [id, cleanName, startDate, endDate]);

  if (actor) {
    await logAuditActionPg(actor, 'CREATE_ACADEMIC_YEAR', 'academic_years', id, `إنشاء عام كنسي جديد: ${cleanName}`);
  }

  const all = await getAcademicYearsPg();
  return all.find(y => y.id === id)!;
}

export async function activateAcademicYearPg(
  yearId: string,
  actor?: { id: string; name: string; role: string }
): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Ensure only one active academic year
    await client.query(`UPDATE academic_years SET is_active = false, updated_at = now()`);
    await client.query(`UPDATE academic_years SET is_active = true, is_archived = false, updated_at = now() WHERE id = $1`, [yearId]);
    await client.query(`UPDATE system_settings SET active_academic_year_id = $1, updated_at = now() WHERE id = 'default'`, [yearId]);
    await client.query('COMMIT');

    if (actor) {
      await logAuditActionPg(actor, 'ACTIVATE_ACADEMIC_YEAR', 'academic_years', yearId, `تفعيل العام الكنسي النشط: ${yearId}`);
    }
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ====================================================================
// 15. Promotion Rules Matrix (قواعد انتقال المراحل الدراسية)
// ====================================================================
export async function getPromotionRulesPg(): Promise<PromotionRule[]> {
  const sql = `
    SELECT pr.*, 
           f1.name as from_family_name,
           f2.name as to_family_name
    FROM promotion_rules pr
    LEFT JOIN families f1 ON pr.from_family_id = f1.id
    LEFT JOIN families f2 ON pr.to_family_id = f2.id
    ORDER BY pr.order_index ASC, pr.from_family_id ASC
  `;
  const rows = await queryPg(sql);
  return rows.map((r: any) => ({
    id: r.id,
    from_family_id: r.from_family_id,
    from_family_name: r.from_family_name || r.from_family_id,
    from_stage: r.from_stage,
    to_family_id: r.to_family_id || null,
    to_family_name: r.to_family_name || (r.is_graduation ? 'خريج خدمة' : null),
    to_stage: r.to_stage || null,
    is_graduation: Boolean(r.is_graduation),
    order_index: Number(r.order_index || 0),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    updated_at: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
  }));
}

export async function savePromotionRulePg(
  rule: Partial<PromotionRule>,
  actor?: { id: string; name: string; role: string }
): Promise<PromotionRule> {
  const id = rule.id || `rule-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await queryPg(`
    INSERT INTO promotion_rules (id, from_family_id, from_stage, to_family_id, to_stage, is_graduation, order_index, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, now())
    ON CONFLICT (id) DO UPDATE SET
      from_family_id = EXCLUDED.from_family_id,
      from_stage = EXCLUDED.from_stage,
      to_family_id = EXCLUDED.to_family_id,
      to_stage = EXCLUDED.to_stage,
      is_graduation = EXCLUDED.is_graduation,
      order_index = EXCLUDED.order_index,
      updated_at = now()
  `, [
    id,
    rule.from_family_id!,
    rule.from_stage!,
    rule.to_family_id || null,
    rule.to_stage || null,
    Boolean(rule.is_graduation),
    rule.order_index || 0,
  ]);

  if (actor) {
    await logAuditActionPg(actor, 'SAVE_PROMOTION_RULE', 'promotion_rules', id, `تعديل قاعدة ترحيل: من ${rule.from_stage} إلى ${rule.to_stage || 'تخرج'}`);
  }

  const all = await getPromotionRulesPg();
  return all.find(r => r.id === id)!;
}

export async function deletePromotionRulePg(
  id: string,
  actor?: { id: string; name: string; role: string }
): Promise<boolean> {
  await queryPg(`DELETE FROM promotion_rules WHERE id = $1`, [id]);
  if (actor) {
    await logAuditActionPg(actor, 'DELETE_PROMOTION_RULE', 'promotion_rules', id, `حذف قاعدة الترحيل رقم: ${id}`);
  }
  return true;
}

// ====================================================================
// 16. Annual Promotion Engine (معالج الترحيل السنوي للمخدومين)
// ====================================================================
export async function getAnnualPromotionPreviewPg(
  fromYearId: string,
  toYearId: string
): Promise<AnnualPromotionPreview> {
  const years = await getAcademicYearsPg();
  const fromYear = years.find(y => y.id === fromYearId);
  const toYear = years.find(y => y.id === toYearId);
  if (!fromYear || !toYear) throw new Error('العام الكنسي المحدد غير صالح');

  // Check if promotion was already executed
  const existingLog = await queryOnePg(`
    SELECT * FROM annual_promotion_logs 
    WHERE from_academic_year_id = $1 AND to_academic_year_id = $2 AND status = 'completed'
  `, [fromYearId, toYearId]);

  const rules = await getPromotionRulesPg();
  const members = await getServedMembersPg();
  const families = await getFamiliesPg();
  const servants = await getServantsPg();

  // Find servants assigned in the target year (or current baseline)
  const targetServantAssignments = await getServantAcademicAssignmentsPg(toYearId);

  // Group members into prefix counts to simulate next sequential codes
  const nextSeqPerPrefix: Record<string, number> = {};

  const items: PromotionPreviewItem[] = [];
  let promotedCount = 0;
  let graduatedCount = 0;
  let retainedCount = 0;
  let exceptionsCount = 0;

  for (const m of members) {
    const curFamObj = families.find(f => f.id === m.current_family_id);
    const curServant = servants.find(s => s.id === m.assigned_servant_id);

    // Find matching rule
    const matchedRule = rules.find(r => 
      r.from_family_id === m.current_family_id && 
      r.from_stage.trim() === (m.stage || '').trim()
    );

    if (!matchedRule) {
      exceptionsCount++;
      items.push({
        member_id: m.id,
        full_name: m.full_name,
        current_code: m.code,
        current_family_id: m.current_family_id,
        current_family_name: curFamObj?.name || m.current_family_id,
        current_stage: m.stage || 'عام',
        current_servant_id: m.assigned_servant_id,
        current_servant_name: curServant?.full_name,
        target_family_id: null,
        target_family_name: null,
        target_stage: null,
        target_code: m.code,
        status: 'exception_needed',
        exception_reason: 'لا توجد قاعدة انتقال محددة لهذه المرحلة بالفصل',
      });
      continue;
    }

    if (matchedRule.is_graduation) {
      graduatedCount++;
      items.push({
        member_id: m.id,
        full_name: m.full_name,
        current_code: m.code,
        current_family_id: m.current_family_id,
        current_family_name: curFamObj?.name || m.current_family_id,
        current_stage: m.stage || 'عام',
        current_servant_id: m.assigned_servant_id,
        current_servant_name: curServant?.full_name,
        target_family_id: matchedRule.to_family_id || null,
        target_family_name: 'خريج الخدمة',
        target_stage: matchedRule.to_stage || 'خريج',
        target_code: m.code,
        status: 'graduate',
      });
      continue;
    }

    // Promoted
    promotedCount++;
    const targetFamObj = families.find(f => f.id === matchedRule.to_family_id);
    const famLetter = getFamilyCodeLetter(matchedRule.to_family_id, targetFamObj?.name);
    const stageLetter = getStageCodeLetter(matchedRule.to_stage);
    const prefix = `${famLetter}${stageLetter}`;

    if (!nextSeqPerPrefix[prefix]) {
      nextSeqPerPrefix[prefix] = 1;
    } else {
      nextSeqPerPrefix[prefix]++;
    }
    const seqStr = String(nextSeqPerPrefix[prefix]).padStart(2, '0');
    const targetCode = `${prefix}${seqStr}`;

    // Target servant in new year
    const targetServantAssignment = targetServantAssignments.find(sa => 
      sa.family_id === matchedRule.to_family_id && sa.stage === matchedRule.to_stage
    );
    const targetServantObj = servants.find(s => s.id === targetServantAssignment?.servant_id);

    items.push({
      member_id: m.id,
      full_name: m.full_name,
      current_code: m.code,
      current_family_id: m.current_family_id,
      current_family_name: curFamObj?.name || m.current_family_id,
      current_stage: m.stage || 'عام',
      current_servant_id: m.assigned_servant_id,
      current_servant_name: curServant?.full_name,
      target_family_id: matchedRule.to_family_id,
      target_family_name: targetFamObj?.name || matchedRule.to_family_id,
      target_stage: matchedRule.to_stage,
      target_code: targetCode,
      target_servant_id: targetServantObj?.id || null,
      target_servant_name: targetServantObj?.full_name || null,
      status: 'promote',
    });
  }

  return {
    fromYear,
    toYear,
    alreadyPromoted: Boolean(existingLog),
    totalMembers: members.length,
    promotedCount,
    graduatedCount,
    retainedCount,
    exceptionsCount,
    items,
  };
}

export async function executeAnnualPromotionPg(
  fromYearId: string,
  toYearId: string,
  customizedDecisions: Record<string, {
    family_id?: string;
    stage?: string;
    servant_id?: string;
    action?: 'promote' | 'retain' | 'graduate' | 'stop' | 'transfer';
    notes?: string;
  }> = {},
  actor: { id: string; name: string; role: string }
): Promise<AnnualPromotionLog> {
  const pool = getPgPool()!;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if duplicate promotion was already run
    const existingLog = (await client.query(`
      SELECT * FROM annual_promotion_logs 
      WHERE from_academic_year_id = $1 AND to_academic_year_id = $2 AND status = 'completed'
    `, [fromYearId, toYearId])).rows[0];

    if (existingLog) {
      throw new Error(`تم تنفيذ الترحيل من العام (${fromYearId}) إلى (${toYearId}) مسبقاً ولا يجوز تكراره`);
    }

    // 2. Fetch current active members & snapshot
    const members = (await client.query(`SELECT * FROM served_members WHERE is_active = true ORDER BY code ASC`)).rows;
    const rules = (await client.query(`SELECT * FROM promotion_rules ORDER BY order_index ASC`)).rows;
    const families = (await client.query(`SELECT id, name FROM families`)).rows;

    const snapshotData = {
      timestamp: new Date().toISOString(),
      from_academic_year_id: fromYearId,
      to_academic_year_id: toYearId,
      members_snapshot: members,
    };

    let promotedCount = 0;
    let graduatedCount = 0;
    let retainedCount = 0;
    let exceptionsCount = 0;

    // Track sequential numbers for target codes
    const nextSeqPerPrefix: Record<string, number> = {};

    // Pre-pass: Temporarily neutralize member codes to prevent unique constraint collision
    // when a promoted member's new code equals another member's old code before they are promoted.
    await client.query(`
      UPDATE served_members SET code = '__TMP_PROMO_' || id WHERE is_active = true
    `);

    for (const m of members) {
      const decision = customizedDecisions[m.id];
      const matchedRule = rules.find((r: any) => 
        r.from_family_id === m.current_family_id && 
        r.from_stage.trim() === (m.stage || '').trim()
      );

      let targetFamId = m.current_family_id;
      let targetStage = m.stage;
      let targetServantId = m.assigned_servant_id;
      let targetCode = m.code;
      let finalStatus: 'promoted' | 'retained' | 'graduated' | 'transferred' | 'stopped' = 'promoted';
      let isActive = true;

      if (decision) {
        if (decision.action === 'retain') {
          finalStatus = 'retained';
          retainedCount++;
          targetFamId = m.current_family_id;
          targetStage = m.stage;
        } else if (decision.action === 'graduate') {
          finalStatus = 'graduated';
          graduatedCount++;
          targetStage = decision.stage || 'خريج';
          targetFamId = decision.family_id || m.current_family_id;
        } else if (decision.action === 'stop') {
          finalStatus = 'stopped';
          exceptionsCount++;
          isActive = false;
        } else if (decision.action === 'transfer' || decision.action === 'promote') {
          finalStatus = decision.action === 'transfer' ? 'transferred' : 'promoted';
          promotedCount++;
          targetFamId = decision.family_id || m.current_family_id;
          targetStage = decision.stage || m.stage;
          targetServantId = decision.servant_id || null;
        }
      } else if (matchedRule) {
        if (matchedRule.is_graduation) {
          finalStatus = 'graduated';
          graduatedCount++;
          targetStage = matchedRule.to_stage || 'خريج';
          targetFamId = matchedRule.to_family_id || m.current_family_id;
        } else {
          finalStatus = 'promoted';
          promotedCount++;
          targetFamId = matchedRule.to_family_id;
          targetStage = matchedRule.to_stage;
        }
      } else {
        // Fallback: Retained with exception
        finalStatus = 'retained';
        exceptionsCount++;
      }

      // Compute new structured code for target family + stage if promoted or transferred
      if (finalStatus === 'promoted' || finalStatus === 'transferred') {
        const famObj = families.find((f: any) => f.id === targetFamId);
        const famLetter = getFamilyCodeLetter(targetFamId, famObj?.name);
        const stageLetter = getStageCodeLetter(targetStage);
        const prefix = `${famLetter}${stageLetter}`;

        if (!nextSeqPerPrefix[prefix]) {
          nextSeqPerPrefix[prefix] = 1;
        } else {
          nextSeqPerPrefix[prefix]++;
        }
        const seqStr = String(nextSeqPerPrefix[prefix]).padStart(2, '0');
        targetCode = `${prefix}${seqStr}`;
      } else if (finalStatus === 'graduated') {
        targetCode = `${m.code}-GRAD`;
      } else if (finalStatus === 'stopped') {
        targetCode = `${m.code}-STOP`;
      }

      // 1. Lock baseline archive in member_academic_history for fromYearId
      const fromHistId = `mah-${m.id}-${fromYearId}`;
      await client.query(`
        INSERT INTO member_academic_history (id, member_id, academic_year_id, family_id, stage, servant_id, code, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (member_id, academic_year_id) DO UPDATE SET
          family_id = EXCLUDED.family_id,
          stage = EXCLUDED.stage,
          servant_id = EXCLUDED.servant_id,
          code = EXCLUDED.code,
          status = EXCLUDED.status
      `, [fromHistId, m.id, fromYearId, m.current_family_id, m.stage, m.assigned_servant_id, m.code, finalStatus, decision?.notes || null]);

      // 2. Update served_members with new target values
      await client.query(`
        UPDATE served_members SET
          current_family_id = $1,
          stage = $2,
          code = $3,
          assigned_servant_id = $4,
          is_active = $5,
          updated_at = now()
        WHERE id = $6
      `, [targetFamId, targetStage, targetCode, targetServantId, isActive, m.id]);

      // 3. Insert new year active baseline in member_academic_history for toYearId
      const toHistId = `mah-${m.id}-${toYearId}`;
      await client.query(`
        INSERT INTO member_academic_history (id, member_id, academic_year_id, family_id, stage, servant_id, code, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        ON CONFLICT (member_id, academic_year_id) DO UPDATE SET
          family_id = EXCLUDED.family_id,
          stage = EXCLUDED.stage,
          servant_id = EXCLUDED.servant_id,
          code = EXCLUDED.code,
          status = 'active'
      `, [toHistId, m.id, toYearId, targetFamId, targetStage, targetServantId, targetCode]);

      // 4. Log event in member_history
      const eventId = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await client.query(`
        INSERT INTO member_history (id, member_id, event_type, from_value, to_value, description, academic_year_id, created_by, created_at)
        VALUES ($1, $2, 'promotion', $3, $4, $5, $6, $7, now())
      `, [
        eventId,
        m.id,
        `${m.current_family_id} - ${m.stage} (${m.code})`,
        `${targetFamId} - ${targetStage} (${targetCode})`,
        `ترحيل سنوي إلى العام الكنسي الجديد: ${finalStatus}`,
        toYearId,
        actor.name || actor.id,
      ]);
    }

    // 5. Create annual_promotion_logs entry
    const opId = `prom-${fromYearId}-${toYearId}`;
    await client.query(`
      INSERT INTO annual_promotion_logs (
        id, from_academic_year_id, to_academic_year_id, total_eligible,
        promoted_count, graduated_count, retained_count, exceptions_count,
        executed_by, executed_by_name, executed_at, status, snapshot_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), 'completed', $11)
      ON CONFLICT (from_academic_year_id, to_academic_year_id) DO UPDATE SET
        total_eligible = EXCLUDED.total_eligible,
        promoted_count = EXCLUDED.promoted_count,
        graduated_count = EXCLUDED.graduated_count,
        retained_count = EXCLUDED.retained_count,
        exceptions_count = EXCLUDED.exceptions_count,
        status = 'completed',
        executed_at = now()
    `, [
      opId,
      fromYearId,
      toYearId,
      members.length,
      promotedCount,
      graduatedCount,
      retainedCount,
      exceptionsCount,
      actor.id,
      actor.name,
      JSON.stringify(snapshotData),
    ]);

    // 6. Activate target academic year
    await client.query(`UPDATE academic_years SET is_active = false, updated_at = now()`);
    await client.query(`UPDATE academic_years SET is_active = true, is_archived = false, updated_at = now() WHERE id = $1`, [toYearId]);
    await client.query(`UPDATE system_settings SET active_academic_year_id = $1, updated_at = now() WHERE id = 'default'`, [toYearId]);

    await client.query('COMMIT');

    // 7. Log in audit_logs
    await logAuditActionPg(actor, 'EXECUTE_ANNUAL_PROMOTION', 'annual_promotion_logs', opId, 
      `اعتماد الترحيل السنوي بنجاح من (${fromYearId}) إلى (${toYearId}): ترحيل ${promotedCount} مخدوماً، تخرج ${graduatedCount}، استبقاء ${retainedCount}`
    );

    const logRow = (await queryPg(`SELECT * FROM annual_promotion_logs WHERE id = $1`, [opId]))[0];
    return {
      id: logRow.id,
      from_academic_year_id: logRow.from_academic_year_id,
      to_academic_year_id: logRow.to_academic_year_id,
      total_eligible: Number(logRow.total_eligible),
      promoted_count: Number(logRow.promoted_count),
      graduated_count: Number(logRow.graduated_count),
      retained_count: Number(logRow.retained_count),
      exceptions_count: Number(logRow.exceptions_count),
      executed_by: logRow.executed_by,
      executed_by_name: logRow.executed_by_name,
      executed_at: logRow.executed_at instanceof Date ? logRow.executed_at.toISOString() : String(logRow.executed_at),
      status: logRow.status,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('executeAnnualPromotionPg rolled back:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function rollbackAnnualPromotionPg(
  operationId: string,
  actor: { id: string; name: string; role: string }
): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const op = (await client.query(`SELECT * FROM annual_promotion_logs WHERE id = $1`, [operationId])).rows[0];
    if (!op) throw new Error('عملية الترحيل المحددة غير موجودة');
    if (op.status === 'rolled_back') throw new Error('تم التراجع عن هذه العملية مسبقاً');

    const snapshot = typeof op.snapshot_data === 'string' ? JSON.parse(op.snapshot_data) : op.snapshot_data;
    if (!snapshot || !Array.isArray(snapshot.members_snapshot)) {
      throw new Error('بيانات النسخة الاحتياطية للعملية غير متوفرة للتراجع الآمن');
    }

    // Pre-pass for rollback: neutralize codes to prevent collision during restoration
    const restoredMemberIds = snapshot.members_snapshot.map((m: any) => m.id);
    if (restoredMemberIds.length > 0) {
      await client.query(`
        UPDATE served_members SET code = '__TMP_ROLLBACK_' || id
        WHERE id = ANY($1::text[])
      `, [restoredMemberIds]);
    }

    // Restore each member to previous snapshot state
    for (const prev of snapshot.members_snapshot) {
      await client.query(`
        UPDATE served_members SET
          current_family_id = $1,
          stage = $2,
          code = $3,
          assigned_servant_id = $4,
          is_active = $5,
          updated_at = now()
        WHERE id = $6
      `, [prev.current_family_id, prev.stage, prev.code, prev.assigned_servant_id, prev.is_active, prev.id]);
    }

    // Remove the target year baseline records ONLY for the restored snapshot members
    // Ensuring any new members registered post-promotion in the target year remain completely untouched
    if (restoredMemberIds.length > 0) {
      await client.query(`
        DELETE FROM member_academic_history 
        WHERE academic_year_id = $1 AND member_id = ANY($2::text[])
      `, [op.to_academic_year_id, restoredMemberIds]);
    }

    // Restore active status for previous year in member_academic_history
    await client.query(`
      UPDATE member_academic_history SET status = 'active' WHERE academic_year_id = $1
    `, [op.from_academic_year_id]);

    // Re-activate from_academic_year_id
    await client.query(`UPDATE academic_years SET is_active = false, updated_at = now()`);
    await client.query(`UPDATE academic_years SET is_active = true, updated_at = now() WHERE id = $1`, [op.from_academic_year_id]);
    await client.query(`UPDATE system_settings SET active_academic_year_id = $1, updated_at = now() WHERE id = 'default'`, [op.from_academic_year_id]);

    // Mark log as rolled back
    await client.query(`
      UPDATE annual_promotion_logs SET status = 'rolled_back' WHERE id = $1
    `, [operationId]);

    await client.query('COMMIT');

    await logAuditActionPg(actor, 'ROLLBACK_ANNUAL_PROMOTION', 'annual_promotion_logs', operationId, 
      `التراجع الآمن عن الترحيل السنوي (${op.from_academic_year_id} -> ${op.to_academic_year_id}) واستعادة بيانات المخدومين بالكامل`
    );

    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('rollbackAnnualPromotionPg rolled back:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function getAnnualPromotionLogsPg(): Promise<AnnualPromotionLog[]> {
  const sql = `
    SELECT apl.*,
           y1.name as from_academic_year_name,
           y2.name as to_academic_year_name
    FROM annual_promotion_logs apl
    LEFT JOIN academic_years y1 ON apl.from_academic_year_id = y1.id
    LEFT JOIN academic_years y2 ON apl.to_academic_year_id = y2.id
    ORDER BY apl.executed_at DESC
  `;
  const rows = await queryPg(sql);
  return rows.map((r: any) => ({
    id: r.id,
    from_academic_year_id: r.from_academic_year_id,
    from_academic_year_name: r.from_academic_year_name || r.from_academic_year_id,
    to_academic_year_id: r.to_academic_year_id,
    to_academic_year_name: r.to_academic_year_name || r.to_academic_year_id,
    total_eligible: Number(r.total_eligible),
    promoted_count: Number(r.promoted_count),
    graduated_count: Number(r.graduated_count),
    retained_count: Number(r.retained_count),
    exceptions_count: Number(r.exceptions_count),
    executed_by: r.executed_by,
    executed_by_name: r.executed_by_name,
    executed_at: r.executed_at instanceof Date ? r.executed_at.toISOString() : String(r.executed_at),
    status: r.status,
  }));
}

// ====================================================================
// 17. Annual Servant Assignment Engine (التوزيع السنوي للخدام)
// ====================================================================
export async function getServantAcademicAssignmentsPg(
  academicYearId: string
): Promise<ServantAcademicAssignment[]> {
  const sql = `
    SELECT saa.*,
           s.full_name as servant_name,
           s.phone as servant_phone,
           f.name as family_name
    FROM servant_academic_assignments saa
    JOIN servants s ON saa.servant_id = s.id
    JOIN families f ON saa.family_id = f.id
    WHERE saa.academic_year_id = $1
    ORDER BY f.name ASC, saa.stage ASC, s.full_name ASC
  `;
  const rows = await queryPg(sql, [academicYearId]);
  return rows.map((r: any) => ({
    id: r.id,
    servant_id: r.servant_id,
    servant_name: r.servant_name,
    servant_phone: r.servant_phone,
    academic_year_id: r.academic_year_id,
    family_id: r.family_id,
    family_name: r.family_name,
    stage: r.stage || null,
    role_in_family: r.role_in_family || 'خادم',
    is_active: Boolean(r.is_active),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

export async function saveServantAcademicAssignmentsPg(
  academicYearId: string,
  assignments: Array<{
    servant_id: string;
    family_id: string;
    stage?: string | null;
    role_in_family?: string;
  }>,
  actor: { id: string; name: string; role: string }
): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Remove current assignments for this academic year
    await client.query(`DELETE FROM servant_academic_assignments WHERE academic_year_id = $1`, [academicYearId]);

    // Insert new assignments
    for (const a of assignments) {
      const id = `saa-${a.servant_id}-${academicYearId}-${a.family_id}-${a.stage || 'gen'}`;
      await client.query(`
        INSERT INTO servant_academic_assignments (id, servant_id, academic_year_id, family_id, stage, role_in_family, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (servant_id, academic_year_id, family_id, stage) DO UPDATE SET
          role_in_family = EXCLUDED.role_in_family,
          is_active = true
      `, [id, a.servant_id, academicYearId, a.family_id, a.stage || null, a.role_in_family || 'خادم']);

      // Also sync active state into servants and users if this is the active academic year
      const isCurYearActive = (await client.query(`SELECT is_active FROM academic_years WHERE id = $1`, [academicYearId])).rows[0]?.is_active;
      if (isCurYearActive) {
        await client.query(`UPDATE servants SET assigned_stage = $1 WHERE id = $2`, [a.stage || null, a.servant_id]);
        await client.query(`
          UPDATE users SET assigned_family_id = $1, assigned_stage = $2 
          WHERE id IN (SELECT user_id FROM servants WHERE id = $3) OR phone IN (SELECT phone FROM servants WHERE id = $3)
        `, [a.family_id, a.stage || null, a.servant_id]);

        // Keep family_servants table synced
        const fsId = `fs-${a.family_id}-${a.servant_id}`;
        await client.query(`
          INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family, stage, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, true)
          ON CONFLICT (id) DO UPDATE SET
            role_in_family = EXCLUDED.role_in_family,
            stage = EXCLUDED.stage,
            is_active = true
        `, [fsId, a.family_id, a.servant_id, academicYearId, a.role_in_family || 'خادم', a.stage || null]);
      }
    }

    await client.query('COMMIT');

    await logAuditActionPg(actor, 'SAVE_SERVANT_ASSIGNMENTS', 'servant_academic_assignments', academicYearId,
      `حفظ وتحديث التوزيعة السنوية للخدام للعام الكنسي (${academicYearId}): ${assignments.length} تعييناً`
    );

    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('saveServantAcademicAssignmentsPg rolled back:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function copyPreviousYearServantAssignmentsPg(
  fromYearId: string,
  toYearId: string,
  actor: { id: string; name: string; role: string }
): Promise<{ copiedCount: number }> {
  const pool = getPgPool()!;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const previousAssignments = (await client.query(`
      SELECT * FROM servant_academic_assignments WHERE academic_year_id = $1
    `, [fromYearId])).rows;

    if (previousAssignments.length === 0) {
      throw new Error(`لا توجد توزيعة مسجلة في العام الكنسي السابق (${fromYearId}) للنسخ منها`);
    }

    let copiedCount = 0;
    for (const a of previousAssignments) {
      const newId = `saa-${a.servant_id}-${toYearId}-${a.family_id}-${a.stage || 'gen'}`;
      await client.query(`
        INSERT INTO servant_academic_assignments (id, servant_id, academic_year_id, family_id, stage, role_in_family, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (servant_id, academic_year_id, family_id, stage) DO UPDATE SET
          role_in_family = EXCLUDED.role_in_family,
          is_active = true
      `, [newId, a.servant_id, toYearId, a.family_id, a.stage || null, a.role_in_family || 'خادم']);
      copiedCount++;
    }

    await client.query('COMMIT');

    await logAuditActionPg(actor, 'COPY_SERVANT_ASSIGNMENTS', 'servant_academic_assignments', toYearId,
      `نسخ توزيعة الخدام من العام الكنسي (${fromYearId}) إلى (${toYearId}): ${copiedCount} خادماً`
    );

    return { copiedCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function compareServantAssignmentsPg(
  fromYearId: string,
  toYearId: string
): Promise<{
  retained: ServantAcademicAssignment[];
  moved: Array<{ servant_id: string; servant_name: string; from: string; to: string }>;
  newServants: ServantAcademicAssignment[];
  unassigned: ServantAcademicAssignment[];
  vacancies: Array<{ family_id: string; family_name: string; stage: string }>;
}> {
  const fromAssignments = await getServantAcademicAssignmentsPg(fromYearId);
  const toAssignments = await getServantAcademicAssignmentsPg(toYearId);
  const families = await getFamiliesPg();

  const retained: ServantAcademicAssignment[] = [];
  const moved: Array<{ servant_id: string; servant_name: string; from: string; to: string }> = [];
  const newServants: ServantAcademicAssignment[] = [];
  const unassigned: ServantAcademicAssignment[] = [];

  for (const toA of toAssignments) {
    const fromA = fromAssignments.find(fa => fa.servant_id === toA.servant_id);
    if (!fromA) {
      newServants.push(toA);
    } else if (fromA.family_id === toA.family_id && fromA.stage === toA.stage) {
      retained.push(toA);
    } else {
      moved.push({
        servant_id: toA.servant_id,
        servant_name: toA.servant_name || 'خادم',
        from: `${fromA.family_name} - ${fromA.stage || 'عام'}`,
        to: `${toA.family_name} - ${toA.stage || 'عام'}`,
      });
    }
  }

  for (const fromA of fromAssignments) {
    const stillAssigned = toAssignments.some(ta => ta.servant_id === fromA.servant_id);
    if (!stillAssigned) {
      unassigned.push(fromA);
    }
  }

  // Vacant stages in target year
  const vacancies: Array<{ family_id: string; family_name: string; stage: string }> = [];
  for (const fam of families) {
    const stages = getStagesForFamily(fam.id, fam.name, fam.stages);
    for (const st of stages) {
      const hasServant = toAssignments.some(ta => ta.family_id === fam.id && ta.stage === st);
      if (!hasServant) {
        vacancies.push({
          family_id: fam.id,
          family_name: fam.name,
          stage: st,
        });
      }
    }
  }

  return { retained, moved, newServants, unassigned, vacancies };
}

// ====================================================================
// 18. Historical Archive Profiles (الأرشيف التاريخي الدائم)
// ====================================================================
export async function getMemberHistoricalProfilePg(
  memberId: string
): Promise<{
  member: ServedMember | null;
  history: MemberAcademicHistory[];
  totalYearsCount: number;
}> {
  const member = (await getServedMembersPg()).find(m => m.id === memberId) || null;
  if (!member) return { member: null, history: [], totalYearsCount: 0 };

  const sql = `
    SELECT mah.*, 
           ay.name as academic_year_name,
           f.name as family_name,
           s.full_name as servant_name
    FROM member_academic_history mah
    JOIN academic_years ay ON mah.academic_year_id = ay.id
    JOIN families f ON mah.family_id = f.id
    LEFT JOIN servants s ON mah.servant_id = s.id
    WHERE mah.member_id = $1
    ORDER BY ay.start_date DESC
  `;
  const rows = await queryPg(sql, [memberId]);
  const history: MemberAcademicHistory[] = rows.map((r: any) => ({
    id: r.id,
    member_id: r.member_id,
    academic_year_id: r.academic_year_id,
    academic_year_name: r.academic_year_name,
    family_id: r.family_id,
    family_name: r.family_name,
    stage: r.stage || null,
    servant_id: r.servant_id || null,
    servant_name: r.servant_name || null,
    code: r.code,
    status: r.status,
    notes: r.notes || null,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));

  return {
    member,
    history,
    totalYearsCount: history.length,
  };
}

export async function getServantHistoricalProfilePg(
  servantId: string
): Promise<{
  servant: Servant | null;
  assignments: ServantAcademicAssignment[];
  totalYearsServed: number;
}> {
  const servant = (await getServantsPg()).find(s => s.id === servantId) || null;
  if (!servant) return { servant: null, assignments: [], totalYearsServed: 0 };

  const sql = `
    SELECT saa.*,
           ay.name as academic_year_name,
           f.name as family_name
    FROM servant_academic_assignments saa
    JOIN academic_years ay ON saa.academic_year_id = ay.id
    JOIN families f ON saa.family_id = f.id
    WHERE saa.servant_id = $1
    ORDER BY ay.start_date DESC
  `;
  const rows = await queryPg(sql, [servantId]);
  const assignments: ServantAcademicAssignment[] = rows.map((r: any) => ({
    id: r.id,
    servant_id: r.servant_id,
    servant_name: servant.full_name,
    servant_phone: servant.phone,
    academic_year_id: r.academic_year_id,
    family_id: r.family_id,
    family_name: r.family_name,
    stage: r.stage || null,
    role_in_family: r.role_in_family || 'خادم',
    is_active: Boolean(r.is_active),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));

  const distinctYears = new Set(assignments.map(a => a.academic_year_id)).size;

  return {
    servant,
    assignments,
    totalYearsServed: distinctYears,
  };
}

// ====================================================================
// 21. PHASE 2 — Smart Attendance & Pastoral Follow-up Backend Services
// ====================================================================

// --------------------------------------------------------------------
// A. Meeting Lifecycle Management (تأكيد الانعقاد والإلغاء)
// --------------------------------------------------------------------
export async function confirmMeetingCompletionPg(
  meetingId: string,
  servantId: string
): Promise<boolean> {
  const pool = getPgPool()!;
  const meeting = await queryOnePg(`SELECT id, status, title FROM meetings WHERE id = $1`, [meetingId]);
  if (!meeting) {
    throw new Error(`الاجتماع غير موجود: ${meetingId}`);
  }

  await queryPg(`
    UPDATE meetings SET
      status = 'completed',
      completed_by = $2,
      completed_at = now(),
      updated_at = now()
    WHERE id = $1
  `, [meetingId, servantId]);

  return true;
}

export async function cancelMeetingPg(
  meetingId: string,
  cancellationReason: string,
  actorId: string
): Promise<boolean> {
  const pool = getPgPool()!;
  const meeting = await queryOnePg(`SELECT id, status, title FROM meetings WHERE id = $1`, [meetingId]);
  if (!meeting) {
    throw new Error(`الاجتماع غير موجود: ${meetingId}`);
  }

  await queryPg(`
    UPDATE meetings SET
      status = 'cancelled',
      cancellation_reason = $2,
      updated_at = now()
    WHERE id = $1
  `, [meetingId, cancellationReason]);

  return true;
}

// --------------------------------------------------------------------
// B. Meeting Servant Roles (تعدد الخدام والمشاركين في الاجتماع الواحد)
// --------------------------------------------------------------------
export async function recordMeetingServantRolesPg(
  meetingId: string,
  roles: Array<{
    servant_id: string;
    role_type: MeetingServantRoleType;
    stage?: string;
    notes?: string;
  }>
): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM meeting_servant_roles WHERE meeting_id = $1`, [meetingId]);

    let lessonTeacherId: string | null = null;
    let idx = 0;
    for (const r of roles) {
      idx++;
      const id = `msr-${meetingId}-${r.servant_id}-${r.role_type}-${idx}`;
      await client.query(`
        INSERT INTO meeting_servant_roles (id, meeting_id, servant_id, role_type, stage, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, now())
      `, [id, meetingId, r.servant_id, r.role_type, r.stage || null, r.notes || null]);

      if (r.role_type === 'lesson_teacher' && !lessonTeacherId) {
        lessonTeacherId = r.servant_id;
      }
    }

    await client.query(`
      UPDATE meetings SET lesson_teacher_id = $2, updated_at = now() WHERE id = $1
    `, [meetingId, lessonTeacherId]);

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getMeetingServantRolesPg(meetingId: string): Promise<MeetingServantRole[]> {
  const sql = `
    SELECT msr.*, s.full_name as servant_name
    FROM meeting_servant_roles msr
    JOIN servants s ON msr.servant_id = s.id
    WHERE msr.meeting_id = $1
    ORDER BY msr.created_at ASC
  `;
  return queryPg(sql, [meetingId]);
}

// --------------------------------------------------------------------
// C. Independent Follow-up Contact Logs (Append-Only)
// --------------------------------------------------------------------
export async function addFollowupContactLogPg(
  taskId: string,
  entry: {
    servant_id: string;
    contact_date: string;
    contact_method: 'phone' | 'whatsapp' | 'home_visit' | 'church_talk' | 'other';
    outcome: string;
    notes?: string;
    next_followup_date?: string;
    is_correction?: boolean;
    correction_for_id?: string;
    correction_reason?: string;
    created_by: string;
  }
): Promise<FollowupContactLog> {
  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock task for update to safely handle concurrent attempts
    const taskRes = await client.query(`
      SELECT id, workflow_status, last_contact_date, next_followup_date
      FROM followup_tasks
      WHERE id = $1
      FOR UPDATE
    `, [taskId]);

    if (taskRes.rows.length === 0) {
      throw new Error(`حالة الافتقاد غير موجودة: ${taskId}`);
    }

    const currentTask = taskRes.rows[0];
    const logId = `fcl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Resolve valid servant_id if actor is an admin/priest without dedicated servant profile
    let effectiveServantId = entry.servant_id || currentTask.servant_id;
    const srvCheck = await client.query(`SELECT id FROM servants WHERE id = $1`, [effectiveServantId]);
    if (srvCheck.rows.length === 0) {
      effectiveServantId = currentTask.servant_id;
    }

    // 2. Insert append-only contact log
    await client.query(`
      INSERT INTO followup_contact_logs (
        id, task_id, servant_id, contact_date, contact_time, contact_method,
        outcome, notes, next_followup_date, is_correction, correction_for_id,
        correction_reason, created_at, created_by
      ) VALUES ($1, $2, $3, $4, now(), $5, $6, $7, $8, $9, $10, $11, now(), $12)
    `, [
      logId,
      taskId,
      effectiveServantId,
      entry.contact_date,
      entry.contact_method,
      entry.outcome,
      entry.notes || null,
      entry.next_followup_date || null,
      Boolean(entry.is_correction),
      entry.correction_for_id || null,
      entry.correction_reason || null,
      entry.created_by,
    ]);

    // 3. Transition task workflow to 'contact_attempted' if currently open or assigned
    const nextStatus = (currentTask.workflow_status === 'open' || currentTask.workflow_status === 'assigned')
      ? 'contact_attempted'
      : currentTask.workflow_status;

    await client.query(`
      UPDATE followup_tasks SET
        workflow_status = $2,
        last_contact_date = $3,
        next_followup_date = COALESCE($4, next_followup_date),
        updated_at = now()
      WHERE id = $1
    `, [
      taskId,
      nextStatus,
      entry.contact_date,
      entry.next_followup_date || null,
    ]);

    await client.query('COMMIT');

    return {
      id: logId,
      task_id: taskId,
      servant_id: entry.servant_id,
      contact_date: entry.contact_date,
      contact_method: entry.contact_method,
      outcome: entry.outcome,
      notes: entry.notes,
      next_followup_date: entry.next_followup_date,
      is_correction: Boolean(entry.is_correction),
      correction_for_id: entry.correction_for_id,
      correction_reason: entry.correction_reason,
      created_at: new Date().toISOString(),
      created_by: entry.created_by,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getFollowupContactLogsPg(taskId: string): Promise<FollowupContactLog[]> {
  const sql = `
    SELECT fcl.*, COALESCE(s.full_name, u.full_name, fcl.created_by) as servant_name
    FROM followup_contact_logs fcl
    LEFT JOIN servants s ON fcl.servant_id = s.id
    LEFT JOIN users u ON fcl.created_by = u.id
    WHERE fcl.task_id = $1
    ORDER BY fcl.contact_time ASC
  `;
  const rows = await queryPg(sql, [taskId]);
  return rows.map((r: any) => ({
    ...r,
    contact_date: r.contact_date instanceof Date ? r.contact_date.toISOString().split('T')[0] : String(r.contact_date).split('T')[0],
    next_followup_date: r.next_followup_date instanceof Date ? r.next_followup_date.toISOString().split('T')[0] : (r.next_followup_date ? String(r.next_followup_date).split('T')[0] : undefined),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

// --------------------------------------------------------------------
// D. Follow-up State Machine Transition (قواعد الانتقال الصارمة)
// --------------------------------------------------------------------
export async function transitionFollowupTaskStatusPg(
  taskId: string,
  newStatus: FollowupWorkflowStatus,
  actorId: string,
  options?: {
    assigned_to?: string;
    outcome?: string;
    next_followup_date?: string;
    closed_reason?: string;
    notes?: string;
  }
): Promise<boolean> {
  const pool = getPgPool()!;
  const task = await queryOnePg(`SELECT * FROM followup_tasks WHERE id = $1`, [taskId]);
  if (!task) {
    throw new Error(`حالة الافتقاد غير موجودة: ${taskId}`);
  }

  // 1. Validation rules per target state
  if (newStatus === 'assigned') {
    const servantId = options?.assigned_to || task.servant_id;
    if (!servantId) {
      throw new Error('لا يمكن إسناد حالة الافتقاد دون تحديد الخادم المسؤول.');
    }
  } else if (newStatus === 'contact_attempted') {
    const logsCountRes = await queryOnePg(
      `SELECT COUNT(*) as cnt FROM followup_contact_logs WHERE task_id = $1`,
      [taskId]
    );
    if (!logsCountRes || parseInt(logsCountRes.cnt, 10) === 0) {
      throw new Error('لا يمكن نقل الحالة إلى "تم التواصل" دون وجود سجل محاولة تواصل مسجل.');
    }
  } else if (newStatus === 'awaiting_followup') {
    const nextDate = options?.next_followup_date || task.next_followup_date;
    if (!nextDate) {
      throw new Error('لا يمكن نقل الحالة إلى "بانتظار المتابعة" دون تحديد تاريخ المتابعة القادم.');
    }
  } else if (newStatus === 'completed') {
    const outcome = options?.outcome || task.result;
    if (!outcome) {
      throw new Error('لا يمكن إكمال حالة الافتقاد دون توثيق النتيجة (outcome).');
    }
  } else if (newStatus === 'closed') {
    if (!options?.closed_reason) {
      throw new Error('لا يمكن إغلاق حالة الافتقاد دون تدوين سبب الإغلاق.');
    }
  }

  // 2. Perform safe update
  const isCompleted = (newStatus === 'completed' || newStatus === 'closed');
  await queryPg(`
    UPDATE followup_tasks SET
      workflow_status = $2,
      is_completed = $3,
      servant_id = COALESCE($4, servant_id),
      result = COALESCE($5, result),
      next_followup_date = COALESCE($6, next_followup_date),
      notes = COALESCE($7, notes),
      closed_reason = CASE WHEN $2 = 'closed' THEN $8 ELSE closed_reason END,
      closed_by = CASE WHEN $2 = 'closed' THEN $9 ELSE closed_by END,
      closed_at = CASE WHEN $2 = 'closed' THEN now() ELSE closed_at END,
      completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END,
      updated_at = now()
    WHERE id = $1
  `, [
    taskId,
    newStatus,
    isCompleted,
    options?.assigned_to || null,
    options?.outcome || null,
    options?.next_followup_date || null,
    options?.notes || null,
    options?.closed_reason || null,
    actorId,
  ]);

  return true;
}

// --------------------------------------------------------------------
// E. Intelligent Absence Engine (محرك احتساب الغياب على الاجتماعات المكتملة)
// --------------------------------------------------------------------
export async function runAbsenceAnalysisEnginePg(
  academicYearId: string,
  options?: {
    familyId?: string;
    stage?: string;
    thresholds?: Partial<AbsenceEngineThresholds>;
  }
): Promise<{
  analyzedMembersCount: number;
  newAlertsCreated: number;
  existingAlertsUpdated: number;
  summaryByCategory: Record<AbsenceRiskCategory, number>;
}> {
  await ensurePhase2SchemaPg();

  const thresholds: AbsenceEngineThresholds = {
    consecutiveAbsenceWarning: options?.thresholds?.consecutiveAbsenceWarning ?? 2,
    consecutiveAbsenceCritical: options?.thresholds?.consecutiveAbsenceCritical ?? 3,
    suddenDropThresholdPct: options?.thresholds?.suddenDropThresholdPct ?? 40,
    intermittentAbsencePct: options?.thresholds?.intermittentAbsencePct ?? 40,
    regularMemberMinAttendancePct: options?.thresholds?.regularMemberMinAttendancePct ?? 75,
    newMemberDaysThreshold: options?.thresholds?.newMemberDaysThreshold ?? 45,
    minimumCompletedMeetingsForPattern: options?.thresholds?.minimumCompletedMeetingsForPattern ?? 4,
  };

  const summaryByCategory: Record<AbsenceRiskCategory, number> = {
    consecutive: 0,
    sudden_drop: 0,
    intermittent: 0,
    stopped_regular: 0,
    no_history: 0,
    new_member: 0,
  };

  // 1. Fetch only meetings that actually took place and are marked 'completed'
  let meetingsSql = `
    SELECT id, family_id, date, title, academic_year_id
    FROM meetings
    WHERE status = 'completed' AND academic_year_id = $1 AND date <= CURRENT_DATE
  `;
  const mParams: any[] = [academicYearId];
  if (options?.familyId) {
    mParams.push(options.familyId);
    meetingsSql += ` AND family_id = $${mParams.length}`;
  }
  meetingsSql += ` ORDER BY date ASC`;

  const meetings = await queryPg(meetingsSql, mParams);
  if (meetings.length === 0) {
    return {
      analyzedMembersCount: 0,
      newAlertsCreated: 0,
      existingAlertsUpdated: 0,
      summaryByCategory,
    };
  }

  // 2. Fetch active served members
  let membersSql = `
    SELECT id, full_name, code, current_family_id, stage, assigned_servant_id, registration_date
    FROM served_members
    WHERE is_active = true AND stage NOT IN ('خريج', 'متوقف')
  `;
  const memParams: any[] = [];
  if (options?.familyId) {
    memParams.push(options.familyId);
    membersSql += ` AND current_family_id = $${memParams.length}`;
  }
  if (options?.stage) {
    memParams.push(options.stage);
    membersSql += ` AND stage = $${memParams.length}`;
  }
  const members = await queryPg(membersSql, memParams);

  // 3. Pre-query servant workload and family servant assignments
  const servantWorkloadMap = new Map<string, number>();
  const taskCounts = await queryPg(`
    SELECT servant_id, COUNT(*)::int as cnt
    FROM followup_tasks
    WHERE is_completed = false
    GROUP BY servant_id
  `);
  taskCounts.forEach((r: any) => servantWorkloadMap.set(r.servant_id, parseInt(r.cnt, 10) || 0));

  const familyServantsMap = new Map<string, Array<{ id: string; name: string }>>();
  const famServants = await queryPg(`
    SELECT fs.family_id, fs.servant_id, s.full_name
    FROM family_servants fs
    JOIN servants s ON fs.servant_id = s.id
    WHERE s.is_active = true
  `);
  famServants.forEach((r: any) => {
    const arr = familyServantsMap.get(r.family_id) || [];
    arr.push({ id: r.servant_id, name: r.full_name });
    familyServantsMap.set(r.family_id, arr);
  });

  const memberOpenTasksMap = new Map<string, number>();
  const memTaskCounts = await queryPg(`
    SELECT member_id, COUNT(*)::int as cnt
    FROM followup_tasks
    WHERE is_completed = false
    GROUP BY member_id
  `);
  memTaskCounts.forEach((r: any) => memberOpenTasksMap.set(r.member_id, parseInt(r.cnt, 10) || 0));

  const unresponsiveMembersSet = new Set<string>();
  try {
    const unrespRows = await queryPg(`
      SELECT DISTINCT ft.member_id
      FROM followup_contact_logs cl
      JOIN followup_tasks ft ON cl.task_id = ft.id
      WHERE cl.outcome IN ('no_answer', 'unresponsive')
    `);
    unrespRows.forEach((r: any) => unresponsiveMembersSet.add(r.member_id));
  } catch (e) {
    // Non-fatal if contact logs are empty
  }

  let newAlerts = 0;
  let updatedAlerts = 0;

  for (const member of members) {
    const memberMeetings = meetings.filter((m: any) => m.family_id === member.current_family_id);
    if (memberMeetings.length === 0) continue;

    const meetingIds = memberMeetings.map((m: any) => m.id);

    // Fetch attendance for these completed meetings
    const attSql = `
      SELECT meeting_id, status
      FROM meeting_attendance
      WHERE member_id = $1 AND meeting_id = ANY($2::text[])
    `;
    const attRows = await queryPg(attSql, [member.id, meetingIds]);
    const attMap = new Map<string, string>();
    attRows.forEach((r: any) => attMap.set(r.meeting_id, r.status));

    // Check total lifetime attendance records across entire system
    const lifetimeRes = await queryOnePg(`
      SELECT COUNT(*)::int as cnt FROM meeting_attendance WHERE member_id = $1
    `, [member.id]);
    const lifetimeAttendanceRecords = lifetimeRes ? parseInt(lifetimeRes.cnt, 10) : 0;

    const totalMeetings = memberMeetings.length;
    let attendedCount = 0;
    let lastAttendanceDate: string | null = null;

    // Scan all meetings to find total attended and most recent attendance date
    for (let i = totalMeetings - 1; i >= 0; i--) {
      const m = memberMeetings[i];
      const status = attMap.get(m.id);
      if (status === 'present' || status === 'late') {
        if (!lastAttendanceDate) {
          lastAttendanceDate = m.date instanceof Date ? m.date.toISOString().split('T')[0] : String(m.date).split('T')[0];
        }
        attendedCount++;
      }
    }

    // Calculate consecutive absences from newest meeting backwards
    let consecutiveAbsences = 0;
    for (let i = totalMeetings - 1; i >= 0; i--) {
      const m = memberMeetings[i];
      const status = attMap.get(m.id);
      if (status === 'present' || status === 'late') {
        break;
      } else {
        consecutiveAbsences++;
      }
    }

    // Days since registration
    let daysSinceReg = 999;
    if (member.registration_date) {
      const regDate = new Date(member.registration_date);
      if (!isNaN(regDate.getTime())) {
        daysSinceReg = Math.floor((Date.now() - regDate.getTime()) / 86400000);
      }
    }

    // Historical vs Recent Split (for sudden drop / stopped regular)
    let priorRate = 0;
    let recentRate = 0;
    if (totalMeetings >= thresholds.minimumCompletedMeetingsForPattern) {
      const recentCount = Math.min(3, Math.max(2, Math.floor(totalMeetings / 2)));
      const priorMeetings = memberMeetings.slice(0, totalMeetings - recentCount);
      const recentMeetings = memberMeetings.slice(totalMeetings - recentCount);

      const priorAttended = priorMeetings.filter((m: any) => {
        const s = attMap.get(m.id);
        return s === 'present' || s === 'late';
      }).length;
      priorRate = priorMeetings.length > 0 ? (priorAttended / priorMeetings.length) : 0;

      const recentAttended = recentMeetings.filter((m: any) => {
        const s = attMap.get(m.id);
        return s === 'present' || s === 'late';
      }).length;
      recentRate = recentMeetings.length > 0 ? (recentAttended / recentMeetings.length) : 0;
    }

    // Determine Risk Category & Pattern
    let riskCategory: AbsenceRiskCategory | null = null;
    let alertType: AbsenceAlertType | null = null;
    let categoryReason = '';
    let suggestedAction = '';

    // Pattern 6: New Member needing welcome/orientation follow-up
    if (daysSinceReg <= thresholds.newMemberDaysThreshold && attendedCount <= 1) {
      riskCategory = 'new_member';
      alertType = 'never_attended';
      categoryReason = `مخدوم جديد مسجل منذ ${daysSinceReg} يوماً (حضور ${attendedCount} من أصل ${totalMeetings} اجتماعات)`;
      suggestedAction = 'اتصال ترحيبي من خادم الفصل لتعريفه بأنشطة الكنيسة وتثبيته في الخدمة';
    }
    // Pattern 5: No History (distinct from unexcused absence)
    else if (totalMeetings >= 2 && lifetimeAttendanceRecords === 0) {
      riskCategory = 'no_history';
      alertType = 'never_attended';
      categoryReason = 'مخدوم مسجل بدون أي سجلات حضور أو غياب سابقة بالمنظومة (انعدام تام لسجل الحضور)';
      suggestedAction = 'التواصل مع المخدوم لتأكيد قيده والتحقق من انتظامه بفصول التربية الكنسية';
    }
    // Pattern 4: Stopped Regular (was >= 75% regular, missed last 2+ meetings)
    else if (
      totalMeetings >= thresholds.minimumCompletedMeetingsForPattern &&
      priorRate >= (thresholds.regularMemberMinAttendancePct / 100) &&
      consecutiveAbsences >= 2
    ) {
      riskCategory = 'stopped_regular';
      alertType = 'sudden_drop';
      categoryReason = `انقطاع مفاجئ لمخدوم كان منتظماً بنسبة ${Math.round(priorRate * 100)}% (غياب متتالٍ عن آخر ${consecutiveAbsences} اجتماعات)`;
      suggestedAction = 'افتقاد نوعي عاجل بزيارة منزلية أو اتصال من أمين الأسرة لمعرفة سبب التوقف المفاجئ';
    }
    // Pattern 2: Sudden Drop (sharp decline from baseline)
    else if (
      totalMeetings >= thresholds.minimumCompletedMeetingsForPattern &&
      priorRate >= 0.60 &&
      recentRate <= 0.25 &&
      (priorRate - recentRate) >= (thresholds.suddenDropThresholdPct / 100)
    ) {
      riskCategory = 'sudden_drop';
      alertType = 'sudden_drop';
      categoryReason = `تدهور حاد في الحضور من ${Math.round(priorRate * 100)}% سابقاً إلى ${Math.round(recentRate * 100)}% مؤخراً`;
      suggestedAction = 'متابعة مكثفة عبر اتصال هاتفي أو جلسة كنسية لفهم الظروف ومساندة المخدوم';
    }
    // Pattern 1: Consecutive Absences
    else if (consecutiveAbsences >= thresholds.consecutiveAbsenceWarning) {
      riskCategory = 'consecutive';
      alertType = 'consecutive';
      if (consecutiveAbsences >= thresholds.consecutiveAbsenceCritical) {
        categoryReason = `غياب متتالٍ لمدة ${consecutiveAbsences} أسابيع أو أكثر عن الاجتماعات المكتملة`;
        suggestedAction = 'افتقاد فوري بزيارة منزلية أو مكالمة عاجلة من الخادم المسؤول';
      } else {
        categoryReason = `غياب أسبوعين متتاليين عن الاجتماعات المكتملة`;
        suggestedAction = 'تنبيه مبكر للمتابعة الهاتفية للاطمئنان على المخدوم';
      }
    }
    // Pattern 3: Intermittent Absences
    else if (
      totalMeetings >= thresholds.minimumCompletedMeetingsForPattern &&
      ((totalMeetings - attendedCount) / totalMeetings) >= (thresholds.intermittentAbsencePct / 100)
    ) {
      riskCategory = 'intermittent';
      alertType = 'chronic';
      categoryReason = `غياب متقطع وغير منتظم (تغيب عن ${totalMeetings - attendedCount} من أصل ${totalMeetings} اجتماعات)`;
      suggestedAction = 'متابعة أسبوعية دورية وتشجيع المخدوم على الانتظام الدائم في الكنيسة';
    }

    if (!riskCategory || !alertType) continue;

    // Specific adjustment for no_history:
    // A member with zero attendance records must NOT receive consecutive absence or duration points,
    // as lack of records does not prove unexcused absence.
    if (riskCategory === 'no_history') {
      consecutiveAbsences = 0;
      lastAttendanceDate = null;
    }

    summaryByCategory[riskCategory]++;

    // Transparent & Explainable Priority Score (0-100)
    let priorityScore = 0;
    const scoreFactors: string[] = [];

    // Factor 1: Consecutive absences (applicable only when consecutive absences are confirmed)
    if (riskCategory !== 'no_history') {
      if (consecutiveAbsences >= 3) {
        priorityScore += 40;
        scoreFactors.push(`غياب متتالٍ ${consecutiveAbsences} أسابيع (+40)`);
      } else if (consecutiveAbsences === 2) {
        priorityScore += 25;
        scoreFactors.push(`غياب متتالٍ أسبوعين (+25)`);
      } else if (consecutiveAbsences === 1) {
        priorityScore += 10;
        scoreFactors.push(`غياب الأسبوع الأخير (+10)`);
      }
    }

    // Factor 2: Risk category severity
    if (riskCategory === 'stopped_regular') {
      priorityScore += 30;
      scoreFactors.push('انقطاع مخدوم كان منتظماً (+30)');
    } else if (riskCategory === 'sudden_drop') {
      priorityScore += 25;
      scoreFactors.push('هبوط حاد في معدل الحضور (+25)');
    } else if (riskCategory === 'no_history') {
      priorityScore += 20;
      scoreFactors.push('انعدام تام لسجل الحضور (+20)');
    } else if (riskCategory === 'intermittent') {
      priorityScore += 15;
      scoreFactors.push('غياب متكرر ومتقطع (+15)');
    } else if (riskCategory === 'new_member') {
      priorityScore += 15;
      scoreFactors.push('مخدوم جديد يحتاج تثبيت (+15)');
    }

    // Factor 3: Days since last attendance (applicable only when historical records exist)
    if (riskCategory !== 'no_history') {
      if (lastAttendanceDate) {
        const daysSince = Math.floor((Date.now() - new Date(lastAttendanceDate).getTime()) / 86400000);
        if (daysSince >= 42) {
          priorityScore += 25;
          scoreFactors.push(`مرور ${daysSince} يوماً على آخر حضور (+25)`);
        } else if (daysSince >= 21) {
          priorityScore += 15;
          scoreFactors.push(`مرور ${daysSince} يوماً على آخر حضور (+15)`);
        }
      } else if (riskCategory !== 'new_member') {
        priorityScore += 15;
        scoreFactors.push('لم يسجل أي حضور بالسنة الكنسية (+15)');
      }
    }

    // Factor 4: Previous unresolved follow-up tasks
    const openTasksForMember = memberOpenTasksMap.get(member.id) || 0;
    if (openTasksForMember > 0) {
      priorityScore += 10;
      scoreFactors.push('وجود مهام افتقاد معلقة سابقة (+10)');
    }

    // Factor 5: Unresponsive contact attempt
    if (unresponsiveMembersSet.has(member.id)) {
      priorityScore += 15;
      scoreFactors.push('محاولة تواصل سابقة بدون رد (+15)');
    }

    // Cap score at 100
    priorityScore = Math.min(100, Math.max(0, priorityScore));

    let priorityTier: FollowupPriority = 'low';
    if (priorityScore >= 75) priorityTier = 'urgent';
    else if (priorityScore >= 50) priorityTier = 'high';
    else if (priorityScore >= 25) priorityTier = 'normal';

    // Attendance Trend
    let attendanceTrend: AttendanceTrend = 'unknown';
    if (totalMeetings < 2 || riskCategory === 'no_history') {
      attendanceTrend = 'unknown';
    } else if (consecutiveAbsences >= 3 || riskCategory === 'stopped_regular') {
      attendanceTrend = 'critical';
    } else if (riskCategory === 'sudden_drop' || consecutiveAbsences === 2) {
      attendanceTrend = 'declining';
    } else if (recentRate > priorRate + 0.20) {
      attendanceTrend = 'improving';
    } else {
      attendanceTrend = 'stable';
    }

    // Workload-Aware Servant Suggestion
    const isUnassigned = !member.assigned_servant_id;
    let suggestedServantId: string | null = member.assigned_servant_id || null;
    let servantWorkloadCount = 0;

    if (!isUnassigned && member.assigned_servant_id) {
      servantWorkloadCount = servantWorkloadMap.get(member.assigned_servant_id) || 0;
    } else {
      const familyServants = familyServantsMap.get(member.current_family_id) || [];
      if (familyServants.length > 0) {
        const sorted = [...familyServants].sort((a, b) => {
          const loadA = servantWorkloadMap.get(a.id) || 0;
          const loadB = servantWorkloadMap.get(b.id) || 0;
          return loadA - loadB;
        });
        suggestedServantId = sorted[0].id;
        servantWorkloadCount = servantWorkloadMap.get(sorted[0].id) || 0;
      }
    }

    const detectionReason = `${categoryReason} | تقييم الأولوية (${priorityScore}/100): ${scoreFactors.join('، ')}`;

    // Idempotent Upsert into absence_alerts
    const existing = await queryOnePg(`
      SELECT id, consecutive_absences_count FROM absence_alerts
      WHERE member_id = $1 AND academic_year_id = $2
        AND status NOT IN ('resolved', 'dismissed')
    `, [member.id, academicYearId]);

    let alertId: string;
    if (existing) {
      alertId = existing.id;
      await queryPg(`
        UPDATE absence_alerts SET
          consecutive_absences_count = $2,
          last_attendance_date = $3,
          alert_type = $4,
          risk_category = $5,
          priority_score = $6,
          detection_reason = $7,
          attendance_trend = $8,
          suggested_action = $9,
          suggested_servant_id = $10,
          servant_workload_count = $11,
          is_unassigned = $12
        WHERE id = $1
      `, [
        existing.id,
        consecutiveAbsences,
        lastAttendanceDate,
        alertType,
        riskCategory,
        priorityScore,
        detectionReason,
        attendanceTrend,
        suggestedAction,
        suggestedServantId,
        servantWorkloadCount,
        isUnassigned,
      ]);
      updatedAlerts++;
    } else {
      alertId = `alt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await queryPg(`
        INSERT INTO absence_alerts (
          id, member_id, family_id, academic_year_id, assigned_servant_id,
          consecutive_absences_count, last_attendance_date, status, alert_type,
          risk_category, priority_score, detection_reason, attendance_trend,
          suggested_action, suggested_servant_id, servant_workload_count,
          is_unassigned, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_followup', $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
      `, [
        alertId,
        member.id,
        member.current_family_id,
        academicYearId,
        member.assigned_servant_id || null,
        consecutiveAbsences,
        lastAttendanceDate,
        alertType,
        riskCategory,
        priorityScore,
        detectionReason,
        attendanceTrend,
        suggestedAction,
        suggestedServantId,
        servantWorkloadCount,
        isUnassigned,
      ]);
      newAlerts++;

      // Create followup task if none open for this member
      const existingTask = await queryOnePg(`
        SELECT id, priority FROM followup_tasks
        WHERE member_id = $1 AND is_completed = false
      `, [member.id]);

      if (!existingTask) {
        const taskId = `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const taskType =
          riskCategory === 'new_member'
            ? 'in_church_chat'
            : (riskCategory === 'stopped_regular' || consecutiveAbsences >= 3)
            ? 'home_visit'
            : 'phone_call';

        await queryPg(`
          INSERT INTO followup_tasks (
            id, alert_id, academic_year_id, family_id, member_id, servant_id,
            task_type, notes, workflow_status, priority, is_completed, due_date, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, false, CURRENT_DATE + 7, now())
        `, [
          taskId,
          alertId,
          academicYearId,
          member.current_family_id,
          member.id,
          member.assigned_servant_id || suggestedServantId || 'srv-admin',
          taskType,
          detectionReason,
          priorityTier,
        ]);

        const assignedToId = member.assigned_servant_id || suggestedServantId;
        if (assignedToId) {
          servantWorkloadMap.set(assignedToId, (servantWorkloadMap.get(assignedToId) || 0) + 1);
        }
      }
    }
  }

  return {
    analyzedMembersCount: members.length,
    newAlertsCreated: newAlerts,
    existingAlertsUpdated: updatedAlerts,
    summaryByCategory,
  };
}

// --------------------------------------------------------------------
// F. Historical Attendance Retrieval (بناءً على سياق وقت الاجتماع)
// --------------------------------------------------------------------
export async function getHistoricalAttendancePg(options: {
  academicYearId: string;
  familyId?: string;
  stage?: string;
  memberId?: string;
  meetingId?: string;
}): Promise<any[]> {
  let sql = `
    SELECT 
      ma.id,
      ma.meeting_id,
      m.date as meeting_date,
      m.title as meeting_title,
      COALESCE(ma.academic_year_id, m.academic_year_id) as academic_year_id,
      ay.name as academic_year_name,
      ma.member_id,
      sm.full_name as member_name,
      sm.code as member_code,
      COALESCE(ma.family_id_at_time, m.family_id) as family_id_at_time,
      f.name as family_name_at_time,
      COALESCE(ma.stage_at_time, sm.stage) as stage_at_time,
      ma.status,
      ma.attended_liturgy,
      ma.attended_communion,
      ma.attended_class,
      ma.attended_confession,
      ma.excuse_reason,
      ma.recorded_by,
      ma.recorded_at
    FROM meeting_attendance ma
    JOIN meetings m ON ma.meeting_id = m.id
    LEFT JOIN academic_years ay ON COALESCE(ma.academic_year_id, m.academic_year_id) = ay.id
    JOIN served_members sm ON ma.member_id = sm.id
    LEFT JOIN families f ON COALESCE(ma.family_id_at_time, m.family_id) = f.id
    WHERE (ma.academic_year_id = $1 OR m.academic_year_id = $1)
  `;
  const params: any[] = [options.academicYearId];

  if (options.familyId) {
    params.push(options.familyId);
    sql += ` AND (ma.family_id_at_time = $${params.length} OR m.family_id = $${params.length})`;
  }
  if (options.stage) {
    params.push(options.stage);
    sql += ` AND (ma.stage_at_time = $${params.length} OR sm.stage = $${params.length})`;
  }
  if (options.memberId) {
    params.push(options.memberId);
    sql += ` AND ma.member_id = $${params.length}`;
  }
  if (options.meetingId) {
    params.push(options.meetingId);
    sql += ` AND ma.meeting_id = $${params.length}`;
  }

  sql += ` ORDER BY m.date DESC, sm.full_name ASC`;
  return queryPg(sql, params);
}

