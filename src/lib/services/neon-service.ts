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
  ChurchNotification,
} from '@/types/organa';

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
  confession_father?: string;
  password?: string;
}): Promise<ChurchUser> {
  const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const rawPass = data.password ? data.password.trim() : 'George-O229';
  const passwordHash = await hashPassword(rawPass);

  await queryPg(`
    INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, confession_father, password_hash, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
  `, [
    id,
    data.email?.trim() || `${data.phone}@organa.eg`,
    data.full_name.trim(),
    data.phone.trim(),
    data.role,
    data.assigned_family_id || null,
    data.confession_father?.trim() || null,
    passwordHash,
  ]);

  return (await getUserByIdPg(id))!;
}

export async function updateUserPg(id: string, updates: Partial<ChurchUser>): Promise<ChurchUser> {
  await queryPg(`
    UPDATE users
    SET full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        email = COALESCE($3, email),
        role = COALESCE($4, role),
        assigned_family_id = CASE WHEN $5::text = '__CLEAR__' THEN NULL WHEN $5::text IS NOT NULL THEN $5 ELSE assigned_family_id END,
        confession_father = COALESCE($6, confession_father),
        is_active = COALESCE($7, is_active),
        updated_at = now()
    WHERE id = $8
  `, [
    updates.full_name ?? null,
    updates.phone ?? null,
    updates.email ?? null,
    updates.role ?? null,
    updates.assigned_family_id === null ? '__CLEAR__' : (updates.assigned_family_id ?? null),
    updates.confession_father ?? null,
    updates.is_active !== undefined ? updates.is_active : null,
    id,
  ]);
  return (await getUserByIdPg(id))!;
}

export async function deleteUserPg(id: string): Promise<boolean> {
  const user = await getUserByIdPg(id);
  if (!user) return false;
  if (user.id === 'usr-admin' || user.phone === '01202074649') {
    throw new Error('لا يمكن حذف حساب إدارة المنظومة الأساسي.');
  }

  await queryPg(`DELETE FROM servants WHERE user_id = $1 OR phone = $2`, [id, user.phone]);
  await queryPg(`DELETE FROM users WHERE id = $1`, [id]);
  return true;
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
      id, full_name, phone, email, password_hash, requested_role, requested_family_id,
      confession_father, national_id, job_or_study, address, birth_date, notes, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
  `, [
    id,
    data.fullName.trim(),
    data.phone.trim(),
    data.email?.trim() || null,
    passwordHash,
    data.requestedRole,
    data.requestedFamilyId || null,
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

  createNotificationPg({
    target_type: 'all',
    sender_name: 'بوابة الانضمام للخدمة',
    sender_role: 'admin',
    title: 'طلب انضمام جديد للخدمة 📋',
    message: notifMsg,
    type: 'general',
  }).catch(console.error);

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
            confession_father = COALESCE($4, confession_father),
            password_hash = COALESCE($5, password_hash),
            is_active = true,
            updated_at = now()
        WHERE id = $6
      `, [
        req.full_name,
        req.requested_role,
        req.requested_family_id || null,
        req.confession_father || null,
        finalPassHash,
        userId,
      ]);
    } else {
      userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await client.query(`
        INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, confession_father, password_hash, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      `, [
        userId,
        req.email || `${req.phone}@organa.eg`,
        req.full_name,
        req.phone,
        req.requested_role,
        req.requested_family_id || null,
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
          INSERT INTO servants (id, user_id, full_name, phone, national_id, confession_father, job_or_study, joining_date, is_active, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, true, $8)
        `, [
          servantId,
          userId,
          req.full_name,
          req.phone,
          req.national_id || null,
          req.confession_father || null,
          req.job_or_study || null,
          req.notes || null,
        ]);
      } else {
        await client.query(`
          UPDATE servants
          SET user_id = $1,
              full_name = $2,
              confession_father = COALESCE($3, confession_father),
              is_active = true,
              updated_at = now()
          WHERE id = $4
        `, [userId, req.full_name, req.confession_father || null, servantId]);
      }

      // Link family in `family_servants`
      if (req.requested_family_id && servantId) {
        const fsId = `fs-${req.requested_family_id}-${servantId}`;
        await client.query(`
          INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family)
          VALUES ($1, $2, $3, 'ay-2026-2027', $4)
          ON CONFLICT (id) DO UPDATE SET role_in_family = EXCLUDED.role_in_family
        `, [fsId, req.requested_family_id, servantId, req.requested_role === 'family_leader' ? 'أمين أسرة' : 'خادم']);

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
  return row ? { ...row, leader_name: row.leader_name || null, leader_phone: row.leader_phone || null } : null;
}

export async function updateFamilyPg(
  id: string,
  data: Partial<Family> & { leader_id?: string }
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
      updated_at = now()
    WHERE id = $9
  `, [
    data.name || null,
    data.type || null,
    data.color_code || null,
    data.description || null,
    data.meeting_day || null,
    data.meeting_time || null,
    data.location || null,
    data.leader_id || null,
    id,
  ]);

  return getFamilyByIdPg(id);
}

