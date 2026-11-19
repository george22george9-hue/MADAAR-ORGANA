const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/DATABASE_URL=([^ \r\n]+)/);
const pool = new Pool({ connectionString: match[1] });

async function backup() {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `organa_neon_backup_${timestamp}.json`);

  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);

  const backupData = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  for (const t of tables.rows) {
    const res = await pool.query(`SELECT * FROM ${t.table_name}`);
    backupData.tables[t.table_name] = res.rows;
    console.log(`Backed up table [${t.table_name}]: ${res.rows.length} rows`);
  }

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`\nFull database backup successfully saved to: ${backupFile}`);

  await pool.end();
}

backup().catch(console.error);
