const Database = require('better-sqlite3');
const db = new Database('./data/organa.db');

console.log('--- BEFORE PURGE ---');
console.log('Users count:', db.prepare('SELECT count(*) as count FROM users').get().count);
console.log('Servants count:', db.prepare('SELECT count(*) as count FROM servants').get().count);
console.log('Family Servants count:', db.prepare('SELECT count(*) as count FROM family_servants').get().count);
console.log('Join Requests count:', db.prepare('SELECT count(*) as count FROM join_requests').get().count);

const purge = db.transaction(() => {
  // 1. Delete all fake users (servants and family leaders)
  const deletedUsers = db.prepare("DELETE FROM users WHERE role IN ('servant', 'family_leader')").run();
  console.log('Deleted fake users:', deletedUsers.changes);

  // 2. Delete all fake servants
  const deletedServants = db.prepare("DELETE FROM servants").run();
  console.log('Deleted fake servants:', deletedServants.changes);

  // 3. Delete all fake family_servants links
  const deletedFS = db.prepare("DELETE FROM family_servants").run();
  console.log('Deleted family_servants links:', deletedFS.changes);

  // 4. Reset leader_id to NULL for all 10 families
  const updatedFamilies = db.prepare("UPDATE families SET leader_id = NULL").run();
  console.log('Reset leader_id in families:', updatedFamilies.changes);

  // 5. Delete all test join requests
  const deletedReqs = db.prepare("DELETE FROM join_requests").run();
  console.log('Deleted join requests:', deletedReqs.changes);

  // 6. Delete dependent mock attendance/assignments referencing fake servants
  db.prepare("DELETE FROM servant_attendance").run();
  db.prepare("DELETE FROM meeting_activity_assignments").run();
  db.prepare("DELETE FROM followup_tasks").run();

  // 7. Ensure Admin and Leadership accounts are pristine
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, full_name, phone, role, assigned_family_id, is_active)
    VALUES 
      ('usr-admin', 'admin@organa.eg', 'إدارة المنظومة (مسؤول النظام)', '01000000000', 'admin', NULL, 1),
      ('usr-priest-daoud', 'priest.daoud@organa.eg', 'القمص داود جرجس', '01221234567', 'priest', NULL, 1),
      ('usr-priest-yohanna', 'priest.yohanna@organa.eg', 'القس يوحنا مرقس', '01229876543', 'priest', NULL, 1),
      ('usr-secretary-mina', 'secretary.mina@organa.eg', 'الشماس مينا عاطف', '01289876543', 'service_secretary', NULL, 1),
      ('usr-secretary-sameh', 'secretary.sameh@organa.eg', 'الخادم سامح شفيق', '01001122334', 'service_secretary', NULL, 1)
  `).run();
});

purge();

console.log('--- AFTER PURGE ---');
const remainingUsers = db.prepare('SELECT id, full_name, phone, role, is_active FROM users').all();
console.log('Remaining Users in DB:', remainingUsers);
console.log('Servants count:', db.prepare('SELECT count(*) as count FROM servants').get().count);
console.log('Join Requests count:', db.prepare('SELECT count(*) as count FROM join_requests').get().count);
