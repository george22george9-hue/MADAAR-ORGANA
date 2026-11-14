const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data', 'organa.db'));

console.log('--- PURGING ALL DEMO / FAKE DATA ---');

db.transaction(() => {
  // 1. Delete all demo users
  const delUsers = db.prepare(`
    DELETE FROM users 
    WHERE id != 'usr-admin' 
      AND (
        id LIKE 'usr-priest-%' 
        OR id LIKE 'usr-secretary-%' 
        OR id LIKE 'usr-leader-%' 
        OR id LIKE 'usr-servant-%'
        OR phone IN ('01221234567', '01229876543', '01289876543', '01001122334', '01011112222', '01033331111', '01044442222', '01055553333', '01004567890', '01233334444', '01288884444', '01299995555', '01077771111', '01088882222', '01112345678', '01022223333', '01155556666', '01066667777', '01099990000', '01211113333', '01244445555', '01277778888')
      )
  `).run();
  console.log('Deleted demo users:', delUsers.changes);

  // 2. Delete all demo servants
  const delServants = db.prepare(`
    DELETE FROM servants 
    WHERE id LIKE 'srv-%' 
       OR phone IN ('01112345678', '01022223333', '01155556666', '01066667777', '01099990000', '01211113333', '01244445555', '01277778888')
  `).run();
  console.log('Deleted demo servants:', delServants.changes);

  // 3. Delete all demo join requests
  const delRequests = db.prepare(`
    DELETE FROM join_requests 
    WHERE id LIKE 'req-seed-%' 
       OR phone IN ('01098765432', '01234567890', '01122334455', '01555667788')
  `).run();
  console.log('Deleted demo requests:', delRequests.changes);

  // 4. Reset family leaders if they were demo leaders
  const resetLeaders = db.prepare(`
    UPDATE families SET leader_id = NULL 
    WHERE leader_id LIKE 'usr-leader-%'
  `).run();
  console.log('Reset demo leaders:', resetLeaders.changes);
})();

const users = db.prepare('SELECT id, full_name, phone, role FROM users').all();
const reqs = db.prepare('SELECT id, full_name, phone, status FROM join_requests').all();
const servants = db.prepare('SELECT id, full_name, phone FROM servants').all();

console.log('Active Users remaining:', users);
console.log('Requests remaining:', reqs);
console.log('Servants remaining:', servants);
