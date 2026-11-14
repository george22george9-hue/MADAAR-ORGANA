const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pWxtPoXTG5r6@ep-hidden-firefly-bb59lmp7-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Creating notifications table in Neon PostgreSQL...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id text PRIMARY KEY,
      target_type text NOT NULL DEFAULT 'all',
      target_id text,
      sender_id text,
      sender_name text NOT NULL,
      sender_role text NOT NULL,
      title text NOT NULL,
      message text NOT NULL,
      type text NOT NULL DEFAULT 'general',
      is_read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
  `);
  console.log('Notifications table ready in Neon!');
  await pool.end();
}

main().catch(err => {
  console.error('Failed to create notifications table:', err);
  process.exit(1);
});
