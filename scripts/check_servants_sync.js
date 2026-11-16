const fs = require('fs');
const { Pool } = require('pg');

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
if (!match) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

async function check() {
  const users = await pool.query('SELECT id, full_name, phone, role FROM users');
  const servants = await pool.query('SELECT id, user_id, full_name, phone FROM servants');
  console.log('--- USERS ---');
  console.table(users.rows);
  console.log('--- SERVANTS ---');
  console.table(servants.rows);

  // Sync any mismatch now
  for (const u of users.rows) {
    const s = servants.rows.find(srv => srv.user_id === u.id || srv.phone === u.phone);
    if (s && s.full_name !== u.full_name) {
      console.log(`MISMATCH FOUND: user "${u.full_name}" != servant "${s.full_name}"`);
    }
  }

  await pool.end();
}

check().catch(console.error);
