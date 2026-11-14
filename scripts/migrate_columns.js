const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pWxtPoXTG5r6@ep-hidden-firefly-bb59lmp7-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('Migrating Neon columns...');
  await pool.query(`
    ALTER TABLE join_requests
      ADD COLUMN IF NOT EXISTS password_hash text,
      ADD COLUMN IF NOT EXISTS confession_father text,
      ADD COLUMN IF NOT EXISTS national_id text,
      ADD COLUMN IF NOT EXISTS job_or_study text,
      ADD COLUMN IF NOT EXISTS address text,
      ADD COLUMN IF NOT EXISTS birth_date text;

    ALTER TABLE served_members
      ADD COLUMN IF NOT EXISTS phone text,
      ADD COLUMN IF NOT EXISTS stage text DEFAULT 'عام',
      ADD COLUMN IF NOT EXISTS national_id text,
      ADD COLUMN IF NOT EXISTS academic_year_or_job text;
  `);
  console.log('Migration successful!');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
