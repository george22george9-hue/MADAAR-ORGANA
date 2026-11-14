const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pWxtPoXTG5r6@ep-hidden-firefly-bb59lmp7-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Hashing admin password with bcrypt...');
  const hash = await bcrypt.hash('George-O229', 10);
  console.log('Generated hash:', hash);

  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, 'usr-admin']);
  console.log('Admin password securely hashed in Neon database!');

  // Test verify
  const user = (await pool.query('SELECT password_hash FROM users WHERE id = $1', ['usr-admin'])).rows[0];
  const isMatch = await bcrypt.compare('George-O229', user.password_hash);
  console.log('Verification test result:', isMatch);

  await pool.end();
}

main().catch(console.error);
