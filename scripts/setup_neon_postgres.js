// ====================================================================
// ORGANA — Migrate & Setup Neon Cloud PostgreSQL
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pWxtPoXTG5r6@ep-hidden-firefly-bb59lmp7-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString });
const sqliteDb = new Database(path.join(__dirname, '..', 'data', 'organa.db'));

async function setup() {
  console.log('⚡ Connecting to Neon PostgreSQL...');
  const client = await pool.connect();

  try {
    console.log('📦 Creating tables in Neon PostgreSQL...');

    await client.query(`
      -- 1. Academic Years
      CREATE TABLE IF NOT EXISTS academic_years (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_archived BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 2. System Settings
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        church_name_ar TEXT NOT NULL DEFAULT 'كنيسة الشهيد العظيم مارجرجس بسندبيس',
        church_name_en TEXT NOT NULL DEFAULT 'The Great Martyr St. George Church – Sandbees, Egypt',
        consecutive_absence_threshold INT NOT NULL DEFAULT 3,
        active_academic_year_id TEXT REFERENCES academic_years(id),
        servant_can_view_all_family_members BOOLEAN NOT NULL DEFAULT false,
        allow_servant_attendance_recording BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 3. Families
      CREATE TABLE IF NOT EXISTS families (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        leader_id TEXT,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        meeting_day TEXT DEFAULT 'Friday',
        meeting_time TEXT DEFAULT '17:00',
        location TEXT,
        description TEXT,
        color_code TEXT DEFAULT '#702C3B',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 4. Users
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar_url TEXT,
        assigned_family_id TEXT REFERENCES families(id) ON DELETE SET NULL,
        confession_father TEXT,
        password_hash TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 5. Servants
      CREATE TABLE IF NOT EXISTS servants (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        photo_url TEXT,
        national_id TEXT,
        confession_father TEXT,
        job_or_study TEXT,
        joining_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 6. Family Servants
      CREATE TABLE IF NOT EXISTS family_servants (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        servant_id TEXT NOT NULL REFERENCES servants(id) ON DELETE CASCADE,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        role_in_family TEXT DEFAULT 'خادم',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(family_id, servant_id, academic_year_id)
      );

      -- 7. Served Members
      CREATE TABLE IF NOT EXISTS served_members (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        gender TEXT NOT NULL,
        birth_date DATE NOT NULL,
        photo_url TEXT,
        current_family_id TEXT NOT NULL REFERENCES families(id) ON DELETE RESTRICT,
        assigned_servant_id TEXT REFERENCES servants(id) ON DELETE SET NULL,
        guardian_name TEXT NOT NULL,
        guardian_phone TEXT NOT NULL,
        guardian_relationship TEXT DEFAULT 'ولي أمر',
        address TEXT,
        confession_father TEXT,
        registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 8. Member History
      CREATE TABLE IF NOT EXISTS member_history (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES served_members(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        from_value TEXT,
        to_value TEXT,
        description TEXT NOT NULL,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 9. Meetings
      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        date DATE NOT NULL,
        start_time TEXT NOT NULL DEFAULT '17:00',
        end_time TEXT DEFAULT '19:00',
        lesson_title TEXT DEFAULT 'درس مدارس الأحد',
        lesson_topic TEXT DEFAULT 'عام',
        status TEXT NOT NULL DEFAULT 'scheduled',
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 10. Meeting Attendance (Members)
      CREATE TABLE IF NOT EXISTS meeting_attendance (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        member_id TEXT NOT NULL REFERENCES served_members(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'not_recorded',
        attended_liturgy INT NOT NULL DEFAULT 0,
        attended_communion INT NOT NULL DEFAULT 0,
        attended_class INT NOT NULL DEFAULT 0,
        attended_confession INT NOT NULL DEFAULT 0,
        excuse_reason TEXT,
        recorded_by TEXT,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_modified_by TEXT,
        last_modified_at TIMESTAMPTZ,
        UNIQUE(meeting_id, member_id)
      );

      -- 11. Servant Attendance
      CREATE TABLE IF NOT EXISTS servant_attendance (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        servant_id TEXT NOT NULL REFERENCES servants(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'not_recorded',
        did_opening INT NOT NULL DEFAULT 0,
        did_workshop INT NOT NULL DEFAULT 0,
        did_preparation INT NOT NULL DEFAULT 0,
        did_lesson INT NOT NULL DEFAULT 0,
        excuse_reason TEXT,
        recorded_by TEXT,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_modified_by TEXT,
        last_modified_at TIMESTAMPTZ,
        UNIQUE(meeting_id, servant_id)
      );

      -- 12. Weekly Reports
      CREATE TABLE IF NOT EXISTS weekly_reports (
        id TEXT PRIMARY KEY,
        meeting_id TEXT UNIQUE NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        meeting_date DATE NOT NULL,
        lesson_title TEXT NOT NULL,
        lesson_topic TEXT NOT NULL,
        total_members_count INT NOT NULL DEFAULT 0,
        present_members_count INT NOT NULL DEFAULT 0,
        absent_members_count INT NOT NULL DEFAULT 0,
        excused_members_count INT NOT NULL DEFAULT 0,
        total_servants_count INT NOT NULL DEFAULT 0,
        present_servants_count INT NOT NULL DEFAULT 0,
        opening_paragraph_notes TEXT,
        visual_aid_notes TEXT,
        workshop_notes TEXT,
        competition_notes TEXT,
        general_notes TEXT,
        followup_requirements TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        submitted_at TIMESTAMPTZ,
        submitted_by TEXT,
        reviewed_at TIMESTAMPTZ,
        reviewed_by TEXT,
        review_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 13. Absence Alerts
      CREATE TABLE IF NOT EXISTS absence_alerts (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES served_members(id) ON DELETE CASCADE,
        family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        assigned_servant_id TEXT REFERENCES servants(id) ON DELETE SET NULL,
        consecutive_absences_count INT NOT NULL DEFAULT 0,
        last_attendance_date DATE,
        status TEXT NOT NULL DEFAULT 'pending_followup',
        suggested_action TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 14. Followup Tasks
      CREATE TABLE IF NOT EXISTS followup_tasks (
        id TEXT PRIMARY KEY,
        alert_id TEXT REFERENCES absence_alerts(id) ON DELETE SET NULL,
        member_id TEXT NOT NULL REFERENCES served_members(id) ON DELETE CASCADE,
        servant_id TEXT NOT NULL REFERENCES servants(id) ON DELETE CASCADE,
        task_type TEXT NOT NULL,
        notes TEXT,
        result TEXT,
        is_completed BOOLEAN NOT NULL DEFAULT false,
        due_date DATE NOT NULL,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 15. Join Requests
      CREATE TABLE IF NOT EXISTS join_requests (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        requested_family_id TEXT REFERENCES families(id) ON DELETE SET NULL,
        requested_role TEXT NOT NULL DEFAULT 'servant',
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewed_by TEXT,
        reviewed_by_name TEXT,
        reviewed_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 16. Audit Logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        user_name TEXT NOT NULL,
        user_role TEXT NOT NULL,
        action TEXT NOT NULL,
        record_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        description TEXT NOT NULL,
        previous_value JSONB,
        new_value JSONB,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    console.log('✅ Tables created successfully in PostgreSQL.');

    // 2. Migrate Clean Data from SQLite
    console.log('🚚 Migrating data from SQLite to Neon PostgreSQL...');

    // Academic Years
    const ayRows = sqliteDb.prepare('SELECT * FROM academic_years').all();
    for (const ay of ayRows) {
      await client.query(`
        INSERT INTO academic_years (id, name, start_date, end_date, is_active, is_archived)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
      `, [ay.id, ay.name, ay.start_date, ay.end_date, Boolean(ay.is_active), Boolean(ay.is_archived)]);
    }

    // System Settings
    const sysRow = sqliteDb.prepare('SELECT * FROM system_settings WHERE id = \'default\'').get();
    if (sysRow) {
      await client.query(`
        INSERT INTO system_settings (id, church_name_ar, church_name_en, consecutive_absence_threshold, active_academic_year_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET church_name_ar = EXCLUDED.church_name_ar
      `, [sysRow.id, sysRow.church_name_ar, sysRow.church_name_en, sysRow.consecutive_absence_threshold, sysRow.active_academic_year_id]);
    }

    // Families
    const famRows = sqliteDb.prepare('SELECT * FROM families').all();
    for (const f of famRows) {
      await client.query(`
        INSERT INTO families (id, name, type, leader_id, academic_year_id, meeting_day, meeting_time, location, description, color_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, color_code = EXCLUDED.color_code
      `, [f.id, f.name, f.type, f.leader_id || null, f.academic_year_id, f.meeting_day, f.meeting_time, f.location, f.description, f.color_code]);
    }

    // Users (George Admin)
    const userRows = sqliteDb.prepare('SELECT * FROM users').all();
    for (const u of userRows) {
      await client.query(`
        INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, confession_father, password_hash, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET 
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role
      `, [u.id, u.email, u.full_name, u.phone, u.role, u.assigned_family_id || null, u.confession_father || null, u.password_hash, Boolean(u.is_active)]);
    }

    // Meetings (520 Friday meetings for 2026-2027)
    const meetingRows = sqliteDb.prepare('SELECT * FROM meetings').all();
    console.log(`📅 Migrating ${meetingRows.length} Friday meetings...`);
    for (const m of meetingRows) {
      await client.query(`
        INSERT INTO meetings (id, family_id, academic_year_id, title, date, start_time, end_time, lesson_title, lesson_topic, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, date = EXCLUDED.date
      `, [m.id, m.family_id, m.academic_year_id, m.title, m.date, m.start_time || '17:00', m.end_time || '19:00', m.lesson_title || 'لقاء الجمعة', m.lesson_topic || 'عام', m.status || 'scheduled']);
    }

    // Check Counts
    const resUsers = await client.query('SELECT count(*) as c FROM users');
    const resFamilies = await client.query('SELECT count(*) as c FROM families');
    const resMeetings = await client.query('SELECT count(*) as c FROM meetings');
    const resMembers = await client.query('SELECT count(*) as c FROM served_members');

    console.log('🎉 Migration Completed Successfully!');
    console.log({
      usersCount: resUsers.rows[0].c,
      familiesCount: resFamilies.rows[0].c,
      meetingsCount: resMeetings.rows[0].c,
      membersCount: resMembers.rows[0].c,
    });

  } catch (err) {
    console.error('❌ Migration Error:', err);
  } finally {
    client.release();
    pool.end();
  }
}

setup();
