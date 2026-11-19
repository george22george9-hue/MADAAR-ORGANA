// ====================================================================
// ORGANA Core Service Layer — Complete Business Logic & Database Operations
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import db from '@/lib/db';
import {
  UserRole,
  Family,
  Servant,
  ServedMember,
  Meeting,
  MeetingActivity,
  MeetingActivityAssignment,
  MemberAttendanceRecord,
  ServantAttendanceRecord,
  WeeklyNotebookReport,
  WeeklyReportStatusLog,
  SpiritualFollowupRecord,
  AbsenceAlert,
  FollowupTask,
  AuditLog,
  SystemSettings,
  AcademicYear,
  ChurchUser,
  MemberHistoryLog,
  JoinRequest,
} from '@/types/organa';

// --------------------------------------------------------------------
// 1. Audit Logging
// --------------------------------------------------------------------
export function logAuditAction(
  userId: string,
  userName: string,
  userRole: UserRole,
  action: string,
  recordType: string,
  recordId: string,
  description: string,
  previousValue?: unknown,
  newValue?: unknown
) {
  try {
    const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    db.prepare(`
      INSERT INTO audit_logs (
        id, user_id, user_name, user_role, action, record_type, record_id,
        description, previous_value, new_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      userName,
      userRole,
      action,
      recordType,
      recordId,
      description,
      previousValue ? JSON.stringify(previousValue) : null,
      newValue ? JSON.stringify(newValue) : null
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

export function getAuditLogs(limit = 100): AuditLog[] {
  return db.prepare(`
    SELECT * FROM audit_logs 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(limit) as AuditLog[];
}

// --------------------------------------------------------------------
// 2. System Settings & Academic Years
// --------------------------------------------------------------------
export function getSystemSettings(): SystemSettings {
  const row = db.prepare(`SELECT * FROM system_settings WHERE id = 'default'`).get() as any;
  if (!row) {
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

export function updateSystemSettings(settings: Partial<SystemSettings>, actor: ChurchUser) {
  const current = getSystemSettings();
  db.prepare(`
    UPDATE system_settings
    SET church_name_ar = COALESCE(?, church_name_ar),
        church_name_en = COALESCE(?, church_name_en),
        consecutive_absence_threshold = COALESCE(?, consecutive_absence_threshold),
        servant_can_view_all_family_members = COALESCE(?, servant_can_view_all_family_members),
        allow_servant_attendance_recording = COALESCE(?, allow_servant_attendance_recording),
        updated_at = datetime('now')
    WHERE id = 'default'
  `).run(
    settings.church_name_ar ?? null,
    settings.church_name_en ?? null,
    settings.consecutive_absence_threshold ?? null,
    settings.servant_can_view_all_family_members !== undefined ? (settings.servant_can_view_all_family_members ? 1 : 0) : null,
    settings.allow_servant_attendance_recording !== undefined ? (settings.allow_servant_attendance_recording ? 1 : 0) : null
  );

  logAuditAction(actor.id, actor.full_name, actor.role, 'UPDATE_SETTINGS', 'system_settings', 'default', 'تعديل إعدادات النظام وسياسات الخدمة العامة', current, settings);
  return getSystemSettings();
}

export function getAcademicYears(): AcademicYear[] {
  const rows = db.prepare(`SELECT * FROM academic_years ORDER BY start_date DESC`).all() as any[];
  return rows.map(r => ({
    ...r,
    is_active: Boolean(r.is_active),
    is_archived: Boolean(r.is_archived),
  }));
}

export function createAcademicYear(name: string, startDate: string, endDate: string, actor: ChurchUser): AcademicYear {
  const id = `ay-${name.replace(/[^0-9]/g, '-')}`;
  db.prepare(`
    INSERT INTO academic_years (id, name, start_date, end_date, is_active, is_archived)
    VALUES (?, ?, ?, ?, 0, 0)
  `).run(id, name, startDate, endDate);

  logAuditAction(actor.id, actor.full_name, actor.role, 'CREATE_ACADEMIC_YEAR', 'academic_years', id, `إضافة سنة كنسية/دراسية جديدة: ${name}`);
  return getAcademicYears().find(y => y.id === id)!;
}

export function setActiveAcademicYear(id: string, actor: ChurchUser) {
  const transaction = db.transaction(() => {
    db.prepare(`UPDATE academic_years SET is_active = 0`).run();
    db.prepare(`UPDATE academic_years SET is_active = 1 WHERE id = ?`).run(id);
    db.prepare(`UPDATE system_settings SET active_academic_year_id = ? WHERE id = 'default'`).run(id);
  });
  transaction();

  logAuditAction(actor.id, actor.full_name, actor.role, 'ACTIVATE_ACADEMIC_YEAR', 'academic_years', id, `تفعيل السنة الكنسية: ${id}`);
}

// --------------------------------------------------------------------
// 3. Users & Personas
// --------------------------------------------------------------------
export function getUsers(): ChurchUser[] {
  const rows = db.prepare(`SELECT * FROM users ORDER BY full_name ASC`).all() as any[];
  return rows.map(r => ({
    ...r,
    is_active: Boolean(r.is_active),
  }));
}

export function getUserById(id: string): ChurchUser | null {
  const row = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as any;
  if (!row) return null;
  return {
    ...row,
    is_active: Boolean(row.is_active),
  };
}

export function createUser(userData: {
  email?: string;
  full_name: string;
  phone: string;
  role: UserRole;
  assigned_family_id?: string;
  confession_father?: string;
  password?: string;
}, actor: ChurchUser): ChurchUser {
  const id = `usr-${Date.now()}`;
  const pass = userData.password || 'organa2026';
  const email = userData.email?.trim() || `${userData.phone.trim()}@organa.eg`;
  db.prepare(`
    INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, confession_father, is_active, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, email, userData.full_name, userData.phone, userData.role, userData.assigned_family_id || null, userData.confession_father || null, pass);

  logAuditAction(actor.id, actor.full_name, actor.role, 'CREATE_USER', 'users', id, `إنشاء حساب مستخدم جديد: ${userData.full_name} (${userData.role})`);
  return getUserById(id)!;
}

export function updateUser(id: string, updates: Partial<ChurchUser> & { password?: string }, actor: ChurchUser): ChurchUser {
  const current = getUserById(id);
  db.prepare(`
    UPDATE users
    SET email = COALESCE(?, email),
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        assigned_family_id = COALESCE(?, assigned_family_id),
        confession_father = COALESCE(?, confession_father),
        is_active = COALESCE(?, is_active),
        password_hash = COALESCE(?, password_hash),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    updates.email ?? null,
    updates.full_name ?? null,
    updates.phone ?? null,
    updates.role ?? null,
    updates.assigned_family_id ?? null,
    updates.confession_father ?? null,
    updates.is_active !== undefined ? (updates.is_active ? 1 : 0) : null,
    updates.password ?? null,
    id
  );

  logAuditAction(actor.id, actor.full_name, actor.role, 'UPDATE_USER', 'users', id, `تعديل بيانات المستخدم: ${current?.full_name}`, current, updates);
  return getUserById(id)!;
}

export function changeUserPassword(userId: string, oldPassword: string, newPassword: string): { success: boolean; error?: string } {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف/أرقام' };
  }

  const userRow = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as any;
  if (!userRow) {
    return { success: false, error: 'المستخدم غير موجود' };
  }

  if (oldPassword && userRow.password_hash && userRow.password_hash !== oldPassword) {
    return { success: false, error: 'كلمة المرور الحالية غير صحيحة' };
  }

  db.prepare(`
    UPDATE users
    SET password_hash = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newPassword, userId);

  logAuditAction(userRow.id, userRow.full_name, userRow.role, 'CHANGE_PASSWORD', 'users', userId, `تغيير كلمة المرور للحساب: ${userRow.full_name}`);
  return { success: true };
}

export function deleteUser(id: string, actor: ChurchUser): boolean {
  const user = getUserById(id);
  if (!user) return false;
  if (user.id === 'usr-admin' || user.phone === '01202074649') {
    throw new Error('لا يمكن حذف حساب إدارة المنظومة الأساسي.');
  }
  const transaction = db.transaction(() => {
    // Find all servants associated with this user id or phone
    const servants = db.prepare('SELECT id FROM servants WHERE user_id = ? OR phone = ?').all(id, user.phone) as any[];
    for (const s of servants) {
      db.prepare('DELETE FROM family_servants WHERE servant_id = ?').run(s.id);
      db.prepare('DELETE FROM servant_attendance WHERE servant_id = ?').run(s.id);
      db.prepare('DELETE FROM followup_tasks WHERE servant_id = ?').run(s.id);
      db.prepare('UPDATE served_members SET assigned_servant_id = NULL WHERE assigned_servant_id = ?').run(s.id);
      db.prepare('UPDATE families SET leader_id = NULL WHERE leader_id = ?').run(s.id);
      db.prepare('DELETE FROM servants WHERE id = ?').run(s.id);
    }
    db.prepare('DELETE FROM servants WHERE user_id = ? OR phone = ?').run(id, user.phone);
    db.prepare('DELETE FROM join_requests WHERE phone = ?').run(user.phone);
    db.prepare('DELETE FROM users WHERE id = ? OR phone = ?').run(id, user.phone);
  });
  transaction();
  logAuditAction(actor.id, actor.full_name, actor.role, 'DELETE_USER', 'users', id, `حذف المستخدم: ${user.full_name}`);
  return true;
}


// --------------------------------------------------------------------
// 3.1 Join Requests & Public Registration Approval
// --------------------------------------------------------------------
export function getJoinRequests(status?: string): JoinRequest[] {
  let query = `
    SELECT jr.*, f.name as requested_family_name
    FROM join_requests jr
    LEFT JOIN families f ON jr.requested_family_id = f.id
  `;
  if (status) {
    query += ` WHERE jr.status = ? ORDER BY jr.created_at DESC`;
    return db.prepare(query).all(status) as JoinRequest[];
  }
  query += ` ORDER BY jr.created_at DESC`;
  return db.prepare(query).all() as JoinRequest[];
}

export function getJoinRequestById(id: string): JoinRequest | null {
  const row = db.prepare(`
    SELECT jr.*, f.name as requested_family_name
    FROM join_requests jr
    LEFT JOIN families f ON jr.requested_family_id = f.id
    WHERE jr.id = ?
  `).get(id) as any;
  return row || null;
}

export function createJoinRequest(data: {
  fullName: string;
  phone: string;
  email?: string;
  requestedRole: 'family_leader' | 'servant';
  requestedFamilyId: string;
  notes?: string;
  password?: string;
}): { success: boolean; request?: JoinRequest; error?: string } {
  const cleanPhone = data.phone.trim();
  const cleanName = data.fullName.trim();

  if (!cleanName || !cleanPhone || !data.requestedFamilyId || !data.requestedRole) {
    return { success: false, error: 'يرجى استيفاء جميع البيانات الأساسية (الاسم، رقم الموبايل، الأسرة، والصفة).' };
  }

  // Check if there is already a pending request for this phone
  const existingPending = db.prepare(`
    SELECT * FROM join_requests 
    WHERE phone = ? AND status = 'pending'
  `).get(cleanPhone) as any;

  if (existingPending) {
    return {
      success: false,
      error: 'يوجد طلب انضمام قيد المراجعة والاعتماد بالفعل مسجل برقم الموبايل هذا. يرجى انتظار قرار الإدارة.',
    };
  }

  // Check if active user already exists with this phone
  const existingUser = db.prepare(`
    SELECT * FROM users WHERE phone = ?
  `).get(cleanPhone) as any;

  if (existingUser && existingUser.is_active) {
    return {
      success: false,
      error: 'رقم الموبايل مسجل بالفعل كحساب نشط في المنظومة. يمكنك تسجيل الدخول مباشرة.',
    };
  }

  const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO join_requests (
      id, full_name, phone, email, password_hash, requested_role, requested_family_id, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    id,
    cleanName,
    cleanPhone,
    data.email?.trim() || null,
    data.password || 'organa2026',
    data.requestedRole,
    data.requestedFamilyId,
    data.notes?.trim() || null
  );

  const created = getJoinRequestById(id);
  return { success: true, request: created! };
}

export function approveJoinRequest(
  requestId: string,
  reviewer: { id: string; full_name: string; role: UserRole }
): { success: boolean; user?: ChurchUser; error?: string } {
  // Strict authorization check: Only admin, priest, or service_secretary can approve
  if (reviewer.role !== 'admin' && reviewer.role !== 'priest' && reviewer.role !== 'service_secretary') {
    return {
      success: false,
      error: 'غير مصرح لك باعتماد الطلبات. الاعتماد مقتصر حصراً على إدارة المنظومة، الآباء الكهنة، وأمناء الخدمة.',
    };
  }

  const request = getJoinRequestById(requestId);
  if (!request) {
    return { success: false, error: 'طلب الانضمام غير موجود.' };
  }
  if (request.status !== 'pending') {
    return { success: false, error: `الطلب تم التعامل معه مسبقاً وحالته الحالية: ${request.status}` };
  }

  const activeYears = getAcademicYears();
  const activeYear = activeYears.find(y => y.is_active)?.id || 'ay-2026-2027';

  const transaction = db.transaction(() => {
    // 1. Mark request as approved
    db.prepare(`
      UPDATE join_requests
      SET status = 'approved',
          reviewed_by_id = ?,
          reviewed_by_name = ?,
          reviewed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(reviewer.id, reviewer.full_name, requestId);

    // 2. Check if user already exists in `users`
    let userRow = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(request.phone) as any;
    let userId: string;

    if (userRow) {
      userId = userRow.id;
      db.prepare(`
        UPDATE users
        SET full_name = ?,
            email = COALESCE(?, email),
            role = ?,
            assigned_family_id = ?,
            is_active = 1,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(
        request.full_name,
        request.email || null,
        request.requested_role,
        request.requested_family_id,
        userId
      );
    } else {
      userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(
        userId,
        request.email || `${request.phone}@organa.eg`,
        request.full_name,
        request.phone,
        request.requested_role,
        request.requested_family_id
      );
    }

    // 3. Role-specific linkages: if family_leader, update families.leader_id
    if (request.requested_role === 'family_leader') {
      db.prepare(`
        UPDATE families
        SET leader_id = ?
        WHERE id = ?
      `).run(userId, request.requested_family_id);
    }

    // 4. Ensure servant profile and family_servants link
    let servantRow = db.prepare(`SELECT * FROM servants WHERE phone = ?`).get(request.phone) as any;
    let servantId: string;
    if (servantRow) {
      servantId = servantRow.id;
      db.prepare(`
        UPDATE servants
        SET user_id = ?, full_name = ?, is_active = 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(userId, request.full_name, servantId);
    } else {
      servantId = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO servants (id, user_id, full_name, phone, joining_date, is_active)
        VALUES (?, ?, ?, ?, date('now'), 1)
      `).run(servantId, userId, request.full_name, request.phone);
    }

    // Link in family_servants if not already linked
    const existingFamilyLink = db.prepare(`
      SELECT * FROM family_servants 
      WHERE family_id = ? AND servant_id = ? AND academic_year_id = ?
    `).get(request.requested_family_id, servantId, activeYear);

    if (!existingFamilyLink) {
      const fsId = `fs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      db.prepare(`
        INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(
        fsId,
        request.requested_family_id,
        servantId,
        activeYear,
        request.requested_role === 'family_leader' ? 'أمين الأسرة' : 'خادم'
      );
    }

    // Log audit
    logAuditAction(
      reviewer.id,
      reviewer.full_name,
      reviewer.role,
      'APPROVE_JOIN_REQUEST',
      'join_requests',
      requestId,
      `اعتماد وتفعيل حساب: ${request.full_name} (${request.requested_role === 'family_leader' ? 'أمين أسرة' : 'خادم في الأسرة'}) بواسطة ${reviewer.full_name}`
    );

    return getUserById(userId)!;
  });

  const activatedUser = transaction();
  return { success: true, user: activatedUser };
}

export function rejectJoinRequest(
  requestId: string,
  reviewer: { id: string; full_name: string; role: UserRole },
  reason?: string
): { success: boolean; error?: string } {
  if (reviewer.role !== 'admin' && reviewer.role !== 'priest' && reviewer.role !== 'service_secretary') {
    return {
      success: false,
      error: 'غير مصرح لك برفض الطلبات. الإجراء مقتصر على إدارة المنظومة والآباء الكهنة وأمناء الخدمة فقط.',
    };
  }

  const request = getJoinRequestById(requestId);
  if (!request) {
    return { success: false, error: 'طلب الانضمام غير موجود.' };
  }

  db.prepare(`
    UPDATE join_requests
    SET status = 'rejected',
        rejection_reason = ?,
        reviewed_by_id = ?,
        reviewed_by_name = ?,
        reviewed_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(reason || null, reviewer.id, reviewer.full_name, requestId);

  logAuditAction(
    reviewer.id,
    reviewer.full_name,
    reviewer.role,
    'REJECT_JOIN_REQUEST',
    'join_requests',
    requestId,
    `رفض طلب انضمام: ${request.full_name} بواسطة ${reviewer.full_name} - السبب: ${reason || 'غير محدد'}`
  );

  return { success: true };
}

// --------------------------------------------------------------------
// 4. Families Management (10 Initial Families)
// --------------------------------------------------------------------
export function getFamilies(filters?: { userRole?: UserRole; userFamilyId?: string | null }): Family[] {
  let query = `
    SELECT f.*, 
           u.full_name as leader_name,
           (SELECT COUNT(*) FROM family_servants fs WHERE fs.family_id = f.id AND fs.is_active = 1) as servants_count,
           (SELECT COUNT(*) FROM served_members sm WHERE sm.current_family_id = f.id AND sm.is_active = 1) as members_count
    FROM families f
    LEFT JOIN users u ON f.leader_id = u.id
  `;

  // Family Leader and Servant can strictly only view their own assigned family
  if ((filters?.userRole === 'family_leader' || filters?.userRole === 'servant') && filters.userFamilyId) {
    query += ` WHERE f.id = '${filters.userFamilyId}'`;
  }

  query += ` ORDER BY f.rowid ASC`;

  const rows = db.prepare(query).all() as any[];
  return rows;
}

export function getFamilyById(id: string, actor?: { userRole?: UserRole; userFamilyId?: string | null }): Family | null {
  // Strict isolation check for servant & family leader
  if ((actor?.userRole === 'family_leader' || actor?.userRole === 'servant') && actor.userFamilyId) {
    if (id !== actor.userFamilyId) {
      return null;
    }
  }

  const row = db.prepare(`
    SELECT f.*, 
           u.full_name as leader_name,
           (SELECT COUNT(*) FROM family_servants fs WHERE fs.family_id = f.id AND fs.is_active = 1) as servants_count,
           (SELECT COUNT(*) FROM served_members sm WHERE sm.current_family_id = f.id AND sm.is_active = 1) as members_count
    FROM families f
    LEFT JOIN users u ON f.leader_id = u.id
    WHERE f.id = ?
  `).get(id) as any;

  return row || null;
}

export function createFamily(data: {
  name: string;
  type: 'children_class' | 'servants_group' | 'family_group';
  meeting_day?: string;
  meeting_time?: string;
  location?: string;
  description?: string;
  color_code?: string;
}, actor: ChurchUser): Family {
  const id = `fam-${Date.now()}`;
  const settings = getSystemSettings();
  db.prepare(`
    INSERT INTO families (id, name, type, academic_year_id, meeting_day, meeting_time, location, description, color_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.name, data.type, settings.active_academic_year_id,
    data.meeting_day || 'Friday', data.meeting_time || '17:00',
    data.location || '', data.description || '', data.color_code || '#702C3B'
  );

  logAuditAction(actor.id, actor.full_name, actor.role, 'CREATE_FAMILY', 'families', id, `إنشاء أسرة جديدة: ${data.name}`);
  return getFamilyById(id)!;
}

export function updateFamily(id: string, data: Partial<Family>, actor: ChurchUser): Family {
  const current = getFamilyById(id);
  db.prepare(`
    UPDATE families
    SET name = COALESCE(?, name),
        type = COALESCE(?, type),
        leader_id = COALESCE(?, leader_id),
        meeting_day = COALESCE(?, meeting_day),
        meeting_time = COALESCE(?, meeting_time),
        location = COALESCE(?, location),
        description = COALESCE(?, description),
        color_code = COALESCE(?, color_code),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.name ?? null,
    data.type ?? null,
    data.leader_id ?? null,
    data.meeting_day ?? null,
    data.meeting_time ?? null,
    data.location ?? null,
    data.description ?? null,
    data.color_code ?? null,
    id
  );

  logAuditAction(actor.id, actor.full_name, actor.role, 'UPDATE_FAMILY', 'families', id, `تعديل بيانات أسرة: ${current?.name}`, current, data);
  return getFamilyById(id)!;
}

// --------------------------------------------------------------------
// 5. Servants Management
// --------------------------------------------------------------------
export function getServants(filters?: { familyId?: string; userRole?: UserRole; userFamilyId?: string | null }): Servant[] {
  let targetFamilyId = filters?.familyId;
  // Servant and Family Leader only see servants belonging to their family
  if ((filters?.userRole === 'family_leader' || filters?.userRole === 'servant') && filters.userFamilyId) {
    targetFamilyId = filters.userFamilyId;
  }

  let query = `
    SELECT s.*,
           (SELECT COUNT(DISTINCT meeting_id) FROM servant_attendance sa WHERE sa.servant_id = s.id AND sa.status = 'present') as attended_meetings,
           (SELECT COUNT(DISTINCT activity_id) FROM meeting_activity_assignments maa WHERE maa.servant_id = s.id AND maa.participation_status = 'participated') as activities_count,
           (SELECT COUNT(*) FROM meeting_activity_assignments maa WHERE maa.servant_id = s.id AND maa.responsibility = 'lesson_preparer' AND maa.participation_status = 'participated') as lesson_prep_count,
           (SELECT COUNT(*) FROM meeting_activity_assignments maa WHERE maa.servant_id = s.id AND (maa.responsibility = 'main_presenter' OR maa.responsibility = 'presenter') AND maa.participation_status = 'participated') as lesson_explain_count
    FROM servants s
  `;

  if (targetFamilyId) {
    query += ` WHERE s.id IN (SELECT servant_id FROM family_servants WHERE family_id = '${targetFamilyId}' AND is_active = 1)`;
  }

  query += ` ORDER BY s.full_name ASC`;

  const rows = db.prepare(query).all() as any[];

  return rows.map(r => {
    // Get assigned families
    const fams = db.prepare(`
      SELECT f.id, f.name FROM families f
      JOIN family_servants fs ON fs.family_id = f.id
      WHERE fs.servant_id = ? AND fs.is_active = 1
    `).all(r.id) as any[];

    return {
      ...r,
      is_active: Boolean(r.is_active),
      assigned_family_ids: fams.map(f => f.id),
      assigned_family_names: fams.map(f => f.name),
      attendance_rate: r.attended_meetings ? Math.min(100, Math.round((r.attended_meetings / 4) * 100)) : 100,
    };
  });
}

export function getServantById(id: string): Servant | null {
  const servants = getServants();
  return servants.find(s => s.id === id) || null;
}

export function createServant(data: {
  full_name: string;
  phone: string;
  national_id?: string;
  confession_father?: string;
  job_or_study?: string;
  joining_date?: string;
  family_ids?: string[];
  notes?: string;
}, actor: ChurchUser): Servant {
  const id = `srv-${Date.now()}`;
  const settings = getSystemSettings();

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO servants (id, full_name, phone, national_id, confession_father, job_or_study, joining_date, is_active, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      id, data.full_name, data.phone, data.national_id || '',
      data.confession_father || '', data.job_or_study || '',
      data.joining_date || new Date().toISOString().split('T')[0],
      data.notes || ''
    );

    if (data.family_ids && data.family_ids.length > 0) {
      for (const famId of data.family_ids) {
        db.prepare(`
          INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family)
          VALUES (?, ?, ?, ?, 'خادم')
        `).run(`fsa-${Date.now()}-${famId}`, famId, id, settings.active_academic_year_id);
      }
    }
  });

  transaction();
  logAuditAction(actor.id, actor.full_name, actor.role, 'CREATE_SERVANT', 'servants', id, `إضافة خادم جديد: ${data.full_name}`);
  return getServantById(id)!;
}

export function updateServant(id: string, data: Partial<Servant> & { family_ids?: string[] }, actor: ChurchUser): Servant {
  const current = getServantById(id);
  const settings = getSystemSettings();

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE servants
      SET full_name = COALESCE(?, full_name),
          phone = COALESCE(?, phone),
          national_id = COALESCE(?, national_id),
          confession_father = COALESCE(?, confession_father),
          job_or_study = COALESCE(?, job_or_study),
          is_active = COALESCE(?, is_active),
          notes = COALESCE(?, notes),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.full_name ?? null,
      data.phone ?? null,
      data.national_id ?? null,
      data.confession_father ?? null,
      data.job_or_study ?? null,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : null,
      data.notes ?? null,
      id
    );

    if (data.family_ids) {
      db.prepare(`DELETE FROM family_servants WHERE servant_id = ?`).run(id);
      for (const famId of data.family_ids) {
        db.prepare(`
          INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family)
          VALUES (?, ?, ?, ?, 'خادم')
        `).run(`fsa-${Date.now()}-${famId}`, famId, id, settings.active_academic_year_id);
      }
    }
  });

  transaction();
  logAuditAction(actor.id, actor.full_name, actor.role, 'UPDATE_SERVANT', 'servants', id, `تعديل بيانات الخادم: ${current?.full_name}`, current, data);
  return getServantById(id)!;
}

export function deleteServant(id: string, actor: ChurchUser): boolean {
  const current = getServantById(id);
  if (!current) return false;
  if (current.user_id === 'usr-admin' || current.phone === '01202074649') {
    throw new Error('لا يمكن حذف حساب إدارة المنظومة الأساسي.');
  }
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM family_servants WHERE servant_id = ?').run(id);
    db.prepare('DELETE FROM servant_attendance WHERE servant_id = ?').run(id);
    db.prepare('DELETE FROM followup_tasks WHERE servant_id = ?').run(id);
    db.prepare('UPDATE served_members SET assigned_servant_id = NULL WHERE assigned_servant_id = ?').run(id);
    db.prepare('UPDATE families SET leader_id = NULL WHERE leader_id = ?').run(id);
    db.prepare('DELETE FROM servants WHERE id = ?').run(id);
    if (current.user_id && current.user_id !== 'usr-admin') {
      db.prepare('DELETE FROM users WHERE id = ?').run(current.user_id);
    }
    if (current.phone && current.phone !== '01202074649') {
      db.prepare("DELETE FROM users WHERE phone = ? AND id != 'usr-admin'").run(current.phone);
      db.prepare('DELETE FROM join_requests WHERE phone = ?').run(current.phone);
    }
  });
  transaction();
  logAuditAction(actor.id, actor.full_name, actor.role, 'DELETE_SERVANT', 'servants', id, `حذف الخادم: ${current.full_name}`);
  return true;
}