// --------------------------------------------------------------------
// 5. Servants Management
// --------------------------------------------------------------------
export async function getServantsPg(familyId?: string): Promise<Servant[]> {
  let sql = `
    SELECT s.*, fs.family_id, fs.role_in_family, f.name as family_name
    FROM servants s
    LEFT JOIN family_servants fs ON s.id = fs.servant_id
    LEFT JOIN families f ON fs.family_id = f.id
  `;
  const params: any[] = [];
  if (familyId) {
    sql += ` WHERE fs.family_id = $1`;
    params.push(familyId);
  }
  sql += ` ORDER BY s.full_name ASC`;

  const rows = await queryPg(sql, params);
  return rows.map(r => ({
    ...r,
    is_active: Boolean(r.is_active),
    family_id: r.family_id || null,
    family_name: r.family_name || 'غير محدد',
    role_in_family: r.role_in_family || 'خادم',
  }));
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
    notebookCount: number;
    lessonCount: number;
    liturgyRate: number;
    notebookRate: number;
  };
}> {
  let sql = `
    SELECT 
      s.id,
      s.full_name,
      s.phone,
      s.confession_father,
      COALESCE(fs.role_in_family, 'خادم') as role_in_family,
      COALESCE(fs.family_id, 'fam-eb') as family_id,
      COALESCE(f.name, 'غير محدد') as family_name,
      COALESCE(latest_att.status, 'not_recorded') as status,
      COALESCE(latest_att.did_opening, 0) as attended_liturgy,
      COALESCE(latest_att.did_preparation, 0) as prepared_notebook,
      COALESCE(latest_att.did_lesson, 0) as taught_lesson,
      COALESCE(latest_att.did_workshop, 0) as attended_class,
      latest_att.excuse_reason,
      latest_att.meeting_date
    FROM servants s
    LEFT JOIN family_servants fs ON s.id = fs.servant_id
    LEFT JOIN families f ON fs.family_id = f.id
    LEFT JOIN LATERAL (
      SELECT 
        sa.status, 
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
  const notebookCount = servants.filter(s => s.prepared_notebook).length;
  const lessonCount = servants.filter(s => s.taught_lesson).length;

  return {
    servants,
    summary: {
      totalServants,
      presentCount,
      absentCount,
      liturgyCount,
      notebookCount,
      lessonCount,
      liturgyRate: totalServants > 0 ? Math.round((liturgyCount / totalServants) * 100) : 0,
      notebookRate: totalServants > 0 ? Math.round((notebookCount / totalServants) * 100) : 0,
    }
  };
}

export async function createServantPg(data: {
  full_name: string;
  phone: string;
  family_id?: string;
  role_in_family?: string;
  confession_father?: string;
  national_id?: string;
  job_or_study?: string;
  notes?: string;
}): Promise<Servant> {
  const id = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await queryPg(`
    INSERT INTO servants (id, full_name, phone, national_id, confession_father, job_or_study, joining_date, is_active, notes)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, true, $7)
  `, [
    id,
    data.full_name.trim(),
    data.phone.trim(),
    data.national_id?.trim() || null,
    data.confession_father?.trim() || null,
    data.job_or_study?.trim() || null,
    data.notes?.trim() || null,
  ]);

  if (data.family_id) {
    const fsId = `fs-${data.family_id}-${id}`;
    await queryPg(`
      INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family)
      VALUES ($1, $2, $3, 'ay-2026-2027', $4)
      ON CONFLICT (id) DO NOTHING
    `, [fsId, data.family_id, id, data.role_in_family?.trim() || 'خادم']);
  }

  const res = await queryOnePg(`SELECT * FROM servants WHERE id = $1`, [id]);
  return { ...res, is_active: Boolean(res.is_active), family_id: data.family_id || null };
}

export async function updateServantPg(id: string, data: Partial<Servant> & { family_id?: string; role_in_family?: string }): Promise<Servant> {
  await queryPg(`
    UPDATE servants
    SET full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        confession_father = COALESCE($3, confession_father),
        job_or_study = COALESCE($4, job_or_study),
        national_id = COALESCE($5, national_id),
        notes = COALESCE($6, notes),
        is_active = COALESCE($7, is_active),
        updated_at = now()
    WHERE id = $8
  `, [
    data.full_name ?? null,
    data.phone ?? null,
    data.confession_father ?? null,
    data.job_or_study ?? null,
    data.national_id ?? null,
    data.notes ?? null,
    data.is_active !== undefined ? data.is_active : null,
    id,
  ]);

  if (data.family_id) {
    const fsId = `fs-${data.family_id}-${id}`;
    await queryPg(`
      INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family)
      VALUES ($1, $2, $3, 'ay-2026-2027', $4)
      ON CONFLICT (id) DO UPDATE SET family_id = EXCLUDED.family_id, role_in_family = EXCLUDED.role_in_family
    `, [fsId, data.family_id, id, data.role_in_family || 'خادم']);
  }

  const res = await queryOnePg(`SELECT * FROM servants WHERE id = $1`, [id]);
  return { ...res, is_active: Boolean(res.is_active) };
}

export async function deleteServantPg(id: string): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM family_servants WHERE servant_id = $1`, [id]);
    await client.query(`DELETE FROM servant_attendance WHERE servant_id = $1`, [id]);
    await client.query(`DELETE FROM followup_tasks WHERE servant_id = $1`, [id]);
    await client.query(`UPDATE served_members SET assigned_servant_id = NULL WHERE assigned_servant_id = $1`, [id]);
    await client.query(`UPDATE families SET leader_id = NULL WHERE leader_id = $1`, [id]);
    const servant = (await client.query(`SELECT user_id, phone FROM servants WHERE id = $1`, [id])).rows[0];
    if (servant?.user_id && servant.user_id !== 'usr-admin') {
      await client.query(`DELETE FROM users WHERE id = $1`, [servant.user_id]);
    }
    await client.query(`DELETE FROM servants WHERE id = $1`, [id]);
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
  const code = data.code?.trim() || `MEM-${Math.floor(100 + Math.random() * 900)}`;
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
    data.stage?.trim() || 'عام',
    data.current_family_id,
    data.assigned_servant_id || null,
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
    SELECT m.*, f.name as family_name, f.color_code as family_color
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
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
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
    SELECT m.*, f.name as family_name, f.color_code as family_color
    FROM meetings m
    JOIN families f ON m.family_id = f.id
    WHERE m.family_id = $1 AND m.date = $2
  `, [data.family_id, dateStr]);

  if (existing) {
    return {
      ...existing,
      date: existing.date instanceof Date ? existing.date.toISOString().split('T')[0] : String(existing.date).split('T')[0],
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
    SELECT m.*, f.name as family_name, f.color_code as family_color
    FROM meetings m
    JOIN families f ON m.family_id = f.id
    WHERE m.id = $1
  `, [id]);

  return {
    ...meeting,
    date: meeting.date instanceof Date ? meeting.date.toISOString().split('T')[0] : String(meeting.date).split('T')[0],
  };
}

