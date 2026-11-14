const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pWxtPoXTG5r6@ep-hidden-firefly-bb59lmp7-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const user = (await pool.query('SELECT * FROM users WHERE phone = $1', ['01202074649'])).rows[0];
  console.log('User found:', user.full_name, user.phone, user.role);
  console.log('Stored hash:', user.password_hash);

  const correctMatch = await bcrypt.compare('George-O229', user.password_hash);
  console.log('Correct password test:', correctMatch ? 'PASS ✅' : 'FAIL ❌');

  const wrongMatch = await bcrypt.compare('WrongPassword123', user.password_hash);
  console.log('Wrong password test (should be false):', !wrongMatch ? 'PASS ✅' : 'FAIL ❌');

  await pool.end();
}

main().catch(console.error);
