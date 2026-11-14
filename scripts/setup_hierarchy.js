// ====================================================================
// ORGANA Church Hierarchy & Multi-User Setup Script
// Sets up:
// 1. Multiple Priests (القمص داود جرجس + القس يوحنا مرقس)
// 2. Two Service Secretaries (الشماس مينا عاطف + الخادم سامح شفيق)
// 3. Family Leaders for all 10 Families
// 4. Servants attached to families
// ====================================================================

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'organa.db');
const db = new Database(dbPath);

console.log('Connecting to ORGANA database at:', dbPath);

db.pragma('foreign_keys = OFF');

// 1. Multiple Priests
const priests = [
  { id: 'usr-priest-daoud', name: 'القمص داود جرجس', email: 'priest@organa.eg', phone: '01221234567' },
  { id: 'usr-priest-yohanna', name: 'القس يوحنا مرقس', email: 'yohanna@organa.eg', phone: '01229876543' },
];

for (const p of priests) {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(p.id);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (id, email, full_name, phone, role, avatar_url, is_active)
      VALUES (?, ?, ?, ?, 'priest', '/avatars/priest.jpg', 1)
    `).run(p.id, p.email, p.name, p.phone);
    console.log('[+] Added Priest:', p.name);
  }
}

// 2. Two Service Secretaries
const secretaries = [
  { id: 'usr-secretary-mina', name: 'الشماس مينا عاطف', email: 'secretary@organa.eg', phone: '01289876543' },
  { id: 'usr-secretary-sameh', name: 'الخادم سامح شفيق', email: 'sameh@organa.eg', phone: '01001122334' },
];

for (const s of secretaries) {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(s.id);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (id, email, full_name, phone, role, avatar_url, is_active)
      VALUES (?, ?, ?, ?, 'service_secretary', '/avatars/mina.jpg', 1)
    `).run(s.id, s.email, s.name, s.phone);
    console.log('[+] Added Service Secretary:', s.name);
  }
}

// 3. Leaders for all 10 Families
const familyLeaders = [
  { id: 'usr-leader-samir', name: 'الخادم سمير يوسف', email: 'samir@organa.eg', phone: '01011112222', fam: 'fam-nursery' },
  { id: 'usr-leader-yohanna-r', name: 'الخادم يوحنا رضا', email: 'yohanna.r@organa.eg', phone: '01033331111', fam: 'fam-pri1-2' },
  { id: 'usr-leader-emil', name: 'الخادم إميل فخري', email: 'emil@organa.eg', phone: '01044442222', fam: 'fam-pri3-4' },
  { id: 'usr-leader-fady-r', name: 'الخادم فادي رفعت', email: 'fady.r@organa.eg', phone: '01055553333', fam: 'fam-pri5-6' },
  { id: 'usr-leader-mark', name: 'الخادم مارك مجدي', email: 'leader.ebn@organa.eg', phone: '01004567890', fam: 'fam-prep-boys' },
  { id: 'usr-leader-mary', name: 'الخادمة مريم فؤاد', email: 'mary@organa.eg', phone: '01233334444', fam: 'fam-prep-girls' },
  { id: 'usr-leader-ramy', name: 'الخادم رامي إسكندر', email: 'ramy@organa.eg', phone: '01288884444', fam: 'fam-sec' },
  { id: 'usr-leader-kirollos-s', name: 'الشماس كيرلس صبحي', email: 'kirollos.s@organa.eg', phone: '01299995555', fam: 'fam-servant-prep' },
  { id: 'usr-leader-emad', name: 'الخادم عماد شكري', email: 'emad@organa.eg', phone: '01077771111', fam: 'fam-servants' },
  { id: 'usr-leader-george', name: 'الخادم جورج عوض', email: 'george.a@organa.eg', phone: '01088882222', fam: 'fam-couples' },
];

