const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'organa.db');
const db = new Database(dbPath);

console.log('Migrating database schema for Admin and Join Requests at:', dbPath);

db.pragma('foreign_keys = OFF');

// 1. Upgrade users table to support 'admin' role
db.exec(`
  CREATE TABLE IF NOT EXISTS users_new (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'priest', 'service_secretary', 'family_leader', 'servant')),
    avatar_url TEXT,
    assigned_family_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    password_hash TEXT DEFAULT 'organa2026',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (assigned_family_id) REFERENCES families(id) ON DELETE SET NULL
  );

  INSERT OR REPLACE INTO users_new (id, email, full_name, phone, role, avatar_url, assigned_family_id, is_active, password_hash, created_at, updated_at)
  SELECT id, email, full_name, phone, role, avatar_url, assigned_family_id, is_active, password_hash, created_at, updated_at FROM users;

  DROP TABLE users;
  ALTER TABLE users_new RENAME TO users;
`);

// 2. Create join_requests table
db.exec(`
  CREATE TABLE IF NOT EXISTS join_requests (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    password_hash TEXT DEFAULT 'organa2026',
    requested_role TEXT NOT NULL CHECK (requested_role IN ('family_leader', 'servant')),
    requested_family_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    reviewed_by_id TEXT,
    reviewed_by_name TEXT,
    reviewed_at TEXT,
    rejection_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (requested_family_id) REFERENCES families(id)
  );
`);

// 3. Insert or update Admin account
const adminExists = db.prepare('SELECT id FROM users WHERE id = ?').get('usr-admin');
if (!adminExists) {
  db.prepare(`
    INSERT INTO users (id, email, full_name, phone, role, avatar_url, is_active)
    VALUES ('usr-admin', 'admin@organa.eg', 'إدارة المنظومة (مسؤول النظام)', '01000000000', 'admin', '/avatars/admin.jpg', 1)
  `).run();
  console.log('[+] Created Admin user: usr-admin');
}

// 4. Seed sample pending join requests
const sampleRequests = [
  {
    id: 'req-1',
    name: 'الخادم جورج ماهر',
    phone: '01123456789',
    email: 'george.m@gmail.com',
    role: 'servant',
    familyId: 'fam-prep-boys',
    notes: 'خريج كلية صيدلة، خدمت سابقاً بمرحلة إعدادي وأرغب بالانضمام لأسرة إعدادي بنين.',
  },
  {
    id: 'req-2',
    name: 'الخادمة ليديا نبيل',
    phone: '01234567891',
    email: 'lydia.n@gmail.com',
    role: 'servant',
    familyId: 'fam-nursery',
    notes: 'معلمة رياض أطفال، أرغب بخدمة الترانيم والأنشطة بفصل حضانة وملائكة.',
  },
  {
    id: 'req-3',
    name: 'الخادم بيشوي عزت',
    phone: '01012345678',
    email: 'bishoy.e@gmail.com',
    role: 'family_leader',
    familyId: 'fam-pri1-2',
    notes: 'خادم أولى وثانية ابتدائي، أطلب تولي أمانة الأسرة بعد التنسيق مع أبونا الكاهن.',
  },
];

for (const req of sampleRequests) {
  const existingReq = db.prepare('SELECT id FROM join_requests WHERE id = ?').get(req.id);
  if (!existingReq) {
    db.prepare(`
      INSERT INTO join_requests (id, full_name, phone, email, requested_role, requested_family_id, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(req.id, req.name, req.phone, req.email, req.role, req.familyId, req.notes);
    console.log('[+] Added Pending Join Request:', req.name);
  }
}

db.pragma('foreign_keys = ON');

console.log('Migration successful!');
console.log('Roles now:', db.prepare('SELECT DISTINCT role FROM users').all());
console.log('Pending requests count:', db.prepare("SELECT COUNT(*) as c FROM join_requests WHERE status = 'pending'").get().c);
