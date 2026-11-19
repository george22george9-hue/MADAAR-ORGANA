const fs = require('fs');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/DATABASE_URL=([^ \r\n]+)/);
const pool = new Pool({ connectionString: match[1] });

async function audit() {
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  console.log('Tables:', tables.rows.map(t => t.table_name));

  for (const t of tables.rows) {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [t.table_name]);
    console.log(`\n=== Table: ${t.table_name} ===`);
    console.log(cols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
  }
  await pool.end();
}
audit().catch(console.error);
