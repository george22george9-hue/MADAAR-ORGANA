// ====================================================================
// ORGANA Neon Cloud PostgreSQL Service Layer
// 100% Persistent, Reliable Cloud Data Operations
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { getPgPool, queryPg, queryOnePg } from '@/lib/db/neon';
import {
  ChurchUser,
  UserRole,
  SystemSettings,
  Family,
  Servant,
  ServedMember,
  JoinRequest,
  Meeting,
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
  const passwordHash = data.password ? data.password.trim() : 'George-O229';

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
  const user = await getUserByIdPg(userId);
  if (!user) throw new Error('المستخدم غير موجود');
  if (user.password_hash && user.password_hash !== currentPass.trim()) {
    throw new Error('كلمة المرور الحالية غير صحيحة');
  }
  await queryPg(`UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, [newPass.trim(), userId]);
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
    data.password?.trim() || 'George-O229',
    data.requestedRole,
    data.requestedFamilyId || null,
    data.confessionFather?.trim() || null,
    data.nationalId?.trim() || null,
    data.jobOrStudy?.trim() || null,
    data.address?.trim() || null,
    data.birthDate || null,
    data.notes?.trim() || null,
  ]);
  return (await getJoinRequestByIdPg(id))!;
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
        req.password_hash || null,
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
        req.password_hash || 'George-O229',
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
    sql += ` AND (m.full_name ILIKE $${params.length} OR m.phone ILIKE $${params.length})`;
  }
  sql += ` ORDER BY m.full_name ASC`;

  const rows = await queryPg(sql, params);
  return rows.map(r => ({
    ...r,
    is_active: Boolean(r.is_active),
    family_name: r.family_name || 'غير محدد',
    assigned_servant_name: r.assigned_servant_name || 'غير معين',
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
  return row ? { ...row, is_active: Boolean(row.is_active) } : null;
}

export async function createServedMemberPg(data: {
  full_name: string;
  phone?: string;
  stage?: string;
  current_family_id: string;
  assigned_servant_id?: string;
  confession_father?: string;
  birth_date?: string;
  national_id?: string;
  address?: string;
  academic_year_or_job?: string;
  notes?: string;
}): Promise<ServedMember> {
  const id = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  await queryPg(`
    INSERT INTO served_members (
      id, full_name, phone, stage, current_family_id, assigned_servant_id,
      confession_father, birth_date, national_id, address, academic_year_or_job, is_active, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12)
  `, [
    id,
    data.full_name.trim(),
    data.phone?.trim() || null,
    data.stage?.trim() || 'عام',
    data.current_family_id,
    data.assigned_servant_id || null,
    data.confession_father?.trim() || null,
    data.birth_date || null,
    data.national_id?.trim() || null,
    data.address?.trim() || null,
    data.academic_year_or_job?.trim() || null,
    data.notes?.trim() || null,
  ]);
  return (await getMemberByIdPg(id))!;
}

export async function updateServedMemberPg(id: string, data: Partial<ServedMember>): Promise<ServedMember> {
  await queryPg(`
    UPDATE served_members
    SET full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        stage = COALESCE($3, stage),
        current_family_id = COALESCE($4, current_family_id),
        assigned_servant_id = CASE WHEN $5::text = '__CLEAR__' THEN NULL WHEN $5::text IS NOT NULL THEN $5 ELSE assigned_servant_id END,
        confession_father = COALESCE($6, confession_father),
        birth_date = COALESCE($7, birth_date),
        national_id = COALESCE($8, national_id),
        address = COALESCE($9, address),
        academic_year_or_job = COALESCE($10, academic_year_or_job),
        notes = COALESCE($11, notes),
        is_active = COALESCE($12, is_active),
        updated_at = now()
    WHERE id = $13
  `, [
    data.full_name ?? null,
    data.phone ?? null,
    data.stage ?? null,
    data.current_family_id ?? null,
    data.assigned_servant_id === null ? '__CLEAR__' : (data.assigned_servant_id ?? null),
    data.confession_father ?? null,
    data.birth_date ?? null,
    data.national_id ?? null,
    data.address ?? null,
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

export async function getMeetingAttendancePg(meetingId: string): Promise<{
  memberAttendance: any[];
  servantAttendance: any[];
}> {
  const memberAttendance = await queryPg(`
    SELECT a.*, m.full_name as member_name, m.phone as member_phone,
           m.confession_father, s.full_name as assigned_servant_name
    FROM meeting_attendance a
    JOIN served_members m ON a.member_id = m.id
    LEFT JOIN servants s ON m.assigned_servant_id = s.id
    WHERE a.meeting_id = $1
    ORDER BY m.full_name ASC
  `, [meetingId]);

  const servantAttendance = await queryPg(`
    SELECT a.*, s.full_name as servant_name, s.phone as servant_phone,
           fs.role_in_family
    FROM servant_attendance a
    JOIN servants s ON a.servant_id = s.id
    LEFT JOIN family_servants fs ON s.id = fs.servant_id
    WHERE a.meeting_id = $1
    ORDER BY s.full_name ASC
  `, [meetingId]);

  return { memberAttendance, servantAttendance };
}

export async function bulkSaveMemberAttendancePg(
  meetingId: string,
  records: Array<{
    memberId: string;
    status: string;
    attendedLiturgy?: boolean;
    attendedCommunion?: boolean;
    attendedClass?: boolean;
    attendedConfession?: boolean;
    excuseReason?: string;
  }>,
  recorder: { id: string; name: string }
): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of records) {
      const id = `att-m-${meetingId}-${r.memberId}`;
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
        r.memberId,
        r.status,
        r.attendedLiturgy ? 1 : 0,
        r.attendedCommunion ? 1 : 0,
        r.attendedClass ? 1 : 0,
        r.attendedConfession ? 1 : 0,
        r.excuseReason || null,
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
    servantId: string;
    status: string;
    didOpening?: boolean;
    didWorkshop?: boolean;
    didPreparation?: boolean;
    didLesson?: boolean;
    excuseReason?: string;
  }>,
  recorder: { id: string; name: string }
): Promise<boolean> {
  const pool = getPgPool()!;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of records) {
      const id = `att-s-${meetingId}-${r.servantId}`;
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
        r.servantId,
        r.status,
        r.didOpening ? 1 : 0,
        r.didWorkshop ? 1 : 0,
        r.didPreparation ? 1 : 0,
        r.didLesson ? 1 : 0,
        r.excuseReason || null,
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

// --------------------------------------------------------------------
// 8. High-Performance Dashboard Aggregations
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
