const Database = require('better-sqlite3');
const db = new Database('./data/organa.db');

console.log('--- PURGING ALL USERS EXCEPT ADMIN ---');

const transaction = db.transaction(() => {
  // 1. Delete all users except usr-admin
  const del = db.prepare("DELETE FROM users WHERE id != 'usr-admin'").run();
  console.log('Deleted other users:', del.changes);

  // 2. Set Admin's phone and password exactly as requested
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

  // 3. Ensure no dangling servants or requests
  db.prepare("DELETE FROM servants").run();
  db.prepare("DELETE FROM family_servants").run();
  db.prepare("DELETE FROM join_requests").run();
  db.prepare("UPDATE families SET leader_id = NULL").run();
});

transaction();

const remaining = db.prepare('SELECT id, full_name, phone, role, password_hash, is_active FROM users').all();
console.log('Remaining Users in DB:', remaining);
