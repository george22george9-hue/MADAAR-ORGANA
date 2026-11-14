const { neon } = require('@neondatabase/serverless');
const { Pool } = require('pg');

const conn = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pWxtPoXTG5r6@ep-hidden-firefly-bb59lmp7-pooler.c-15.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function testPool() {
  const pool = new Pool({ connectionString: conn });
  const res = await pool.query('SELECT phone, full_name, role FROM users');
  console.log('Pool result:', res.rows);
  await pool.end();
}

async function testNeon() {
  const sql = neon(conn);
  const rows = await sql`SELECT phone, full_name, role FROM users`;
  console.log('Neon tagged template result:', rows);
}

async function run() {
  console.log('Testing Pool:');
  await testPool();
  console.log('Testing Neon:');
  await testNeon();
}

run();