for (const fl of familyLeaders) {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(fl.id);
  if (!existing) {
    db.prepare(`
      INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, is_active)
      VALUES (?, ?, ?, ?, 'family_leader', ?, 1)
    `).run(fl.id, fl.email, fl.name, fl.phone, fl.fam);
    console.log('[+] Added Family Leader:', fl.name);
  } else {
    db.prepare('UPDATE users SET assigned_family_id = ?, role = ? WHERE id = ?').run(fl.fam, 'family_leader', fl.id);
  }

  // Link family
  db.prepare('UPDATE families SET leader_id = ? WHERE id = ?').run(fl.id, fl.fam);
}

// 4. Servants per family
const servants = [
  // إعدادي بنين
  { id: 'srv-peter', userId: 'usr-servant-peter', name: 'الخادم بيتر ناصر', phone: '01112345678', fam: 'fam-prep-boys', role: 'خادم ومسؤول افتقاد' },
  { id: 'srv-andrew', userId: 'usr-servant-andrew', name: 'الخادم أندرو نبيل', phone: '01022223333', fam: 'fam-prep-boys', role: 'خادم نشاط وورش' },
  { id: 'srv-fady', userId: 'usr-servant-fady', name: 'الخادم فادي سمير', phone: '01155556666', fam: 'fam-prep-boys', role: 'خادم درس ووسائل إيضاح' },
  { id: 'srv-john', userId: 'usr-servant-john', name: 'الخادم جون هاني', phone: '01066667777', fam: 'fam-prep-boys', role: 'خادم علاقات ومتابعة' },
  // إعدادي بنات
  { id: 'srv-sarah', userId: 'usr-servant-sarah', name: 'الخادمة سارة عماد', phone: '01099990000', fam: 'fam-prep-girls', role: 'خادمة ومسؤولة ألحان' },
  { id: 'srv-irene', userId: 'usr-servant-irene', name: 'الخادمة إيريني سمير', phone: '01211113333', fam: 'fam-prep-girls', role: 'خادمة نشاط' },
  // حضانة
  { id: 'srv-monica', userId: 'usr-servant-monica', name: 'الخادمة مونيكا ماهر', phone: '01244445555', fam: 'fam-nursery', role: 'معلمة ترانيم' },
  // ثانوي
  { id: 'srv-kirollos', userId: 'usr-servant-kirollos', name: 'الخادم كيرلس صبحي', phone: '01277778888', fam: 'fam-sec', role: 'خادم ثانوي ومسؤول مسرح' },
];

for (const s of servants) {
  // Ensure user exists
  const uExists = db.prepare('SELECT id FROM users WHERE id = ?').get(s.userId);
  if (!uExists) {
    db.prepare(`
      INSERT INTO users (id, email, full_name, phone, role, assigned_family_id, is_active)
      VALUES (?, ?, ?, ?, 'servant', ?, 1)
    `).run(s.userId, s.id + '@organa.eg', s.name, s.phone, s.fam);
    console.log('[+] Added User Servant:', s.name);
  }

  // Ensure servant profile exists
  const sExists = db.prepare('SELECT id FROM servants WHERE id = ?').get(s.id);
  if (!sExists) {
    db.prepare(`
      INSERT INTO servants (id, user_id, full_name, phone, joining_date, is_active)
      VALUES (?, ?, ?, ?, '2022-09-01', 1)
    `).run(s.id, s.userId, s.name, s.phone);
  }

  // Ensure family_servants assignment exists
  const fsExists = db.prepare('SELECT id FROM family_servants WHERE family_id = ? AND servant_id = ?').get(s.fam, s.id);
  if (!fsExists) {
    db.prepare(`
      INSERT INTO family_servants (id, family_id, servant_id, academic_year_id, role_in_family, is_active)
      VALUES (?, ?, ?, 'ay-2026-2027', ?, 1)
    `).run('fsa-' + s.id + '-' + s.fam, s.fam, s.id, s.role);
    console.log('[+] Assigned Servant:', s.name, 'to', s.fam);
  }
}

db.pragma('foreign_keys = ON');

console.log('✅ Church hierarchy setup complete!');
console.log('Total Priests:', db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'priest'").get().c);
console.log('Total Secretaries:', db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'service_secretary'").get().c);
console.log('Total Family Leaders:', db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'family_leader'").get().c);
console.log('Total Servants:', db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'servant'").get().c);
