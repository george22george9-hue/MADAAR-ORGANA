const fs = require('fs');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/DATABASE_URL=([^ \r\n]+)/);

async function inspect() {
  const pool = new Pool({ connectionString: match[1], ssl: { rejectUnauthorized: false } });

  // 1. All tables and row counts
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log(`=== إجمالي الجداول في قاعدة البيانات: ${tables.rows.length} جدول ===`);
  for (const t of tables.rows) {
    const countRes = await pool.query(`SELECT COUNT(*) as cnt FROM "${t.table_name}"`);
    console.log(`- ${t.table_name}: ${countRes.rows[0].cnt} صف`);
  }

  // 2. All Foreign Keys
  const fks = await pool.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name, kcu.column_name;
  `);

  console.log(`\n=== إجمالي علاقات الربط (Foreign Keys): ${fks.rows.length} علاقة ===`);
  fks.rows.forEach(r => {
    console.log(`- [${r.table_name}.${r.column_name}] -> [${r.foreign_table_name}.${r.foreign_column_name}] (${r.constraint_name})`);
  });

  await pool.end();
}

inspect().catch(console.error);
