const Database = require('better-sqlite3');
const db = new Database('./data/organa.db');

for (const t of ['servant_attendance', 'meeting_activity_assignments', 'followup_tasks', 'meeting_attendance', 'weekly_reports']) {
  console.log(`Count in ${t}:`, db.prepare(`SELECT count(*) as count FROM ${t}`).get().count);
}
