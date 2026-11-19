const fs = require('fs');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/DATABASE_URL=([^ \r\n]+)/);
const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

async function cleanup() {
  console.log('--- Cleaning up test schemas and restoring public search_path ---');
  
  // 1. Drop the test schema completely
  await pool.query('DROP SCHEMA IF EXISTS sandbox_test_phase2_3 CASCADE');
  console.log('✅ Dropped schema sandbox_test_phase2_3 CASCADE');

  // 2. Set default search path for database and role to public
  await pool.query('ALTER DATABASE neondb SET search_path TO public');
  console.log('✅ Altered database neondb SET search_path TO public');

  await pool.query('ALTER ROLE neondb_owner SET search_path TO public');
  console.log('✅ Altered role neondb_owner SET search_path TO public');

  // 3. Reset session search path
  await pool.query('SET search_path = public');
  console.log('✅ Set session search_path = public');

  // 4. Verify search path
  const sp = await pool.query('SHOW search_path');
  console.log('Current search_path:', sp.rows[0].search_path);

  // 5. Verify schemas remaining
  const schemas = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE '%sandbox%'");
  console.log('Remaining sandbox schemas:', schemas.rows);

  // 6. Verify families from default query
  const fams = await pool.query('SELECT id, name FROM families ORDER BY id ASC');
  console.log('Clean Families list (' + fams.rows.length + '):');
  fams.rows.forEach(f => console.log(`   - ${f.id}: ${f.name}`));

  // 7. Verify absence alerts from default query
  const alerts = await pool.query('SELECT count(*) as cnt FROM absence_alerts');
  console.log('Absence alerts count in production:', alerts.rows[0].cnt);

  await pool.end();
}

cleanup().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
