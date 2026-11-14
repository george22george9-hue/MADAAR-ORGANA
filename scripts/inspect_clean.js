const Database = require('better-sqlite3');
const db = new Database('./data/organa.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
console.log('Tables:', tables);

for (const t of ['users', 'servants', 'family_servants', 'join_requests', 'families']) {
  console.log(`Count in ${t}:`, db.prepare(`SELECT count(*) as count FROM ${t}`).get().count);
}
