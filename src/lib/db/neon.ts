// ====================================================================
// ORGANA Neon Cloud PostgreSQL Client
// The Great Martyr St. George Church – Sandbees, Egypt
// Developed by MADAAR Technologies
// ====================================================================

import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __organa_pg_pool: Pool | undefined;
}

const DEFAULT_NEON_URL =
  'postgresql://neondb_owner:npg_pWxtPoXTG5r6@ep-hidden-firefly-bb59lmp7-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require';

export function getPgPool(): Pool | null {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    DEFAULT_NEON_URL;

  if (!connectionString) {
    return null;
  }

  if (global.__organa_pg_pool) {
    return global.__organa_pg_pool;
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    global.__organa_pg_pool = pool;
  }

  return pool;
}

export async function queryPg<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const pool = getPgPool();
  if (!pool) {
    throw new Error('DATABASE_URL is not configured');
  }
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function queryOnePg<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await queryPg<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}
