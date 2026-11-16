const fs = require('fs');
const { Pool } = require('pg');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
if (!match) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

async function syncAll() {
  const users = await pool.query('SELECT id, full_name, phone FROM users');
  for (const u of users.rows) {
    const res = await pool.query(
      `UPDATE servants 
       SET full_name = $1, user_id = COALESCE(user_id, $2), phone = $3, updated_at = now()
       WHERE user_id = $2 OR phone = $3
       RETURNING id, full_name`,
      [u.full_name, u.id, u.phone]
    );
    if (res.rowCount > 0) {
      console.log(`Synced user "${u.full_name}" -> servant:`, res.rows);
    }
  }
  console.log('Sync complete!');
  await pool.end();
}

syncAll().catch(console.error);
