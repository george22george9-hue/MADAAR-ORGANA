-- ====================================================================
-- ORGANA — Church Service & Sunday School Management Platform
-- The Great Martyr St. George Church – Sandbees, Egypt
-- Developed by MADAAR Technologies
-- Database: PostgreSQL (Supabase Compatible)
-- ====================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Academic Years
CREATE TABLE IF NOT EXISTS public.academic_years (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    church_name_ar TEXT NOT NULL DEFAULT 'كنيسة الشهيد العظيم مارجرجس بسندبيس',
    church_name_en TEXT NOT NULL DEFAULT 'The Great Martyr St. George Church – Sandbees, Egypt',
    consecutive_absence_threshold INT NOT NULL DEFAULT 3,
    active_academic_year_id TEXT REFERENCES public.academic_years(id),
    servant_can_view_all_family_members BOOLEAN NOT NULL DEFAULT false,
    allow_servant_attendance_recording BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Families (10 Initial families across 3 types)
CREATE TABLE IF NOT EXISTS public.families (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('children_class', 'servants_group', 'family_group')),
    leader_id UUID,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    meeting_day TEXT DEFAULT 'Friday',
    meeting_time TIME DEFAULT '17:00',
    location TEXT,
    description TEXT,
    color_code TEXT DEFAULT '#702C3B',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Users (Extends auth.users or custom)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('priest', 'service_secretary', 'family_leader', 'servant')),
    avatar_url TEXT,
    assigned_family_id TEXT REFERENCES public.families(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Foreign key for family leader
ALTER TABLE public.families 
ADD CONSTRAINT fk_family_leader 
FOREIGN KEY (leader_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 6. Servants
CREATE TABLE IF NOT EXISTS public.servants (
    id TEXT PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE SET NULL,
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

-- 7. Family Servants Assignment (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.family_servants (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    servant_id TEXT NOT NULL REFERENCES public.servants(id) ON DELETE CASCADE,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    role_in_family TEXT DEFAULT 'خادم',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(family_id, servant_id, academic_year_id)
);

-- 8. Served Members (Children, Youths, Families)
CREATE TABLE IF NOT EXISTS public.served_members (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    birth_date DATE NOT NULL,
    photo_url TEXT,
    current_family_id TEXT NOT NULL REFERENCES public.families(id) ON DELETE RESTRICT,
    assigned_servant_id TEXT REFERENCES public.servants(id) ON DELETE SET NULL,
    guardian_name TEXT NOT NULL,
    guardian_phone TEXT NOT NULL,
    guardian_relationship TEXT DEFAULT 'ولي أمر',
    address TEXT,
    registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Member History (Audit of movements and assignments)
CREATE TABLE IF NOT EXISTS public.member_history (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES public.served_members(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_value TEXT,
    to_value TEXT,
    description TEXT NOT NULL,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Meetings
CREATE TABLE IF NOT EXISTS public.meetings (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    lesson_title TEXT NOT NULL,
    lesson_topic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Dynamic Meeting Activities
CREATE TABLE IF NOT EXISTS public.meeting_activities (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    duration_minutes INT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Meeting Activity Servant Assignments (CRITICAL: Multiple servants per activity)
CREATE TABLE IF NOT EXISTS public.meeting_activity_assignments (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL REFERENCES public.meeting_activities(id) ON DELETE CASCADE,
    servant_id TEXT NOT NULL REFERENCES public.servants(id) ON DELETE CASCADE,
    responsibility TEXT NOT NULL CHECK (responsibility IN (
        'main_presenter', 'assistant', 'lesson_preparer', 'presenter', 'organizer', 'tech_support', 'participant'
    )),
    custom_responsibility_title TEXT,
    assignment_status TEXT NOT NULL DEFAULT 'assigned',
    participation_status TEXT NOT NULL DEFAULT 'unconfirmed' CHECK (participation_status IN (
        'assigned', 'participated', 'not_participated', 'unconfirmed'
    )),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(activity_id, servant_id)
);

-- 13. Meeting Attendance for Served Members
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES public.served_members(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'not_recorded')),
    excuse_reason TEXT,
    recorded_by UUID,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_modified_by UUID,
    last_modified_at TIMESTAMPTZ,
    UNIQUE(meeting_id, member_id)
);

-- 14. Servant Attendance for Meetings
CREATE TABLE IF NOT EXISTS public.servant_attendance (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    servant_id TEXT NOT NULL REFERENCES public.servants(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'excused', 'not_recorded')),
    excuse_reason TEXT,
    recorded_by UUID,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_modified_by UUID,
    last_modified_at TIMESTAMPTZ,
    UNIQUE(meeting_id, servant_id)
);

-- 15. Spiritual Follow-up (Liturgy, Communion, Sunday School)
CREATE TABLE IF NOT EXISTS public.spiritual_followups (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES public.served_members(id) ON DELETE CASCADE,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    liturgy_attendance TEXT NOT NULL DEFAULT 'not_recorded' CHECK (liturgy_attendance IN ('yes', 'no', 'not_recorded')),
    communion_attendance TEXT NOT NULL DEFAULT 'not_recorded' CHECK (communion_attendance IN ('yes', 'no', 'not_recorded')),
    sunday_school_attendance TEXT NOT NULL DEFAULT 'not_recorded' CHECK (sunday_school_attendance IN ('yes', 'no', 'not_recorded')),
    general_followup_status TEXT NOT NULL DEFAULT 'not_recorded' CHECK (general_followup_status IN ('yes', 'no', 'not_recorded')),
    notes TEXT,
    recorded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(member_id, date)
);

-- 16. Weekly Family Notebook / Report (الكشكول الإلكتروني)
CREATE TABLE IF NOT EXISTS public.weekly_reports (
    id TEXT PRIMARY KEY,
    meeting_id TEXT UNIQUE NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    family_id TEXT NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    academic_year_id TEXT NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
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
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'in_progress', 'submitted', 'under_review', 'returned_for_corrections', 'approved'
    )),
    submitted_at TIMESTAMPTZ,
    submitted_by UUID,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Weekly Report Status History
CREATE TABLE IF NOT EXISTS public.weekly_report_status_history (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.weekly_reports(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID NOT NULL,
    changed_by_name TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. Absence Alerts
CREATE TABLE IF NOT EXISTS public.absence_alerts (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES public.served_members(id) ON DELETE CASCADE,
    family_id TEXT NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    assigned_servant_id TEXT REFERENCES public.servants(id) ON DELETE SET NULL,
    consecutive_absences_count INT NOT NULL DEFAULT 0,
    last_attendance_date DATE,
    status TEXT NOT NULL DEFAULT 'pending_followup' CHECK (status IN ('pending_followup', 'in_progress', 'resolved', 'dismissed')),
    suggested_action TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. Followup Tasks
CREATE TABLE IF NOT EXISTS public.followup_tasks (
    id TEXT PRIMARY KEY,
    alert_id TEXT REFERENCES public.absence_alerts(id) ON DELETE SET NULL,
    member_id TEXT NOT NULL REFERENCES public.served_members(id) ON DELETE CASCADE,
    servant_id TEXT NOT NULL REFERENCES public.servants(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL CHECK (task_type IN ('phone_call', 'home_visit', 'in_church_chat', 'other')),
    notes TEXT,
    result TEXT CHECK (result IN ('successful_contact', 'no_answer', 'family_excuse', 'needs_priest_visit')),
    is_completed BOOLEAN NOT NULL DEFAULT false,
    due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id UUID,
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

