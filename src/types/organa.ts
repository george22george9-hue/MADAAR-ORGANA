// ====================================================================
// ORGANA — Church Service & Sunday School Management Platform
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

export type UserRole = 'admin' | 'priest' | 'service_secretary' | 'family_leader' | 'servant';

export type FamilyType = 'children_class' | 'servants_group' | 'family_group';

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'not_recorded';

export type SpiritualStatus = 'yes' | 'no' | 'not_recorded';

export type ReportStatus = 
  | 'draft' 
  | 'in_progress' 
  | 'submitted' 
  | 'under_review' 
  | 'returned_for_corrections' 
  | 'approved';

export type ActivityResponsibility = 
  | 'main_presenter' 
  | 'assistant' 
  | 'lesson_preparer' 
  | 'presenter' 
  | 'organizer' 
  | 'tech_support' 
  | 'participant';

export type ParticipationStatus = 
  | 'assigned' 
  | 'participated' 
  | 'not_participated' 
  | 'unconfirmed';

export interface AcademicYear {
  id: string;
  name: string; // e.g. "2026–2027"
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChurchUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  assigned_family_id?: string | null; // For family_leader & servant
  assigned_stage?: string | null; // e.g. "أولى ثانوي", "تانية إعدادي"
  confession_father?: string;
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string; // e.g. "إعدادي بنين", "حضانة"
  type: FamilyType;
  leader_id?: string | null;
  leader_name?: string;
  academic_year_id: string;
  meeting_day?: string; // e.g. "Friday", "Sunday"
  meeting_time?: string; // e.g. "17:00"
  location?: string;
  description?: string;
  color_code?: string;
  stages?: string[];
  servants_count?: number;
  members_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Servant {
  id: string;
  user_id?: string | null;
  full_name: string;
  phone: string;
  photo_url?: string;
  national_id?: string;
  confession_father?: string;
  job_or_study?: string;
  joining_date: string;
  is_active: boolean;
  notes?: string;
  assigned_stage?: string | null;
  family_id?: string | null;
  family_name?: string | null;
  role_in_family?: string;
  // Computed / aggregated
  assigned_family_ids?: string[];
  assigned_family_names?: string[];
  attendance_rate?: number;
  activities_count?: number;
  lesson_prep_count?: number;
  lesson_explain_count?: number;
  created_at: string;
  updated_at: string;
}

export interface FamilyServantAssignment {
  id: string;
  family_id: string;
  servant_id: string;
  academic_year_id: string;
  role_in_family?: string; // e.g. "أمين مساعد", "مسؤول افتقاد"
  stage?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Guardian {
  id: string;
  full_name: string;
  relationship: string; // e.g. "Father", "Mother"
  phone: string;
  secondary_phone?: string;
  job?: string;
  address?: string;
  created_at: string;
}

export interface ServedMember {
  id: string;
  code: string; // e.g. "MEM-101"
  full_name: string;
  phone?: string;
  gender: 'male' | 'female';
  stage?: string;
  birth_date: string;
  national_id?: string;
  academic_year_or_job?: string;
  photo_url?: string;
  current_family_id: string;
  current_family_name?: string;
  assigned_servant_id?: string | null;
  assigned_servant_name?: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relationship?: string;
  address?: string;
  confession_father?: string;
  registration_date: string;
  is_active: boolean;
  notes?: string;
  // Computed stats
  consecutive_absences?: number;
  consecutive_missed_confessions?: number;
  confession_warning?: boolean;
  total_attendances?: number;
  attendance_rate?: number;
  present_count?: number;
  absent_count?: number;
  excused_count?: number;
  total_recorded?: number;
  liturgy_count?: number;
  communion_count?: number;
  confession_count?: number;
  last_attendance_date?: string | null;
  last_attendance_status?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberHistoryLog {
  id: string;
  member_id: string;
  event_type: 'family_transfer' | 'servant_assignment' | 'status_change' | 'note_added';
  from_value?: string;
  to_value?: string;
  description: string;
  academic_year_id: string;
  created_by: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  family_id: string;
  family_name?: string;
  academic_year_id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time?: string;
  lesson_title: string;
  lesson_topic: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  notes?: string;
  stage?: string;
  lesson_teacher_id?: string;
  completed_by?: string;
  completed_at?: string;
  cancellation_reason?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type MeetingServantRoleType = 
  | 'class_servant' 
  | 'lesson_teacher' 
  | 'opening_presenter' 
  | 'visual_aid_presenter' 
  | 'competition_leader' 
  | 'workshop_leader' 
  | 'other_participant';

export interface MeetingServantRole {
  id: string;
  meeting_id: string;
  servant_id: string;
  servant_name?: string;
  role_type: MeetingServantRoleType;
  stage?: string;
  notes?: string;
  created_at?: string;
}

export interface MeetingActivity {
  id: string;
  meeting_id: string;
  title: string; // e.g. "الفقرة الافتتاحية", "شرح الدرس", "ورشة العمل"
  description?: string;
  order_index: number;
  duration_minutes?: number;
  notes?: string;
  attachments?: string[];
  assignments?: MeetingActivityAssignment[];
  created_at: string;
}

export interface MeetingActivityAssignment {
  id: string;
  activity_id: string;
  servant_id: string;
  servant_name?: string;
  servant_phone?: string;
  responsibility: ActivityResponsibility;
  custom_responsibility_title?: string;
  assignment_status: 'assigned' | 'notified' | 'declined';
  participation_status: ParticipationStatus;
  notes?: string;
  created_at: string;
}

export interface MemberAttendanceRecord {
  id: string;
  meeting_id: string;
  member_id: string;
  member_name?: string;
  status: AttendanceStatus;
  excuse_reason?: string;
  attended_liturgy?: boolean | number;
  attended_communion?: boolean | number;
  attended_class?: boolean | number;
  attended_confession?: boolean | number;
  confession_father?: string;
  recorded_by: string;
  recorded_by_name?: string;
  recorded_at: string;
  last_modified_by?: string;
  last_modified_at?: string;
}

export interface ServantAttendanceRecord {
  id: string;
  meeting_id: string;
  servant_id: string;
  servant_name?: string;
  status: AttendanceStatus;
  excuse_reason?: string;
  did_opening?: boolean | number;
  did_workshop?: boolean | number;
  did_preparation?: boolean | number;
  did_lesson?: boolean | number;
  confession_father?: string;
  recorded_by: string;
  recorded_by_name?: string;
  recorded_at: string;
  last_modified_by?: string;
  last_modified_at?: string;
}

export interface SpiritualFollowupRecord {
  id: string;
  member_id: string;
  academic_year_id: string;
  date: string; // YYYY-MM-DD
  liturgy_attendance: SpiritualStatus; // قداس
  communion_attendance: SpiritualStatus; // تناول
  sunday_school_attendance: SpiritualStatus; // مدارس أحد
  general_followup_status: SpiritualStatus;
  notes?: string; // Strictly general, NO confession details!
  recorded_by: string;
  recorded_by_name?: string;
  created_at: string;
}

export interface WeeklyNotebookReport {
  id: string;
  meeting_id: string;
  family_id: string;
  family_name?: string;
  academic_year_id: string;
  meeting_date: string;
  lesson_title: string;
  lesson_topic: string;
  // Stats
  total_members_count: number;
  present_members_count: number;
  absent_members_count: number;
  excused_members_count: number;
  total_servants_count: number;
  present_servants_count: number;
  // Content details
  opening_paragraph_notes?: string;
  lesson_prep_servants?: string[];
  lesson_explain_servants?: string[];
  visual_aid_notes?: string;
  workshop_notes?: string;
  competition_notes?: string;
  general_notes?: string;
  followup_requirements?: string;
  // Workflow
  status: ReportStatus;
  submitted_at?: string;
  submitted_by?: string;
  submitted_by_name?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  review_notes?: string; // Feedback when returned or approved
  created_at: string;
  updated_at: string;
}

export interface WeeklyReportStatusLog {
  id: string;
  report_id: string;
  from_status?: ReportStatus;
  to_status: ReportStatus;
  changed_by: string;
  changed_by_name: string;
  comment?: string;
  created_at: string;
}

export type AbsenceAlertType = 'consecutive' | 'sudden_drop' | 'chronic' | 'never_attended';

export type AbsenceRiskCategory =
  | 'consecutive'
  | 'sudden_drop'
  | 'intermittent'
  | 'stopped_regular'
  | 'no_history'
  | 'new_member';

export type AttendanceTrend = 'stable' | 'improving' | 'declining' | 'critical' | 'unknown';

export interface AbsenceEngineThresholds {
  consecutiveAbsenceWarning: number; // default 2
  consecutiveAbsenceCritical: number; // default 3
  suddenDropThresholdPct: number; // default 40 (%)
  intermittentAbsencePct: number; // default 40 (%)
  regularMemberMinAttendancePct: number; // default 75 (%)
  newMemberDaysThreshold: number; // default 45 (days)
  minimumCompletedMeetingsForPattern: number; // default 4
}

export interface AbsenceAlert {
  id: string;
  member_id: string;
  member_name: string;
  family_id: string;
  family_name: string;
  academic_year_id?: string;
  assigned_servant_id?: string;
  assigned_servant_name?: string;
  consecutive_absences_count: number;
  last_attendance_date?: string;
  status: 'pending_followup' | 'in_progress' | 'resolved' | 'dismissed';
  alert_type?: AbsenceAlertType;
  risk_category?: AbsenceRiskCategory;
  priority_score?: number;
  detection_reason?: string;
  attendance_trend?: AttendanceTrend;
  suggested_action?: string;
  suggested_servant_id?: string;
  suggested_servant_name?: string;
  servant_workload_count?: number;
  is_unassigned?: boolean;
  resolved_reason?: string;
  resolved_by?: string;
  resolved_at?: string;
  dismissed_reason?: string;
  dismissed_by?: string;
  dismissed_at?: string;
  created_at: string;
}

export type FollowupWorkflowStatus = 
  | 'open' 
  | 'assigned' 
  | 'contact_attempted' 
  | 'awaiting_followup' 
  | 'completed' 
  | 'closed';

export type FollowupPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface FollowupContactLog {
  id: string;
  task_id: string;
  servant_id: string;
  servant_name?: string;
  contact_date: string;
  contact_time?: string;
  contact_method: 'phone' | 'whatsapp' | 'home_visit' | 'church_talk' | 'other';
  outcome: string;
  notes?: string;
  next_followup_date?: string;
  is_correction?: boolean;
  correction_for_id?: string;
  correction_reason?: string;
  created_at: string;
  created_by: string;
}

export type VisitationMethod = 'home_visit' | 'phone_call' | 'church_meeting';

export interface PastoralVisitation {
  id: string;
  member_id: string;
  member_name?: string;
  member_code?: string;
  member_stage?: string;
  guardian_name?: string;
  guardian_phone?: string;
  address?: string;
  member_gender?: 'male' | 'female';
  family_id?: string;
  family_name?: string;
  visitation_date: string;
  method: VisitationMethod;
  servant_ids: string[];
  servant_names: string[];
  notes: string;
  recorded_by_id?: string;
  recorded_by_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface FollowupTask {
  id: string;
  alert_id?: string;
  academic_year_id?: string;
  family_id?: string;
  member_id: string;
  member_name: string;
  servant_id: string;
  servant_name?: string;
  responsible_family_leader_id?: string;
  task_type: 'phone_call' | 'home_visit' | 'in_church_chat' | 'other';
  workflow_status?: FollowupWorkflowStatus;
  priority?: FollowupPriority;
  notes?: string;
  result?: 'successful_contact' | 'no_answer' | 'family_excuse' | 'needs_priest_visit' | string;
  is_completed: boolean;
  due_date: string;
  last_contact_date?: string;
  next_followup_date?: string;
  closed_reason?: string;
  closed_by?: string;
  closed_at?: string;
  completed_at?: string;
  created_at: string;
  contact_logs?: FollowupContactLog[];
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  action: string; // e.g. "CREATE_MEMBER", "UPDATE_ATTENDANCE", "SUBMIT_REPORT"
  record_type: string; // e.g. "served_member", "meeting", "weekly_report"
  record_id: string;
  description: string;
  previous_value?: string;
  new_value?: string;
  ip_address?: string;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  church_name_ar: string;
  church_name_en: string;
  consecutive_absence_threshold: number;
  active_academic_year_id: string;
  servant_can_view_all_family_members: boolean;
  allow_servant_attendance_recording: boolean;
  created_at: string;
  updated_at: string;
}

export interface JoinRequest {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  password_hash?: string;
  requested_role: 'family_leader' | 'servant';
  requested_family_id: string;
  requested_family_name?: string;
  requested_stage?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  confession_father?: string;
  national_id?: string;
  job_or_study?: string;
  address?: string;
  birth_date?: string;
  notes?: string;
  reviewed_by_id?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ChurchNotification {
  id: string;
  target_type: 'all' | 'servants' | 'family' | 'user';
  target_id?: string;
  sender_id?: string;
  sender_name: string;
  sender_role: string;
  title: string;
  message: string;
  type: 'priest_broadcast' | 'tuesday_prep' | 'servant_absence' | 'general';
  is_read: boolean;
  created_at: string;
}

export interface PromotionRule {
  id: string;
  from_family_id: string;
  from_family_name?: string;
  from_stage: string;
  to_family_id?: string | null;
  to_family_name?: string | null;
  to_stage?: string | null;
  is_graduation: boolean;
  action_type?: 'promote' | 'graduate' | 'retain' | 'stop';
  notes?: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface MemberAcademicHistory {
  id: string;
  member_id: string;
  academic_year_id: string;
  academic_year_name?: string;
  family_id: string;
  family_name?: string;
  stage?: string | null;
  servant_id?: string | null;
  servant_name?: string | null;
  code: string;
  status: 'active' | 'promoted' | 'retained' | 'graduated' | 'transferred' | 'stopped';
  notes?: string | null;
  attendance_rate?: number;
  created_at: string;
}

export interface AnnualPromotionLog {
  id: string;
  from_academic_year_id: string;
  from_academic_year_name?: string;
  to_academic_year_id: string;
  to_academic_year_name?: string;
  total_eligible: number;
  promoted_count: number;
  graduated_count: number;
  retained_count: number;
  exceptions_count: number;
  executed_by: string;
  executed_by_name: string;
  executed_at: string;
  status: 'completed' | 'rolled_back';
  snapshot_data?: any;
}

export interface ServantAcademicAssignment {
  id: string;
  servant_id: string;
  servant_name?: string;
  servant_phone?: string;
  academic_year_id: string;
  academic_year_name?: string;
  family_id: string;
  family_name?: string;
  stage?: string | null;
  role_in_family: string; // 'أمين أسرة' | 'أمين مساعد' | 'خادم مسؤول' | 'خادم مساعد'
  is_active: boolean;
  created_at?: string;
}

export interface PromotionPreviewItem {
  member_id: string;
  full_name: string;
  member_name?: string;
  current_code: string;
  current_family_id: string;
  current_family_name: string;
  current_stage: string;
  current_servant_id?: string | null;
  current_servant_name?: string | null;
  target_family_id?: string | null;
  target_family_name?: string | null;
  target_stage?: string | null;
  target_code?: string;
  target_servant_id?: string | null;
  target_servant_name?: string | null;
  status: 'promote' | 'graduate' | 'retain' | 'exception_needed' | string;
  proposed_status?: string;
  is_exception?: boolean;
  exception_reason?: string;
  custom_decision?: {
    family_id?: string;
    stage?: string;
    servant_id?: string;
    action?: 'promote' | 'retain' | 'graduate' | 'stop' | 'transfer';
    notes?: string;
  };
}

export interface AnnualPromotionPreview {
  fromYear: AcademicYear;
  toYear: AcademicYear;
  alreadyPromoted: boolean;
  totalMembers: number;
  promotedCount: number;
  graduatedCount: number;
  retainedCount: number;
  exceptionsCount: number;
  items: PromotionPreviewItem[];
}

