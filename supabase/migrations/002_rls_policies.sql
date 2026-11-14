-- ====================================================================
-- ORGANA — Row Level Security (RLS) Policies
-- The Great Martyr St. George Church – Sandbees, Egypt
-- ====================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_servants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.served_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_activity_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servant_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spiritual_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_report_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions to get current user role and assigned family
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_family_id()
RETURNS TEXT AS $$
    SELECT assigned_family_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. ACADEMIC YEARS & SETTINGS: Read by authenticated, write by priest & secretary
CREATE POLICY "Public read academic years" ON public.academic_years
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin manage academic years" ON public.academic_years
    FOR ALL TO authenticated USING (public.get_auth_role() IN ('priest', 'service_secretary'));

CREATE POLICY "Public read settings" ON public.system_settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Priest manage settings" ON public.system_settings
    FOR ALL TO authenticated USING (public.get_auth_role() = 'priest');

-- 3. FAMILIES:
-- Priest & Secretary: view all, manage all
-- Family Leader: view own family, update own family details
-- Servant: view assigned family
CREATE POLICY "View families" ON public.families
    FOR SELECT TO authenticated USING (
        public.get_auth_role() IN ('priest', 'service_secretary')
        OR id = public.get_auth_family_id()
        OR id IN (SELECT family_id FROM public.family_servants WHERE servant_id IN (SELECT id FROM public.servants WHERE user_id = auth.uid()))
    );

CREATE POLICY "Manage families" ON public.families
    FOR ALL TO authenticated USING (public.get_auth_role() IN ('priest', 'service_secretary'));

-- 4. SERVED MEMBERS (CRITICAL ISOLATION):
-- Priest & Secretary: view all, manage all
-- Family Leader: view & manage members in own family
-- Servant: view members in assigned family (or specifically assigned members)
CREATE POLICY "View served members" ON public.served_members
    FOR SELECT TO authenticated USING (
        public.get_auth_role() IN ('priest', 'service_secretary')
        OR current_family_id = public.get_auth_family_id()
        OR (public.get_auth_role() = 'servant' AND (
            assigned_servant_id IN (SELECT id FROM public.servants WHERE user_id = auth.uid())
            OR (SELECT servant_can_view_all_family_members FROM public.system_settings WHERE id = 'default') = true
        ))
    );

CREATE POLICY "Leader manage family members" ON public.served_members
    FOR INSERT TO authenticated WITH CHECK (
        public.get_auth_role() IN ('priest', 'service_secretary')
        OR current_family_id = public.get_auth_family_id()
    );

CREATE POLICY "Leader update family members" ON public.served_members
    FOR UPDATE TO authenticated USING (
        public.get_auth_role() IN ('priest', 'service_secretary')
        OR current_family_id = public.get_auth_family_id()
    );

-- 5. MEETINGS & ACTIVITIES:
-- Family Leader can create, edit, delete within their own family
-- Priest & Secretary can view and manage all
-- Servant can view meetings in their family
CREATE POLICY "View meetings" ON public.meetings
    FOR SELECT TO authenticated USING (
        public.get_auth_role() IN ('priest', 'service_secretary')
        OR family_id = public.get_auth_family_id()
    );

CREATE POLICY "Manage meetings" ON public.meetings
    FOR ALL TO authenticated USING (
        public.get_auth_role() IN ('priest', 'service_secretary')
        OR family_id = public.get_auth_family_id()
    );

-- 6. ATTENDANCE:
CREATE POLICY "View attendance" ON public.meeting_attendance
    FOR SELECT TO authenticated USING (
        public.get_auth_role() IN ('priest', 'service_secretary')
        OR meeting_id IN (SELECT id FROM public.meetings WHERE family_id = public.get_auth_family_id())
    );

CREATE POLICY "Record attendance" ON public.meeting_attendance
    FOR ALL TO authenticated USING (
        public.get_auth_role() IN ('priest', 'service_secretary')
        OR meeting_id IN (SELECT id FROM public.meetings WHERE family_id = public.get_auth_family_id())
        OR (public.get_auth_role() = 'servant' AND (SELECT allow_servant_attendance_recording FROM public.system_settings WHERE id = 'default') = true)
    );

-- 7. WEEKLY REPORTS (الكشكول الإلكتروني):
-- Family Leader can edit only when in 'draft' or 'returned_for_corrections'
-- Service Secretary & Priest can review, return, approve
CREATE POLICY "View reports" ON public.weekly_reports
    FOR SELECT TO authenticated USING (
        public.get_auth_role() IN ('priest', 'service_secretary')
        OR family_id = public.get_auth_family_id()
    );

CREATE POLICY "Manage reports" ON public.weekly_reports
    FOR UPDATE TO authenticated USING (
        public.get_auth_role() IN ('priest', 'service_secretary')
        OR (
            family_id = public.get_auth_family_id() 
            AND status IN ('draft', 'in_progress', 'returned_for_corrections')
        )
    );

-- 8. AUDIT LOGS: Read-only by Priest
CREATE POLICY "Priest view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.get_auth_role() = 'priest');

CREATE POLICY "Insert audit logs" ON public.audit_logs
    FOR INSERT TO authenticated WITH CHECK (true);

