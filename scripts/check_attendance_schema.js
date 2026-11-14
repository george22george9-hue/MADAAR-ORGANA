const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pWxtPoXTG5r6@ep-hidden-firefly-bb59lmp7-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});
async function main() {
  for (const t of ['meetings', 'meeting_attendance', 'servant_attendance']) {
    const res = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1", [t]);
    console.log(`=== ${t} ===`);
    console.log(res.rows);
  }
  await pool.end();
}
main().catch(console.error);
