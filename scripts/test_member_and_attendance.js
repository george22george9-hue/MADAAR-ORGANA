const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pWxtPoXTG5r6@ep-hidden-firefly-bb59lmp7-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Testing member insertion...');
  const memberId = `test-mem-${Date.now()}`;
  const code = `MEM-999`;
  await pool.query(`
    INSERT INTO served_members (
      id, code, full_name, gender, birth_date, stage, current_family_id,
      guardian_name, guardian_phone, guardian_relationship, phone, address,
      confession_father, national_id, academic_year_or_job, is_active, notes
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12,
      $13, $14, $15, true, $16
    )
  `, [
    memberId,
    code,
    'مخدوم تجريبي للتأكد',
    'male',
    '2013-05-15',
    'عام',
    'fam-prep-boys',
    'ولي أمر تجريبي',
    '01200000000',
    'الأب',
    '01200000000',
    'سندبيس',
    'أبونا الكاهن',
    null,
    'إعدادي',
    'ملاحظات تجريبية'
  ]);
  console.log('Member created successfully!');

  console.log('Testing meeting creation...');
  const meetingId = `test-mtg-${Date.now()}`;
  await pool.query(`
    INSERT INTO meetings (
      id, family_id, academic_year_id, date, title, start_time, end_time, status
    ) VALUES ($1, $2, 'ay-2026-2027', '2026-11-20', 'لقاء الجمعة التجريبي', '17:00', '19:00', 'scheduled')
  `, [meetingId, 'fam-prep-boys']);
  console.log('Meeting created successfully!');

  console.log('Testing attendance LEFT JOIN query...');
  const members = await pool.query(`
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
  `, [meetingId, 'fam-prep-boys']);
  console.log('Members count in meeting:', members.rows.length);
  console.log('Sample row:', members.rows[0]);

  console.log('Testing bulk attendance save...');
  await pool.query(`
    INSERT INTO meeting_attendance (
      id, meeting_id, member_id, status, attended_liturgy, attended_communion,
      attended_class, attended_confession, recorded_by, recorded_at
    ) VALUES ($1, $2, $3, 'present', 1, 1, 1, 0, 'جورج المشرف', now())
    ON CONFLICT (meeting_id, member_id) DO UPDATE SET
      status = EXCLUDED.status,
      attended_liturgy = EXCLUDED.attended_liturgy,
      last_modified_at = now()
  `, [`att-m-${meetingId}-${memberId}`, meetingId, memberId]);
  console.log('Attendance saved successfully!');

  // Cleanup test records
  console.log('Cleaning up test records...');
  await pool.query(`DELETE FROM meeting_attendance WHERE meeting_id = $1`, [meetingId]);
  await pool.query(`DELETE FROM meetings WHERE id = $1`, [meetingId]);
  await pool.query(`DELETE FROM served_members WHERE id = $1`, [memberId]);
  console.log('All tests passed cleanly and cleaned up!');

  await pool.end();
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
