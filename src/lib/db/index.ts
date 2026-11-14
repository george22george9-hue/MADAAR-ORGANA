// ====================================================================
// ORGANA Database Engine — SQLite WAL with Production Schema
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const isVercel = Boolean(process.env.VERCEL);
let DB_PATH: string;

if (isVercel) {
  const tmpPath = path.join('/tmp', 'organa.db');
  if (!fs.existsSync(tmpPath)) {
    const sourcePath = path.join(process.cwd(), 'data', 'organa.db');
    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, tmpPath);
      } catch (err) {
        console.error('Error copying DB to /tmp:', err);
      }
    }
  }
  DB_PATH = tmpPath;
} else {
  const DB_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  DB_PATH = path.join(DB_DIR, 'organa.db');
}

// Global singleton for better-sqlite3 across HMR in Next.js development
declare global {
  // eslint-disable-next-line no-var
  var __organa_db: Database.Database | undefined;
}

function getDatabase(): Database.Database {
  if (global.__organa_db) {
    return global.__organa_db;
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema if not present
  initSchema(db);

  if (process.env.NODE_ENV !== 'production') {
    global.__organa_db = db;
  }

  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    -- Academic Years
    CREATE TABLE IF NOT EXISTS academic_years (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- System Settings
    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      church_name_ar TEXT NOT NULL DEFAULT 'كنيسة الشهيد العظيم مارجرجس بسندبيس',
      church_name_en TEXT NOT NULL DEFAULT 'The Great Martyr St. George Church – Sandbees, Egypt',
      consecutive_absence_threshold INTEGER NOT NULL DEFAULT 3,
      active_academic_year_id TEXT,
      servant_can_view_all_family_members INTEGER NOT NULL DEFAULT 0,
      allow_servant_attendance_recording INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Families
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('children_class', 'servants_group', 'family_group')),
      leader_id TEXT,
      academic_year_id TEXT NOT NULL,
      meeting_day TEXT DEFAULT 'Friday',
      meeting_time TEXT DEFAULT '17:00',
      location TEXT,
      description TEXT,
      color_code TEXT DEFAULT '#702C3B',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
    );

    -- Users (Priest, Secretary, Leader, Servant)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('priest', 'service_secretary', 'family_leader', 'servant')),
      avatar_url TEXT,
      assigned_family_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      password_hash TEXT DEFAULT 'organa2026',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (assigned_family_id) REFERENCES families(id) ON DELETE SET NULL
    );

    -- Servants Profile
    CREATE TABLE IF NOT EXISTS servants (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      photo_url TEXT,
      national_id TEXT,
      confession_father TEXT,
      job_or_study TEXT,
      joining_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Family Servants (Many-to-Many Assignment)
    CREATE TABLE IF NOT EXISTS family_servants (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      servant_id TEXT NOT NULL,
      academic_year_id TEXT NOT NULL,
      role_in_family TEXT DEFAULT 'خادم',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (servant_id) REFERENCES servants(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
      UNIQUE(family_id, servant_id, academic_year_id)
    );

    -- Served Members (Children, Youths, Families)
    CREATE TABLE IF NOT EXISTS served_members (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
      birth_date TEXT NOT NULL,
      photo_url TEXT,
      current_family_id TEXT NOT NULL,
      assigned_servant_id TEXT,
      guardian_name TEXT NOT NULL,
      guardian_phone TEXT NOT NULL,
      guardian_relationship TEXT DEFAULT 'ولي أمر',
      address TEXT,
      registration_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (current_family_id) REFERENCES families(id) ON DELETE RESTRICT,
      FOREIGN KEY (assigned_servant_id) REFERENCES servants(id) ON DELETE SET NULL
    );

    -- Member History (Audit of transfers and reassignments)
    CREATE TABLE IF NOT EXISTS member_history (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      from_value TEXT,
      to_value TEXT,
      description TEXT NOT NULL,
      academic_year_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES served_members(id) ON DELETE CASCADE
    );

    -- Meetings
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      academic_year_id TEXT NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      lesson_title TEXT NOT NULL,
      lesson_topic TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
    );

    -- Dynamic Meeting Activities
    CREATE TABLE IF NOT EXISTS meeting_activities (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      duration_minutes INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    );

    -- Meeting Activity Servant Assignments (CRITICAL: Multiple servants per activity)
    CREATE TABLE IF NOT EXISTS meeting_activity_assignments (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      servant_id TEXT NOT NULL,
      responsibility TEXT NOT NULL CHECK (responsibility IN (
        'main_presenter', 'assistant', 'lesson_preparer', 'presenter', 'organizer', 'tech_support', 'participant'
      )),
      custom_responsibility_title TEXT,
      assignment_status TEXT NOT NULL DEFAULT 'assigned',
      participation_status TEXT NOT NULL DEFAULT 'unconfirmed' CHECK (participation_status IN (
        'assigned', 'participated', 'not_participated', 'unconfirmed'
      )),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (activity_id) REFERENCES meeting_activities(id) ON DELETE CASCADE,
      FOREIGN KEY (servant_id) REFERENCES servants(id) ON DELETE CASCADE,
      UNIQUE(activity_id, servant_id)
    );

    -- Meeting Attendance for Served Members
    CREATE TABLE IF NOT EXISTS meeting_attendance (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'not_recorded')),
      excuse_reason TEXT,
      recorded_by TEXT NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_modified_by TEXT,
      last_modified_at TEXT,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES served_members(id) ON DELETE CASCADE,
      UNIQUE(meeting_id, member_id)
    );

    -- Servant Attendance for Meetings
    CREATE TABLE IF NOT EXISTS servant_attendance (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      servant_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'not_recorded')),
      excuse_reason TEXT,
      recorded_by TEXT NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_modified_by TEXT,
      last_modified_at TEXT,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (servant_id) REFERENCES servants(id) ON DELETE CASCADE,
      UNIQUE(meeting_id, servant_id)
    );

    -- Spiritual Follow-up (Liturgy, Communion, Sunday School)
    CREATE TABLE IF NOT EXISTS spiritual_followups (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      academic_year_id TEXT NOT NULL,
      date TEXT NOT NULL,
      liturgy_attendance TEXT NOT NULL DEFAULT 'not_recorded' CHECK (liturgy_attendance IN ('yes', 'no', 'not_recorded')),
      communion_attendance TEXT NOT NULL DEFAULT 'not_recorded' CHECK (communion_attendance IN ('yes', 'no', 'not_recorded')),
      sunday_school_attendance TEXT NOT NULL DEFAULT 'not_recorded' CHECK (sunday_school_attendance IN ('yes', 'no', 'not_recorded')),
      general_followup_status TEXT NOT NULL DEFAULT 'not_recorded' CHECK (general_followup_status IN ('yes', 'no', 'not_recorded')),
      notes TEXT,
      recorded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES served_members(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
      UNIQUE(member_id, date)
    );

    -- Weekly Family Notebook / Report (الكشكول الإلكتروني)
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id TEXT PRIMARY KEY,
      meeting_id TEXT UNIQUE NOT NULL,
      family_id TEXT NOT NULL,
      academic_year_id TEXT NOT NULL,
      meeting_date TEXT NOT NULL,
      lesson_title TEXT NOT NULL,
      lesson_topic TEXT NOT NULL,
      total_members_count INTEGER NOT NULL DEFAULT 0,
      present_members_count INTEGER NOT NULL DEFAULT 0,
      absent_members_count INTEGER NOT NULL DEFAULT 0,
      excused_members_count INTEGER NOT NULL DEFAULT 0,
      total_servants_count INTEGER NOT NULL DEFAULT 0,
      present_servants_count INTEGER NOT NULL DEFAULT 0,
      opening_paragraph_notes TEXT,
      visual_aid_notes TEXT,
      workshop_notes TEXT,
      competition_notes TEXT,
      general_notes TEXT,
      followup_requirements TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'in_progress', 'submitted', 'under_review', 'returned_for_corrections', 'approved'
      )),
      submitted_at TEXT,
      submitted_by TEXT,
      reviewed_at TEXT,
      reviewed_by TEXT,
      review_notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
    );

    -- Weekly Report Status History
    CREATE TABLE IF NOT EXISTS weekly_report_status_history (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      changed_by_name TEXT NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
    );

    -- Absence Alerts
    CREATE TABLE IF NOT EXISTS absence_alerts (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      family_id TEXT NOT NULL,
      assigned_servant_id TEXT,
      consecutive_absences_count INTEGER NOT NULL DEFAULT 0,
      last_attendance_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending_followup' CHECK (status IN ('pending_followup', 'in_progress', 'resolved', 'dismissed')),
      suggested_action TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES served_members(id) ON DELETE CASCADE,
      FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_servant_id) REFERENCES servants(id) ON DELETE SET NULL,
      UNIQUE(member_id, status)
    );

    -- Follow-up Tasks
    CREATE TABLE IF NOT EXISTS followup_tasks (
      id TEXT PRIMARY KEY,
      alert_id TEXT,
      member_id TEXT NOT NULL,
      servant_id TEXT NOT NULL,
      task_type TEXT NOT NULL CHECK (task_type IN ('phone_call', 'home_visit', 'in_church_chat', 'other')),
      notes TEXT,
      result TEXT CHECK (result IN ('successful_contact', 'no_answer', 'family_excuse', 'needs_priest_visit', NULL)),
      is_completed INTEGER NOT NULL DEFAULT 0,
      due_date TEXT NOT NULL,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (alert_id) REFERENCES absence_alerts(id) ON DELETE SET NULL,
      FOREIGN KEY (member_id) REFERENCES served_members(id) ON DELETE CASCADE,
      FOREIGN KEY (servant_id) REFERENCES servants(id) ON DELETE CASCADE
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      record_type TEXT NOT NULL,
      record_id TEXT NOT NULL,
      description TEXT NOT NULL,
      previous_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for high-performance querying
    CREATE INDEX IF NOT EXISTS idx_families_year ON families(academic_year_id);
    CREATE INDEX IF NOT EXISTS idx_served_members_family ON served_members(current_family_id);
    CREATE INDEX IF NOT EXISTS idx_served_members_servant ON served_members(assigned_servant_id);
    CREATE INDEX IF NOT EXISTS idx_meetings_family ON meetings(family_id);
    CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);
    CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting ON meeting_attendance(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_meeting_attendance_member ON meeting_attendance(member_id);
    CREATE INDEX IF NOT EXISTS idx_servant_attendance_meeting ON servant_attendance(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_activities_meeting ON meeting_activities(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_activity_assignments_act ON meeting_activity_assignments(activity_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_reports_family ON weekly_reports(family_id);
    CREATE INDEX IF NOT EXISTS idx_weekly_reports_status ON weekly_reports(status);
    CREATE INDEX IF NOT EXISTS idx_absence_alerts_status ON absence_alerts(status);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
  `);

  // Run dynamic safe schema migrations
  applyMigrations(db);

  // Seed clean essential production data (George Admin, 10 Families, Academic Year, Meetings)
  seedCleanProductionData(db);
}

function seedCleanProductionData(db: Database.Database) {
  try {
    // 1. Ensure Academic Year
    db.prepare(`
      INSERT OR IGNORE INTO academic_years (id, name, start_date, end_date, is_active, is_archived)
      VALUES ('ay-2026-2027', '2026–2027', '2026-09-01', '2027-08-31', 1, 0)
    `).run();

    // 2. Ensure System Settings
    db.prepare(`
      INSERT OR IGNORE INTO system_settings (id, church_name_ar, church_name_en, consecutive_absence_threshold, active_academic_year_id)
      VALUES ('default', 'كنيسة الشهيد العظيم مارجرجس بسندبيس', 'The Great Martyr St. George Church – Sandbees, Egypt', 3, 'ay-2026-2027')
    `).run();

    // 3. Ensure George Admin User is ALWAYS present and active with correct password
    db.prepare(`
      INSERT OR REPLACE INTO users (
        id, email, full_name, phone, role, assigned_family_id, is_active, password_hash
      ) VALUES (
        'usr-admin',
        'admin@organa.eg',
        'إدارة المنظومة (مسؤول النظام)',
        '01202074649',
        'admin',
        NULL,
        1,
        'George-O229'
      )
    `).run();

    // 4. Ensure 10 Families
    const families = [
      { id: 'fam-nursery', name: 'حضانة', type: 'children_class', time: '16:00', loc: 'مبنى الخدمات - الدور الأرضي', color: '#832729', day: 'Friday' },
      { id: 'fam-pri1-2', name: 'أولى وتانية', type: 'children_class', time: '16:00', loc: 'مبنى الخدمات - الدور الأول', color: '#9C344A', day: 'Friday' },
      { id: 'fam-pri3-4', name: 'تالتة ورابعة', type: 'children_class', time: '16:30', loc: 'مبنى الخدمات - قاعة القديس أبانوب', color: '#702C3B', day: 'Friday' },
      { id: 'fam-pri5-6', name: 'خامسة وسادسة', type: 'children_class', time: '16:30', loc: 'مبنى الخدمات - قاعة الأنبا كاراس', color: '#5B1E2D', day: 'Friday' },
      { id: 'fam-prep-boys', name: 'إعدادي بنين', type: 'children_class', time: '17:00', loc: 'الكنيسة الرئيسية - قاعة الشهيد مارجرجس', color: '#421923', day: 'Friday' },
      { id: 'fam-prep-girls', name: 'إعدادي بنات', type: 'children_class', time: '17:00', loc: 'مبنى الخدمات - قاعة القديسة دميانة', color: '#A34358', day: 'Friday' },
      { id: 'fam-sec', name: 'ثانوي', type: 'children_class', time: '18:30', loc: 'مبنى الخدمات - مسرح الكنيسة', color: '#4C1D27', day: 'Friday' },
      { id: 'fam-servant-prep', name: 'إعداد خدام', type: 'servants_group', time: '19:00', loc: 'قاعة البابا كيرلس السادس', color: '#B35368', day: 'Sunday' },
      { id: 'fam-servants', name: 'خدام', type: 'servants_group', time: '20:30', loc: 'الكنيسة الكبرى', color: '#702C3B', day: 'Sunday' },
      { id: 'fam-couples', name: 'أسر', type: 'family_group', time: '19:30', loc: 'قاعة الاجتماعات الرئيسية', color: '#3A141D', day: 'Tuesday' },
    ];

    const insertFam = db.prepare(`
      INSERT OR IGNORE INTO families (id, name, type, academic_year_id, meeting_day, meeting_time, location, color_code)
      VALUES (?, ?, ?, 'ay-2026-2027', ?, ?, ?, ?)
    `);
    for (const f of families) {
      insertFam.run(f.id, f.name, f.type, f.day, f.time, f.loc, f.color);
    }

    // 5. Ensure Meetings exist if empty
    const meetingCount = db.prepare('SELECT count(*) as c FROM meetings').get() as { c: number };
    if (!meetingCount || meetingCount.c === 0) {
      seedMeetings(db);
    }
  } catch (err) {
    console.error('Error seeding essential church data:', err);
  }
}

function seedMeetings(db: Database.Database) {
  try {
    const families = db.prepare('SELECT id, name, meeting_time FROM families').all() as any[];
    const startDate = new Date('2026-09-01');
    const endDate = new Date('2027-08-31');

    const d = new Date(startDate);
    while (d.getDay() !== 5) {
      d.setDate(d.getDate() + 1);
    }

    const insertMeeting = db.prepare(`
      INSERT OR IGNORE INTO meetings (id, family_id, academic_year_id, title, date, start_time, end_time, lesson_title, lesson_topic, status)
      VALUES (?, ?, 'ay-2026-2027', ?, ?, ?, '19:00', 'لقاء الجمعة', 'عام', 'scheduled')
    `);

    const runAll = db.transaction(() => {
      while (d <= endDate) {
        const dateStr = d.toISOString().split('T')[0];
        for (const fam of families) {
          const id = `mtg-${fam.id}-${dateStr}`;
          const title = `لقاء الجمعة (${fam.name})`;
          insertMeeting.run(id, fam.id, title, dateStr, fam.meeting_time || '17:00');
        }
        d.setDate(d.getDate() + 7);
      }
    });
    runAll();
  } catch (err) {
    console.error('Error seeding meetings:', err);
  }
}


function applyMigrations(db: Database.Database) {
  const addCol = (table: string, col: string, def: string) => {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run();
    } catch {}
  };
  addCol('users', 'confession_father', 'TEXT');
  addCol('served_members', 'confession_father', 'TEXT');
  addCol('meeting_attendance', 'attended_liturgy', 'INTEGER DEFAULT 0');
  addCol('meeting_attendance', 'attended_communion', 'INTEGER DEFAULT 0');
  addCol('meeting_attendance', 'attended_class', 'INTEGER DEFAULT 0');
  addCol('meeting_attendance', 'attended_confession', 'INTEGER DEFAULT 0');
  addCol('servant_attendance', 'did_opening', 'INTEGER DEFAULT 0');
  addCol('servant_attendance', 'did_workshop', 'INTEGER DEFAULT 0');
  addCol('servant_attendance', 'did_preparation', 'INTEGER DEFAULT 0');
  addCol('servant_attendance', 'did_lesson', 'INTEGER DEFAULT 0');
}

export const db = getDatabase();
export default db;

