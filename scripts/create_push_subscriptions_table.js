const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pWxtPoXTG5r6@ep-hidden-firefly-bb59lmp7-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('Creating push_subscriptions table in Neon PostgreSQL...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      endpoint text NOT NULL UNIQUE,
      p256dh text NOT NULL,
      auth text NOT NULL,
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_used_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_push_user_id ON push_subscriptions(user_id);
  `);
  console.log('push_subscriptions table ready in Neon PostgreSQL!');
  await pool.end();
}

main().catch(err => {
  console.error('Failed to create push_subscriptions table:', err);
  process.exit(1);
});