// --------------------------------------------------------------------
// 6. Served Members Management
// --------------------------------------------------------------------
export function getServedMembers(filters?: {
  familyId?: string;
  servantId?: string;
  search?: string;
  status?: string;
  userRole?: UserRole;
  userFamilyId?: string | null;
  userServantId?: string | null;
}): ServedMember[] {
  let query = `
    SELECT sm.*,
           f.name as current_family_name,
           s.full_name as assigned_servant_name,
           (SELECT COUNT(*) FROM meeting_attendance ma WHERE ma.member_id = sm.id AND ma.status = 'present') as total_attendances,
           (SELECT COUNT(*) FROM meeting_attendance ma WHERE ma.member_id = sm.id) as total_meetings_recorded
    FROM served_members sm
    LEFT JOIN families f ON sm.current_family_id = f.id
    LEFT JOIN servants s ON sm.assigned_servant_id = s.id
    WHERE 1=1
  `;

  // Strict Family Isolation: Family Leader & Servant can only access their assigned family
  let targetFamilyId = filters?.familyId;
  if ((filters?.userRole === 'family_leader' || filters?.userRole === 'servant') && filters.userFamilyId) {
    targetFamilyId = filters.userFamilyId;
  }

  if (targetFamilyId) {
    query += ` AND sm.current_family_id = '${targetFamilyId}'`;
  }

  // Servant specific assignment check if restricted by system policy
  const settings = getSystemSettings();
  if (filters?.userRole === 'servant' && !settings.servant_can_view_all_family_members && filters.userServantId) {
    query += ` AND sm.assigned_servant_id = '${filters.userServantId}'`;
  } else if (filters?.servantId) {
    query += ` AND sm.assigned_servant_id = '${filters.servantId}'`;
  }

  if (filters?.search) {
    const s = filters.search.trim();
    query += ` AND (sm.full_name LIKE '%${s}%' OR sm.code LIKE '%${s}%' OR sm.guardian_name LIKE '%${s}%' OR sm.guardian_phone LIKE '%${s}%')`;
  }

  query += ` ORDER BY sm.full_name ASC`;

  const rows = db.prepare(query).all() as any[];

  return rows.map(r => {
    // Calculate consecutive absences and missed confessions
    const recentAttendances = db.prepare(`
      SELECT ma.status, ma.attended_confession
      FROM meeting_attendance ma
      JOIN meetings m ON ma.meeting_id = m.id
      WHERE ma.member_id = ?
      ORDER BY m.date DESC
      LIMIT 6
    `).all(r.id) as { status: string; attended_confession?: number }[];

    let consecutiveAbsences = 0;
    for (const att of recentAttendances) {
      if (att.status === 'absent') {
        consecutiveAbsences++;
      } else {
        break;
      }
    }

    let consecutiveMissedConfessions = 0;
    for (const att of recentAttendances) {
      if (!att.attended_confession || att.attended_confession === 0) {
        consecutiveMissedConfessions++;
      } else {
        break;
      }
    }

    const totalRec = r.total_meetings_recorded || 1;
    const rate = Math.round(((r.total_attendances || 0) / totalRec) * 100);

    return {
      ...r,
      is_active: Boolean(r.is_active),
      consecutive_absences: consecutiveAbsences,
      consecutive_missed_confessions: consecutiveMissedConfessions,
      confession_warning: consecutiveMissedConfessions >= 4,
      attendance_rate: rate,
    };
  });
}