export async function getMeetingByIdPg(id: string): Promise<Meeting | null> {
  const row = await queryOnePg(`
    SELECT m.*, f.name as family_name, f.color_code as family_color
    FROM meetings m
    JOIN families f ON m.family_id = f.id
    WHERE m.id = $1
  `, [id]);

  if (!row) return null;

  return {
    ...row,
    date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0],
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
    for (const r of records) {
      const memberId = r.memberId || r.member_id;
      if (!memberId) continue;

      const id = `att-m-${meetingId}-${memberId}`;
      const attendedLiturgy = (r.attended_liturgy || r.attendedLiturgy) ? 1 : 0;
      const attendedCommunion = (r.attended_communion || r.attendedCommunion) ? 1 : 0;
      const attendedClass = (r.attended_class || r.attendedClass) ? 1 : 0;
      const attendedConfession = (r.attended_confession || r.attendedConfession) ? 1 : 0;
      const excuse = r.excuse_reason || r.excuseReason || null;

      await client.query(`
        INSERT INTO meeting_attendance (
          id, meeting_id, member_id, status, attended_liturgy, attended_communion,
          attended_class, attended_confession, excuse_reason, recorded_by, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
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
      const didOpening = (r.did_opening || r.didOpening) ? 1 : 0;
      const didWorkshop = (r.did_workshop || r.didWorkshop) ? 1 : 0;
      const didPreparation = (r.did_preparation || r.didPreparation) ? 1 : 0;
      const didLesson = (r.did_lesson || r.didLesson) ? 1 : 0;
      const excuse = r.excuse_reason || r.excuseReason || null;

      await client.query(`
        INSERT INTO servant_attendance (
          id, meeting_id, servant_id, status, did_opening, did_workshop,
          did_preparation, did_lesson, excuse_reason, recorded_by, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
        ON CONFLICT (meeting_id, servant_id) DO UPDATE SET
          status = EXCLUDED.status,
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
export async function getAbsenceAlertsPg(filters?: {
  familyId?: string;
  status?: string;
}): Promise<AbsenceAlert[]> {
  let sql = `
    SELECT aa.*, sm.full_name as member_name, f.name as family_name, s.full_name as assigned_servant_name
    FROM absence_alerts aa
    JOIN served_members sm ON aa.member_id = sm.id
    JOIN families f ON aa.family_id = f.id
    LEFT JOIN servants s ON aa.assigned_servant_id = s.id
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
  sql += ` ORDER BY aa.consecutive_absences_count DESC, aa.created_at DESC`;
  const rows = await queryPg(sql, params);
  return rows.map(r => ({
    ...r,
    last_attendance_date: r.last_attendance_date instanceof Date ? r.last_attendance_date.toISOString().split('T')[0] : (r.last_attendance_date ? String(r.last_attendance_date).split('T')[0] : 'غير محدد'),
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
// 11. High-Performance Dashboard Aggregations
// --------------------------------------------------------------------
export async function getDashboardDataPg() {
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
  }>(`
    SELECT
      COUNT(CASE WHEN status IN ('submitted', 'under_review', 'approved') THEN 1 END) as submitted,
      COUNT(CASE WHEN status IN ('submitted', 'under_review') THEN 1 END) as awaiting,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
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
           (SELECT COUNT(*) FROM weekly_reports WHERE family_id = f.id AND status = 'approved') as approved_reports
    FROM families f
    ORDER BY f.id ASC
  `);

  const pendingRequests = await queryOnePg<{ c: string }>(`
    SELECT COUNT(*) as c FROM join_requests WHERE status = 'pending'
  `);

  return {
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
      returnedReports: 0,
      completionRate: Number(reports?.submitted || 0) > 0 ? 100 : 0,
    },
    attendanceStats: {
      totalRecorded: totalAtt,
      present,
      absent,
      excused,
      rate: attendanceRate,
    },
    familyBreakdown: familyStats.map(f => ({
      ...f,
      members_count: Number(f.members_count || 0),
      servants_count: Number(f.servants_count || 0),
      approved_reports: Number(f.approved_reports || 0),
    })),
    recentAlerts: [],
    recentActivities: [],
  };
}