export function getMemberById(id: string, actor?: { userRole?: UserRole; userFamilyId?: string | null }): ServedMember | null {
  const member = getServedMembers().find(m => m.id === id) || null;
  if (!member) return null;
  if ((actor?.userRole === 'family_leader' || actor?.userRole === 'servant') && actor.userFamilyId) {
    if (member.current_family_id !== actor.userFamilyId) {
      return null;
    }
  }
  return member;
}

export function createServedMember(data: {
  full_name: string;
  gender: 'male' | 'female';
  birth_date: string;
  current_family_id: string;
  assigned_servant_id?: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relationship?: string;
  address?: string;
  confession_father?: string;
  notes?: string;
}, actor: ChurchUser): ServedMember {
  const count = (db.prepare(`SELECT count(*) as c FROM served_members`).get() as any).c + 1;
  const fam = getFamilyById(data.current_family_id);
  const prefix = fam?.name.includes('بنين') ? 'EB' : (fam?.name.includes('بنات') ? 'EG' : 'MEM');
  const code = `${prefix}-${100 + count}`;
  const id = `mem-${Date.now()}`;
  const settings = getSystemSettings();

  db.prepare(`
    INSERT INTO served_members (
      id, code, full_name, gender, birth_date, current_family_id, assigned_servant_id,
      guardian_name, guardian_phone, guardian_relationship, address, confession_father, registration_date, is_active, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), 1, ?)
  `).run(
    id, code, data.full_name, data.gender, data.birth_date,
    data.current_family_id, data.assigned_servant_id || null,
    data.guardian_name, data.guardian_phone, data.guardian_relationship || 'ولي أمر',
    data.address || '', data.confession_father || null, data.notes || ''
  );

  // Add history
  db.prepare(`
    INSERT INTO member_history (id, member_id, event_type, from_value, to_value, description, academic_year_id, created_by)
    VALUES (?, ?, 'registration', NULL, ?, ?, ?, ?)
  `).run(`hist-${Date.now()}`, id, data.current_family_id, `تم تسجيل المخدوم بأسرة ${fam?.name}`, settings.active_academic_year_id, actor.id);

  logAuditAction(actor.id, actor.full_name, actor.role, 'CREATE_MEMBER', 'served_members', id, `تسجيل مخدوم جديد: ${data.full_name} (${code})`);
  return getMemberById(id)!;
}

export function updateServedMember(id: string, data: Partial<ServedMember>, actor: ChurchUser): ServedMember {
  const current = getMemberById(id);
  const settings = getSystemSettings();

  const transaction = db.transaction(() => {
    // If family transfer
    if (data.current_family_id && data.current_family_id !== current?.current_family_id) {
      const oldFam = getFamilyById(current!.current_family_id);
      const newFam = getFamilyById(data.current_family_id);
      db.prepare(`
        INSERT INTO member_history (id, member_id, event_type, from_value, to_value, description, academic_year_id, created_by)
        VALUES (?, ?, 'family_transfer', ?, ?, ?, ?, ?)
      `).run(
        `hist-${Date.now()}`, id, current!.current_family_id, data.current_family_id,
        `نقل المخدوم من أسرة (${oldFam?.name}) إلى أسرة (${newFam?.name})`,
        settings.active_academic_year_id, actor.id
      );
    }

    // If servant reassigned
    if (data.assigned_servant_id && data.assigned_servant_id !== current?.assigned_servant_id) {
      const oldSrv = current?.assigned_servant_id ? getServantById(current.assigned_servant_id) : null;
      const newSrv = getServantById(data.assigned_servant_id);
      db.prepare(`
        INSERT INTO member_history (id, member_id, event_type, from_value, to_value, description, academic_year_id, created_by)
        VALUES (?, ?, 'servant_assignment', ?, ?, ?, ?, ?)
      `).run(
        `hist-${Date.now()}-srv`, id, current?.assigned_servant_id || null, data.assigned_servant_id,
        `إسناد المخدوم للخادم (${newSrv?.full_name}) ${oldSrv ? `بدلاً من (${oldSrv.full_name})` : ''}`,
        settings.active_academic_year_id, actor.id
      );
    }

    db.prepare(`
      UPDATE served_members
      SET full_name = COALESCE(?, full_name),
          gender = COALESCE(?, gender),
          birth_date = COALESCE(?, birth_date),
          current_family_id = COALESCE(?, current_family_id),
          assigned_servant_id = COALESCE(?, assigned_servant_id),
          guardian_name = COALESCE(?, guardian_name),
          guardian_phone = COALESCE(?, guardian_phone),
          guardian_relationship = COALESCE(?, guardian_relationship),
          address = COALESCE(?, address),
          confession_father = COALESCE(?, confession_father),
          is_active = COALESCE(?, is_active),
          notes = COALESCE(?, notes),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.full_name ?? null,
      data.gender ?? null,
      data.birth_date ?? null,
      data.current_family_id ?? null,
      data.assigned_servant_id ?? null,
      data.guardian_name ?? null,
      data.guardian_phone ?? null,
      data.guardian_relationship ?? null,
      data.address ?? null,
      data.confession_father ?? null,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : null,
      data.notes ?? null,
      id
    );
  });

  transaction();
  logAuditAction(actor.id, actor.full_name, actor.role, 'UPDATE_MEMBER', 'served_members', id, `تعديل بيانات المخدوم: ${current?.full_name}`, current, data);
  return getMemberById(id)!;
}

export function deleteServedMember(id: string, actor: ChurchUser): boolean {
  const current = getMemberById(id);
  if (!current) return false;
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM meeting_attendance WHERE member_id = ?').run(id);
    db.prepare('DELETE FROM absence_alerts WHERE member_id = ?').run(id);
    db.prepare('DELETE FROM followup_tasks WHERE member_id = ?').run(id);
    db.prepare('DELETE FROM member_history WHERE member_id = ?').run(id);
    db.prepare('DELETE FROM served_members WHERE id = ?').run(id);
  });
  transaction();
  logAuditAction(actor.id, actor.full_name, actor.role, 'DELETE_MEMBER', 'served_members', id, `حذف المخدوم: ${current.full_name}`);
  return true;
}


export function getMemberHistory(memberId: string): MemberHistoryLog[] {
  return db.prepare(`
    SELECT * FROM member_history 
    WHERE member_id = ? 
    ORDER BY created_at DESC
  `).all(memberId) as MemberHistoryLog[];
}

// --------------------------------------------------------------------
// 7. Meetings & Dynamic Multi-Servant Activities (CRITICAL MODULE)
// --------------------------------------------------------------------
export function getMeetings(filters?: {
  familyId?: string;
  status?: string;
  userRole?: UserRole;
  userFamilyId?: string | null;
}): Meeting[] {
  let query = `
    SELECT m.*, f.name as family_name
    FROM meetings m
    JOIN families f ON m.family_id = f.id
    WHERE 1=1
  `;

  // Strict Family Isolation: Family Leader & Servant only see their family's meetings
  let targetFamilyId = filters?.familyId;
  if ((filters?.userRole === 'family_leader' || filters?.userRole === 'servant') && filters.userFamilyId) {
    targetFamilyId = filters.userFamilyId;
  }

  if (targetFamilyId) {
    query += ` AND m.family_id = '${targetFamilyId}'`;
  }

  if (filters?.status) {
    query += ` AND m.status = '${filters.status}'`;
  }

  query += ` ORDER BY m.date DESC, m.start_time DESC`;

  return db.prepare(query).all() as Meeting[];
}

export function getMeetingById(id: string, actor?: { userRole?: UserRole; userFamilyId?: string | null }): (Meeting & { activities: MeetingActivity[]; report?: WeeklyNotebookReport }) | null {
  const meeting = db.prepare(`
    SELECT m.*, f.name as family_name
    FROM meetings m
    JOIN families f ON m.family_id = f.id
    WHERE m.id = ?
  `).get(id) as Meeting | undefined;

  if (!meeting) return null;

  // Strict isolation check for servant & family leader
  if ((actor?.userRole === 'family_leader' || actor?.userRole === 'servant') && actor.userFamilyId) {
    if (meeting.family_id !== actor.userFamilyId) {
      return null;
    }
  }

  // Fetch activities with multi-servant assignments
  const activities = db.prepare(`
    SELECT * FROM meeting_activities 
    WHERE meeting_id = ? 
    ORDER BY order_index ASC
  `).all(id) as MeetingActivity[];

  for (const act of activities) {
    const assignments = db.prepare(`
      SELECT maa.*, s.full_name as servant_name, s.phone as servant_phone
      FROM meeting_activity_assignments maa
      JOIN servants s ON maa.servant_id = s.id
      WHERE maa.activity_id = ?
      ORDER BY maa.created_at ASC
    `).all(act.id) as MeetingActivityAssignment[];
    act.assignments = assignments;
  }

  // Fetch weekly report if any
  const report = db.prepare(`
    SELECT * FROM weekly_reports WHERE meeting_id = ?
  `).get(id) as WeeklyNotebookReport | undefined;

  return {
    ...meeting,
    activities,
    report,
  };
}

export function createMeeting(data: {
  family_id: string;
  title: string;
  date: string;
  start_time: string;
  end_time?: string;
  lesson_title: string;
  lesson_topic: string;
  notes?: string;
}, actor: ChurchUser): Meeting {
  const id = `mtg-${Date.now()}`;
  const settings = getSystemSettings();

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO meetings (
        id, family_id, academic_year_id, title, date, start_time, end_time,
        lesson_title, lesson_topic, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `).run(
      id, data.family_id, settings.active_academic_year_id,
      data.title, data.date, data.start_time, data.end_time || '',
      data.lesson_title, data.lesson_topic, data.notes || '', actor.id
    );

    // Create initial standard activities for quick start
    const defaultActivities = [
      { title: 'الفقرة الافتتاحية والصلاة', desc: 'صلاة الشكر وبدء الاجتماع', order: 1 },
      { title: 'الألحان والتسبيح', desc: 'تدريب الألحان والترانيم', order: 2 },
      { title: 'تحضير وشرح الدرس', desc: data.lesson_title, order: 3 },
      { title: 'وسيلة إيضاح ومجسم', desc: 'عرض توضيحي تفاعلي', order: 4 },
      { title: 'ورشة عمل وتطبيقات', desc: 'مجموعات عمل ومناقشة الآيات', order: 5 },
      { title: 'مسابقة وفقرة تشجيعية', desc: 'توزيع هدايا وتشجيع', order: 6 },
    ];

    for (const act of defaultActivities) {
      db.prepare(`
        INSERT INTO meeting_activities (id, meeting_id, title, description, order_index)
        VALUES (?, ?, ?, ?, ?)
      `).run(`act-${id}-${act.order}`, id, act.title, act.desc, act.order);
    }

    // Auto-create initial draft report
    db.prepare(`
      INSERT INTO weekly_reports (
        id, meeting_id, family_id, academic_year_id, meeting_date,
        lesson_title, lesson_topic, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(`rep-${id}`, id, data.family_id, settings.active_academic_year_id, data.date, data.lesson_title, data.lesson_topic);
  });

  transaction();
  logAuditAction(actor.id, actor.full_name, actor.role, 'CREATE_MEETING', 'meetings', id, `إنشاء لقاء أسبوعي: ${data.title} بتاريخ ${data.date}`);
  return getMeetingById(id)!;
}

export function updateMeeting(id: string, data: Partial<Meeting>, actor: ChurchUser): Meeting {
  const current = getMeetingById(id);
  db.prepare(`
    UPDATE meetings
    SET title = COALESCE(?, title),
        date = COALESCE(?, date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        lesson_title = COALESCE(?, lesson_title),
        lesson_topic = COALESCE(?, lesson_topic),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.title ?? null,
    data.date ?? null,
    data.start_time ?? null,
    data.end_time ?? null,
    data.lesson_title ?? null,
    data.lesson_topic ?? null,
    data.status ?? null,
    data.notes ?? null,
    id
  );

  // Sync lesson info to weekly report if draft
  if (data.lesson_title || data.lesson_topic) {
    db.prepare(`
      UPDATE weekly_reports
      SET lesson_title = COALESCE(?, lesson_title),
          lesson_topic = COALESCE(?, lesson_topic)
      WHERE meeting_id = ? AND status = 'draft'
    `).run(data.lesson_title ?? null, data.lesson_topic ?? null, id);
  }

  logAuditAction(actor.id, actor.full_name, actor.role, 'UPDATE_MEETING', 'meetings', id, `تعديل بيانات اللقاء: ${current?.title}`, current, data);
  return getMeetingById(id)!;
}

// --------------------------------------------------------------------
// 8. Dynamic Activity Builder & Multi-Servant Assignments
// --------------------------------------------------------------------
export function addMeetingActivity(meetingId: string, title: string, description: string, orderIndex: number, actor: ChurchUser): MeetingActivity {
  const id = `act-${Date.now()}`;
  db.prepare(`
    INSERT INTO meeting_activities (id, meeting_id, title, description, order_index)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, meetingId, title, description, orderIndex);

  logAuditAction(actor.id, actor.full_name, actor.role, 'ADD_ACTIVITY', 'meeting_activities', id, `إضافة فقرة جديدة باللقاء: ${title}`);
  return {
    id,
    meeting_id: meetingId,
    title,
    description,
    order_index: orderIndex,
    assignments: [],
    created_at: new Date().toISOString(),
  };
}

export function updateMeetingActivity(activityId: string, data: { title?: string; description?: string; order_index?: number }) {
  db.prepare(`
    UPDATE meeting_activities
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        order_index = COALESCE(?, order_index)
    WHERE id = ?
  `).run(data.title ?? null, data.description ?? null, data.order_index ?? null, activityId);
}

export function deleteMeetingActivity(activityId: string, actor: ChurchUser) {
  db.prepare(`DELETE FROM meeting_activities WHERE id = ?`).run(activityId);
  logAuditAction(actor.id, actor.full_name, actor.role, 'DELETE_ACTIVITY', 'meeting_activities', activityId, `حذف فقرة من اللقاء`);
}

// Assign Servant to Activity (Supports multiple servants per activity!)
export function assignServantToActivity(data: {
  activity_id: string;
  servant_id: string;
  responsibility: 'main_presenter' | 'assistant' | 'lesson_preparer' | 'presenter' | 'organizer' | 'tech_support' | 'participant';
  custom_responsibility_title?: string;
  participation_status?: 'assigned' | 'participated' | 'not_participated' | 'unconfirmed';
}, actor: ChurchUser): MeetingActivityAssignment {
  const id = `asn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT OR REPLACE INTO meeting_activity_assignments (
      id, activity_id, servant_id, responsibility, custom_responsibility_title,
      assignment_status, participation_status
    ) VALUES (?, ?, ?, ?, ?, 'assigned', ?)
  `).run(
    id, data.activity_id, data.servant_id, data.responsibility,
    data.custom_responsibility_title || null,
    data.participation_status || 'assigned'
  );

  const srv = getServantById(data.servant_id);
  logAuditAction(actor.id, actor.full_name, actor.role, 'ASSIGN_SERVANT_ACTIVITY', 'meeting_activity_assignments', id, `تكليف الخادم (${srv?.full_name}) بمسؤولية (${data.responsibility}) في النشاط`);

  return db.prepare(`
    SELECT maa.*, s.full_name as servant_name, s.phone as servant_phone
    FROM meeting_activity_assignments maa
    JOIN servants s ON maa.servant_id = s.id
    WHERE maa.id = ?
  `).get(id) as MeetingActivityAssignment;
}

export function updateActivityAssignmentStatus(
  assignmentId: string,
  updates: {
    participation_status?: 'assigned' | 'participated' | 'not_participated' | 'unconfirmed';
    responsibility?: any;
    notes?: string;
  },
  actor: ChurchUser
) {
  db.prepare(`
    UPDATE meeting_activity_assignments
    SET participation_status = COALESCE(?, participation_status),
        responsibility = COALESCE(?, responsibility),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(updates.participation_status ?? null, updates.responsibility ?? null, updates.notes ?? null, assignmentId);

  logAuditAction(actor.id, actor.full_name, actor.role, 'UPDATE_ASSIGNMENT_STATUS', 'meeting_activity_assignments', assignmentId, `تحديث حالة مشاركة الخادم إلى: ${updates.participation_status}`);
}

export function removeServantFromActivity(assignmentId: string, actor: ChurchUser) {
  db.prepare(`DELETE FROM meeting_activity_assignments WHERE id = ?`).run(assignmentId);
  logAuditAction(actor.id, actor.full_name, actor.role, 'REMOVE_SERVANT_ACTIVITY', 'meeting_activity_assignments', assignmentId, `إلغاء تكليف خادم من فقرة`);
}

// --------------------------------------------------------------------
// 9. Attendance Management
// --------------------------------------------------------------------
export function getMeetingAttendance(meetingId: string, actor?: { userRole?: UserRole; userFamilyId?: string | null }): {
  members: (MemberAttendanceRecord & { member_name: string; code: string; guardian_phone: string; assigned_servant_name: string; confession_father?: string })[];
  servants: (ServantAttendanceRecord & { servant_name: string; phone: string; role_in_family: string; confession_father?: string })[];
} {
  const meeting = db.prepare(`SELECT family_id FROM meetings WHERE id = ?`).get(meetingId) as { family_id: string } | undefined;
  if (!meeting) return { members: [], servants: [] };

  // Strict isolation check for servant & family leader
  if ((actor?.userRole === 'family_leader' || actor?.userRole === 'servant') && actor.userFamilyId) {
    if (meeting.family_id !== actor.userFamilyId) {
      return { members: [], servants: [] };
    }
  }

  const members = db.prepare(`
    SELECT 
      COALESCE(ma.id, 'att-' || ? || '-' || sm.id) as id,
      ? as meeting_id,
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
    LEFT JOIN meeting_attendance ma ON ma.meeting_id = ? AND ma.member_id = sm.id
    LEFT JOIN servants s ON sm.assigned_servant_id = s.id
    WHERE sm.current_family_id = ? AND sm.is_active = 1
    ORDER BY sm.full_name ASC
  `).all(meetingId, meetingId, meetingId, meeting.family_id) as any[];

  const servants = db.prepare(`
    SELECT 
      COALESCE(sa.id, 'satt-' || ? || '-' || s.id) as id,
      ? as meeting_id,
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
    FROM servants s
    LEFT JOIN family_servants fs ON fs.servant_id = s.id AND fs.family_id = ?
    LEFT JOIN servant_attendance sa ON sa.meeting_id = ? AND sa.servant_id = s.id
    WHERE s.is_active = 1
    ORDER BY s.full_name ASC
  `).all(meetingId, meetingId, meeting.family_id, meetingId) as any[];

  return { members, servants };
}

export function checkConfessionAlert(memberId: string) {
  try {
    const recent = db.prepare(`
      SELECT ma.attended_confession, m.date, sm.current_family_id, sm.assigned_servant_id, sm.full_name
      FROM meeting_attendance ma
      JOIN meetings m ON ma.meeting_id = m.id
      JOIN served_members sm ON ma.member_id = sm.id
      WHERE ma.member_id = ?
      ORDER BY m.date DESC
      LIMIT 4
    `).all(memberId) as any[];

    if (recent.length >= 4) {
      const allMissed = recent.every(r => !r.attended_confession || r.attended_confession === 0);
      if (allMissed) {
        const member = recent[0];
        const alertId = `conf-alert-${memberId}`;
        db.prepare(`
          INSERT INTO absence_alerts (id, member_id, family_id, assigned_servant_id, consecutive_absences_count, last_attendance_date, status, suggested_action)
          VALUES (?, ?, ?, ?, 4, ?, 'pending_followup', '⚠️ تنبيه رعوي عاجل: لم يعترف منذ 4 أسابيع متتالية!')
          ON CONFLICT(member_id, status) DO UPDATE SET
            suggested_action = '⚠️ تنبيه رعوي عاجل: لم يعترف منذ 4 أسابيع متتالية!',
            consecutive_absences_count = 4,
            created_at = datetime('now')
        `).run(alertId, memberId, member.current_family_id, member.assigned_servant_id || null, member.date);
      }
    }
  } catch (err) {
    console.error('checkConfessionAlert error:', err);
  }
}

export function recordMemberAttendance(
  meetingId: string,
  memberId: string,
  status: 'present' | 'absent' | 'excused' | 'not_recorded',
  excuseReason: string | null,
  actor: ChurchUser,
  details?: {
    attended_liturgy?: boolean | number;
    attended_communion?: boolean | number;
    attended_class?: boolean | number;
    attended_confession?: boolean | number;
  }
) {
  const existing = db.prepare(`
    SELECT id FROM meeting_attendance WHERE meeting_id = ? AND member_id = ?
  `).get(meetingId, memberId) as { id: string } | undefined;

  const attended_liturgy = details?.attended_liturgy ? 1 : 0;
  const attended_communion = details?.attended_communion ? 1 : 0;
  const attended_class = details?.attended_class ? 1 : 0;
  const attended_confession = details?.attended_confession ? 1 : 0;

  let resolvedStatus = status;
  if (attended_class && resolvedStatus === 'not_recorded') {
    resolvedStatus = 'present';
  }

  if (existing) {
    db.prepare(`
      UPDATE meeting_attendance
      SET status = ?, 
          excuse_reason = ?, 
          attended_liturgy = ?,
          attended_communion = ?,
          attended_class = ?,
          attended_confession = ?,
          last_modified_by = ?, 
          last_modified_at = datetime('now')
      WHERE id = ?
    `).run(resolvedStatus, excuseReason || null, attended_liturgy, attended_communion, attended_class, attended_confession, actor.id, existing.id);
  } else {
    const id = `att-${meetingId}-${memberId}`;
    db.prepare(`
      INSERT INTO meeting_attendance (id, meeting_id, member_id, status, excuse_reason, attended_liturgy, attended_communion, attended_class, attended_confession, recorded_by, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, meetingId, memberId, resolvedStatus, excuseReason || null, attended_liturgy, attended_communion, attended_class, attended_confession, actor.id);
  }

  recalculateMeetingReportStats(meetingId);
  checkAbsenceAlert(memberId);
  checkConfessionAlert(memberId);
}

export function bulkSaveMemberAttendance(
  meetingId: string,
  records: { 
    memberId: string; 
    status: 'present' | 'absent' | 'excused' | 'not_recorded'; 
    excuseReason?: string;
    attended_liturgy?: boolean | number;
    attended_communion?: boolean | number;
    attended_class?: boolean | number;
    attended_confession?: boolean | number;
  }[],
  actor: ChurchUser
) {
  const transaction = db.transaction(() => {
    for (const r of records) {
      recordMemberAttendance(meetingId, r.memberId, r.status, r.excuseReason || null, actor, {
        attended_liturgy: r.attended_liturgy,
        attended_communion: r.attended_communion,
        attended_class: r.attended_class,
        attended_confession: r.attended_confession,
      });
    }
  });
  transaction();

  logAuditAction(actor.id, actor.full_name, actor.role, 'BULK_ATTENDANCE', 'meeting_attendance', meetingId, `تسجيل حضور ومتابعة روحية لـ ${records.length} مخدوم`);
}

export function recordServantAttendance(
  meetingId: string,
  servantId: string,
  status: 'present' | 'absent' | 'excused' | 'not_recorded',
  excuseReason: string | null,
  actor: ChurchUser,
  details?: {
    did_opening?: boolean | number;
    did_workshop?: boolean | number;
    did_preparation?: boolean | number;
    did_lesson?: boolean | number;
  }
) {
  const existing = db.prepare(`
    SELECT id FROM servant_attendance WHERE meeting_id = ? AND servant_id = ?
  `).get(meetingId, servantId) as { id: string } | undefined;

  const did_opening = details?.did_opening ? 1 : 0;
  const did_workshop = details?.did_workshop ? 1 : 0;
  const did_preparation = details?.did_preparation ? 1 : 0;
  const did_lesson = details?.did_lesson ? 1 : 0;

  let resolvedStatus = status;
  if ((did_opening || did_workshop || did_preparation || did_lesson) && resolvedStatus === 'not_recorded') {
    resolvedStatus = 'present';
  }

  if (existing) {
    db.prepare(`
      UPDATE servant_attendance
      SET status = ?, 
          excuse_reason = ?, 
          did_opening = ?,
          did_workshop = ?,
          did_preparation = ?,
          did_lesson = ?,
          last_modified_by = ?, 
          last_modified_at = datetime('now')
      WHERE id = ?
    `).run(resolvedStatus, excuseReason || null, did_opening, did_workshop, did_preparation, did_lesson, actor.id, existing.id);
  } else {
    const id = `satt-${meetingId}-${servantId}`;
    db.prepare(`
      INSERT INTO servant_attendance (id, meeting_id, servant_id, status, excuse_reason, did_opening, did_workshop, did_preparation, did_lesson, recorded_by, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, meetingId, servantId, resolvedStatus, excuseReason || null, did_opening, did_workshop, did_preparation, did_lesson, actor.id);
  }

  recalculateMeetingReportStats(meetingId);
}

export function bulkSaveServantAttendance(
  meetingId: string,
  records: {
    servantId: string;
    status: 'present' | 'absent' | 'excused' | 'not_recorded';
    excuseReason?: string;
    did_opening?: boolean | number;
    did_workshop?: boolean | number;
    did_preparation?: boolean | number;
    did_lesson?: boolean | number;
  }[],
  actor: ChurchUser
) {
  const transaction = db.transaction(() => {
    for (const r of records) {
      recordServantAttendance(meetingId, r.servantId, r.status, r.excuseReason || null, actor, {
        did_opening: r.did_opening,
        did_workshop: r.did_workshop,
        did_preparation: r.did_preparation,
        did_lesson: r.did_lesson,
      });
    }
  });
  transaction();

  logAuditAction(actor.id, actor.full_name, actor.role, 'BULK_SERVANT_ATTENDANCE', 'servant_attendance', meetingId, `تسجيل مشاركات خدام اللقاء لـ ${records.length} خادم`);
}

function recalculateMeetingReportStats(meetingId: string) {
  const memberCounts = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
    FROM meeting_attendance
    WHERE meeting_id = ?
  `).get(meetingId) as any;

  const servantCounts = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
    FROM servant_attendance
    WHERE meeting_id = ?
  `).get(meetingId) as any;

  db.prepare(`
    UPDATE weekly_reports
    SET total_members_count = ?,
        present_members_count = ?,
        absent_members_count = ?,
        excused_members_count = ?,
        total_servants_count = ?,
        present_servants_count = ?
    WHERE meeting_id = ?
  `).run(
    memberCounts?.total || 0,
    memberCounts?.present || 0,
    memberCounts?.absent || 0,
    memberCounts?.excused || 0,
    servantCounts?.total || 0,
    servantCounts?.present || 0,
    meetingId
  );
}

function checkAbsenceAlert(memberId: string) {
  const settings = getSystemSettings();
  const threshold = settings.consecutive_absence_threshold || 3;

  const recent = db.prepare(`
    SELECT ma.status, m.date, m.family_id
    FROM meeting_attendance ma
    JOIN meetings m ON ma.meeting_id = m.id
    WHERE ma.member_id = ?
    ORDER BY m.date DESC
    LIMIT ?
  `).all(memberId, threshold) as any[];

  if (recent.length >= threshold && recent.every(r => r.status === 'absent')) {
    const mem = db.prepare(`SELECT * FROM served_members WHERE id = ?`).get(memberId) as any;
    const alertId = `alt-${memberId}`;
    db.prepare(`
      INSERT OR REPLACE INTO absence_alerts (
        id, member_id, family_id, assigned_servant_id, consecutive_absences_count,
        last_attendance_date, status, suggested_action
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending_followup', 'تنبيه غياب متتالي يتطلب افتقاد عاجل والتواصل مع الأسرة')
    `).run(
      alertId, memberId, mem.current_family_id, mem.assigned_servant_id,
      threshold, recent[0].date
    );
  }
}

// --------------------------------------------------------------------
// 10. Weekly Family Notebook (الكشكول الإلكتروني)
// --------------------------------------------------------------------
export function getWeeklyReports(filters?: {
  familyId?: string;
  status?: string;
  userRole?: UserRole;
  userFamilyId?: string | null;
}): WeeklyNotebookReport[] {
  let query = `
    SELECT wr.*, 
           f.name as family_name,
           u1.full_name as submitted_by_name,
           u2.full_name as reviewed_by_name
    FROM weekly_reports wr
    JOIN families f ON wr.family_id = f.id
    LEFT JOIN users u1 ON wr.submitted_by = u1.id
    LEFT JOIN users u2 ON wr.reviewed_by = u2.id
    WHERE 1=1
  `;

  // Strict Family Isolation: Family Leader & Servant only see their family's notebooks
  let targetFamilyId = filters?.familyId;
  if ((filters?.userRole === 'family_leader' || filters?.userRole === 'servant') && filters.userFamilyId) {
    targetFamilyId = filters.userFamilyId;
  }

  if (targetFamilyId) {
    query += ` AND wr.family_id = '${targetFamilyId}'`;
  }

  if (filters?.status) {
    query += ` AND wr.status = '${filters.status}'`;
  }

  query += ` ORDER BY wr.meeting_date DESC`;

  return db.prepare(query).all() as WeeklyNotebookReport[];
}

export function getWeeklyReportById(id: string, actor?: { userRole?: UserRole; userFamilyId?: string | null }): (WeeklyNotebookReport & { history: WeeklyReportStatusLog[] }) | null {
  const report = db.prepare(`
    SELECT wr.*, 
           f.name as family_name,
           u1.full_name as submitted_by_name,
           u2.full_name as reviewed_by_name
    FROM weekly_reports wr
    JOIN families f ON wr.family_id = f.id
    LEFT JOIN users u1 ON wr.submitted_by = u1.id
    LEFT JOIN users u2 ON wr.reviewed_by = u2.id
    WHERE wr.id = ?
  `).get(id) as WeeklyNotebookReport | undefined;

  if (!report) return null;

  // Strict isolation check for servant & family leader
  if ((actor?.userRole === 'family_leader' || actor?.userRole === 'servant') && actor.userFamilyId) {
    if (report.family_id !== actor.userFamilyId) {
      return null;
    }
  }

  const history = db.prepare(`
    SELECT * FROM weekly_report_status_history
    WHERE report_id = ?
    ORDER BY created_at DESC
  `).all(id) as WeeklyReportStatusLog[];

  return {
    ...report,
    history,
  };
}

export function updateWeeklyReport(id: string, data: Partial<WeeklyNotebookReport>, actor: ChurchUser): WeeklyNotebookReport {
  db.prepare(`
    UPDATE weekly_reports
    SET opening_paragraph_notes = COALESCE(?, opening_paragraph_notes),
        visual_aid_notes = COALESCE(?, visual_aid_notes),
        workshop_notes = COALESCE(?, workshop_notes),
        competition_notes = COALESCE(?, competition_notes),
        general_notes = COALESCE(?, general_notes),
        followup_requirements = COALESCE(?, followup_requirements),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    data.opening_paragraph_notes ?? null,
    data.visual_aid_notes ?? null,
    data.workshop_notes ?? null,
    data.competition_notes ?? null,
    data.general_notes ?? null,
    data.followup_requirements ?? null,
    id
  );

  return getWeeklyReportById(id)!;
}

export function submitWeeklyReport(id: string, actor: ChurchUser): WeeklyNotebookReport {
  const current = getWeeklyReportById(id);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE weekly_reports
    SET status = 'submitted',
        submitted_at = ?,
        submitted_by = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(now, actor.id, id);

  db.prepare(`
    INSERT INTO weekly_report_status_history (id, report_id, from_status, to_status, changed_by, changed_by_name, comment)
    VALUES (?, ?, ?, 'submitted', ?, ?, 'تم تسليم الكشكول الإلكتروني للمراجعة والاعتماد')
  `).run(`rsh-${Date.now()}`, id, current?.status || 'draft', actor.id, actor.full_name);

  logAuditAction(actor.id, actor.full_name, actor.role, 'SUBMIT_REPORT', 'weekly_reports', id, `تسليم كشكول اللقاء: ${current?.lesson_title}`);
  return getWeeklyReportById(id)!;
}

export function reviewWeeklyReport(
  id: string,
  newStatus: 'approved' | 'returned_for_corrections',
  reviewNotes: string,
  actor: ChurchUser
): WeeklyNotebookReport {
  const current = getWeeklyReportById(id);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE weekly_reports
    SET status = ?,
        reviewed_at = ?,
        reviewed_by = ?,
        review_notes = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(newStatus, now, actor.id, reviewNotes, id);

  const comment = newStatus === 'approved' 
    ? 'تم اعتماد التقرير بنجاح' 
    : `تمت إعادة التقرير للتعديل: ${reviewNotes}`;

  db.prepare(`
    INSERT INTO weekly_report_status_history (id, report_id, from_status, to_status, changed_by, changed_by_name, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(`rsh-${Date.now()}`, id, current?.status, newStatus, actor.id, actor.full_name, comment);

  logAuditAction(actor.id, actor.full_name, actor.role, 'REVIEW_REPORT', 'weekly_reports', id, `${newStatus === 'approved' ? 'اعتماد' : 'إعادة'} كشكول اللقاء: ${current?.lesson_title}`);
  return getWeeklyReportById(id)!;
}

// --------------------------------------------------------------------
// 11. Spiritual Follow-up (قداس / تناول / مدارس أحد)
// --------------------------------------------------------------------
export function getSpiritualFollowups(filters?: {
  familyId?: string;
  memberId?: string;
  date?: string;
  userRole?: UserRole;
  userFamilyId?: string | null;
}): (SpiritualFollowupRecord & { member_name: string; code: string; family_name: string })[] {
  let query = `
    SELECT sf.*, sm.full_name as member_name, sm.code, f.name as family_name
    FROM spiritual_followups sf
    JOIN served_members sm ON sf.member_id = sm.id
    JOIN families f ON sm.current_family_id = f.id
    WHERE 1=1
  `;

  // Strict Family Isolation: Family Leader & Servant only see their family's members' spiritual records
  let targetFamilyId = filters?.familyId;
  if ((filters?.userRole === 'family_leader' || filters?.userRole === 'servant') && filters.userFamilyId) {
    targetFamilyId = filters.userFamilyId;
  }

  if (filters?.memberId) {
    query += ` AND sf.member_id = '${filters.memberId}'`;
  }

  if (targetFamilyId) {
    query += ` AND sm.current_family_id = '${targetFamilyId}'`;
  }

  if (filters?.date) {
    query += ` AND sf.date = '${filters.date}'`;
  }

  query += ` ORDER BY sf.date DESC, sm.full_name ASC`;

  return db.prepare(query).all() as any[];
}

export function recordSpiritualFollowup(
  memberId: string,
  date: string,
  data: {
    liturgy_attendance: 'yes' | 'no' | 'not_recorded';
    communion_attendance: 'yes' | 'no' | 'not_recorded';
    sunday_school_attendance: 'yes' | 'no' | 'not_recorded';
    general_followup_status?: 'yes' | 'no' | 'not_recorded';
    notes?: string;
  },
  actor: ChurchUser
) {
  const settings = getSystemSettings();
  const id = `spf-${date}-${memberId}`;

  db.prepare(`
    INSERT OR REPLACE INTO spiritual_followups (
      id, member_id, academic_year_id, date, liturgy_attendance,
      communion_attendance, sunday_school_attendance, general_followup_status,
      notes, recorded_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, memberId, settings.active_academic_year_id, date,
    data.liturgy_attendance, data.communion_attendance,
    data.sunday_school_attendance, data.general_followup_status || 'not_recorded',
    data.notes || '', actor.id
  );

  logAuditAction(actor.id, actor.full_name, actor.role, 'RECORD_SPIRITUAL', 'spiritual_followups', id, `تسجيل متابعة روحية للمخدوم بتاريخ ${date}`);
}

// --------------------------------------------------------------------
// 12. Absence Alerts & Follow-up Tasks
// --------------------------------------------------------------------
export function getAbsenceAlerts(filters?: {
  familyId?: string;
  status?: string;
  userRole?: UserRole;
  userFamilyId?: string | null;
}): AbsenceAlert[] {
  let query = `
    SELECT aa.*, sm.full_name as member_name, f.name as family_name, s.full_name as assigned_servant_name
    FROM absence_alerts aa
    JOIN served_members sm ON aa.member_id = sm.id
    JOIN families f ON aa.family_id = f.id
    LEFT JOIN servants s ON aa.assigned_servant_id = s.id
    WHERE 1=1
  `;

  // Strict Family Isolation: Family Leader & Servant only see their family's alerts
  let targetFamilyId = filters?.familyId;
  if ((filters?.userRole === 'family_leader' || filters?.userRole === 'servant') && filters.userFamilyId) {
    targetFamilyId = filters.userFamilyId;
  }

  if (targetFamilyId) {
    query += ` AND aa.family_id = '${targetFamilyId}'`;
  }

  if (filters?.status) {
    query += ` AND aa.status = '${filters.status}'`;
  }

  query += ` ORDER BY aa.consecutive_absences_count DESC, aa.created_at DESC`;

  return db.prepare(query).all() as AbsenceAlert[];
}

export function updateAbsenceAlertStatus(alertId: string, status: 'pending_followup' | 'in_progress' | 'resolved' | 'dismissed', actor: ChurchUser) {
  db.prepare(`UPDATE absence_alerts SET status = ? WHERE id = ?`).run(status, alertId);
  logAuditAction(actor.id, actor.full_name, actor.role, 'UPDATE_ALERT', 'absence_alerts', alertId, `تحديث حالة تنبيه الغياب إلى: ${status}`);
}

export function getFollowupTasks(servantId?: string): FollowupTask[] {
  let query = `
    SELECT ft.*, sm.full_name as member_name, s.full_name as servant_name
    FROM followup_tasks ft
    JOIN served_members sm ON ft.member_id = sm.id
    JOIN servants s ON ft.servant_id = s.id
    WHERE 1=1
  `;

  if (servantId) {
    query += ` AND ft.servant_id = '${servantId}'`;
  }

  query += ` ORDER BY ft.is_completed ASC, ft.due_date ASC`;

  const rows = db.prepare(query).all() as any[];
  return rows.map(r => ({
    ...r,
    is_completed: Boolean(r.is_completed),
  }));
}

export function completeFollowupTask(taskId: string, result: 'successful_contact' | 'no_answer' | 'family_excuse' | 'needs_priest_visit', notes: string, actor: ChurchUser) {
  db.prepare(`
    UPDATE followup_tasks
    SET is_completed = 1,
        result = ?,
        notes = COALESCE(notes || '\n' || ?, ?),
        completed_at = datetime('now')
    WHERE id = ?
  `).run(result, notes, notes, taskId);

  // If task was tied to alert, resolve alert if successful
  const task = db.prepare(`SELECT alert_id FROM followup_tasks WHERE id = ?`).get(taskId) as any;
  if (task?.alert_id && result === 'successful_contact') {
    db.prepare(`UPDATE absence_alerts SET status = 'resolved' WHERE id = ?`).run(task.alert_id);
  }

  logAuditAction(actor.id, actor.full_name, actor.role, 'COMPLETE_TASK', 'followup_tasks', taskId, `إتمام مهمة افتقاد بنتيجة: ${result}`);
}

// --------------------------------------------------------------------
// 13. High-Performance Dashboard Aggregations (Tailored for 4 Roles)
// --------------------------------------------------------------------
export function getPriestDashboardData() {
  const familiesCount = (db.prepare(`SELECT COUNT(*) as c FROM families`).get() as any).c;
  const servantsCount = (db.prepare(`SELECT COUNT(*) as c FROM servants WHERE is_active = 1`).get() as any).c;
  const membersCount = (db.prepare(`SELECT COUNT(*) as c FROM served_members WHERE is_active = 1`).get() as any).c;
  const totalMeetings = (db.prepare(`SELECT COUNT(*) as c FROM meetings`).get() as any).c;

  // Report statistics
  const submittedReports = (db.prepare(`SELECT COUNT(*) as c FROM weekly_reports WHERE status IN ('submitted', 'under_review', 'approved')`).get() as any).c;
  const awaitingReview = (db.prepare(`SELECT COUNT(*) as c FROM weekly_reports WHERE status IN ('submitted', 'under_review')`).get() as any).c;
  const returnedReports = (db.prepare(`SELECT COUNT(*) as c FROM weekly_reports WHERE status = 'returned_for_corrections'`).get() as any).c;
  const approvedReports = (db.prepare(`SELECT COUNT(*) as c FROM weekly_reports WHERE status = 'approved'`).get() as any).c;

  // Attendance stats across recent meetings
  const attendanceAgg = db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
    FROM meeting_attendance
  `).get() as any;

  const totalAtt = (attendanceAgg?.present || 0) + (attendanceAgg?.absent || 0) + (attendanceAgg?.excused || 0);
  const attendanceRate = totalAtt > 0 ? Math.round(((attendanceAgg?.present || 0) / totalAtt) * 100) : 0;

  // Family comparisons
  const familyStats = db.prepare(`
    SELECT f.id, f.name, f.type, f.color_code,
           (SELECT COUNT(*) FROM served_members WHERE current_family_id = f.id AND is_active = 1) as members_count,
           (SELECT COUNT(*) FROM family_servants WHERE family_id = f.id AND is_active = 1) as servants_count,
           (SELECT COUNT(*) FROM weekly_reports WHERE family_id = f.id AND status = 'approved') as approved_reports
    FROM families f
  `).all();

  // Active alerts
  const alertsCount = (db.prepare(`SELECT COUNT(*) as c FROM absence_alerts WHERE status = 'pending_followup'`).get() as any).c;

  // Recent audit logs
  const recentLogs = db.prepare(`
    SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5
  `).all();

  return {
    familiesCount,
    servantsCount,
    membersCount,
    totalMeetings,
    submittedReports,
    awaitingReview,
    returnedReports,
    approvedReports,
    attendanceRate,
    presentCount: attendanceAgg?.present || 0,
    absentCount: attendanceAgg?.absent || 0,
    excusedCount: attendanceAgg?.excused || 0,
    familyStats,
    alertsCount,
    recentLogs,
  };
}

export function getSecretaryDashboardData() {
  const priestData = getPriestDashboardData();

  // Notebook submission status per family
  const notebookFollowup = db.prepare(`
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
  `).all();

  // Reports pending review
  const pendingReports = db.prepare(`
    SELECT wr.*, f.name as family_name, u.full_name as submitted_by_name
    FROM weekly_reports wr
    JOIN families f ON wr.family_id = f.id
    LEFT JOIN users u ON wr.submitted_by = u.id
    WHERE wr.status IN ('submitted', 'under_review')
    ORDER BY wr.submitted_at ASC
  `).all();

  return {
    ...priestData,
    notebookFollowup,
    pendingReports,
  };
}

export function getFamilyLeaderDashboardData(familyId: string) {
  const family = getFamilyById(familyId);
  const meetings = getMeetings({ familyId });
  const reports = getWeeklyReports({ familyId });
  const servants = getServants({ familyId });
  const members = getServedMembers({ familyId });
  const alerts = getAbsenceAlerts({ familyId, status: 'pending_followup' });

  // Next upcoming or recent meeting
  const latestMeeting = meetings[0] || null;

  // Servants activity participation in this family
  const servantParticipation = servants.map(s => {
    const actCount = (db.prepare(`
      SELECT COUNT(*) as c 
      FROM meeting_activity_assignments maa
      JOIN meeting_activities ma ON maa.activity_id = ma.id
      JOIN meetings m ON ma.meeting_id = m.id
      WHERE maa.servant_id = ? AND m.family_id = ? AND maa.participation_status = 'participated'
    `).get(s.id, familyId) as any).c;

    return {
      servant_id: s.id,
      servant_name: s.full_name,
      phone: s.phone,
      activities_count: actCount,
    };
  });

  return {
    family,
    servantsCount: servants.length,
    membersCount: members.length,
    meetingsCount: meetings.length,
    latestMeeting,
    reports,
    alerts,
    servantParticipation,
  };
}

export function getServantDashboardData(servantId: string, familyId?: string) {
  const servant = getServantById(servantId);
  const assignedMembers = getServedMembers({
    servantId,
    userRole: 'servant',
    userFamilyId: familyId,
    userServantId: servantId,
  });
  const pendingTasks = getFollowupTasks(servantId).filter(t => !t.is_completed);

  // My upcoming assignments (strictly in assigned family if specified)
  let assignmentsQuery = `
    SELECT maa.*, ma.title as activity_title, m.title as meeting_title, m.date as meeting_date, m.start_time
    FROM meeting_activity_assignments maa
    JOIN meeting_activities ma ON maa.activity_id = ma.id
    JOIN meetings m ON ma.meeting_id = m.id
    WHERE maa.servant_id = ? AND m.date >= date('now', '-7 days')
  `;
  if (familyId) {
    assignmentsQuery += ` AND m.family_id = '${familyId}'`;
  }
  assignmentsQuery += ` ORDER BY m.date ASC`;
  const myAssignments = db.prepare(assignmentsQuery).all(servantId);

  // My participation history
  let historyQuery = `
    SELECT maa.*, ma.title as activity_title, m.title as meeting_title, m.date as meeting_date
    FROM meeting_activity_assignments maa
    JOIN meeting_activities ma ON maa.activity_id = ma.id
    JOIN meetings m ON ma.meeting_id = m.id
    WHERE maa.servant_id = ? AND maa.participation_status = 'participated'
  `;
  if (familyId) {
    historyQuery += ` AND m.family_id = '${familyId}'`;
  }
  historyQuery += ` ORDER BY m.date DESC LIMIT 10`;
  const history = db.prepare(historyQuery).all(servantId);

  return {
    servant,
    assignedMembers,
    pendingTasks,
    myAssignments,
    history,
  };
}

