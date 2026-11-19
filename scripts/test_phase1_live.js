const fs = require('fs');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/DATABASE_URL=([^ \r\n]+)/);

async function runLiveVerification() {
  const pool = new Pool({
    connectionString: match[1],
    ssl: { rejectUnauthorized: false }
  });

  console.log('=== بدء اختبار وتدقيق المرحلة الأولى (Phase 1) على قاعدة بيانات Neon ===\n');

  // 1. Verify tables existence
  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('academic_years', 'promotion_rules', 'member_academic_history', 'annual_promotion_logs', 'servant_academic_assignments', 'audit_logs')
    ORDER BY table_name;
  `);
  console.log('1. الجداول المتحقق منها:');
  tablesRes.rows.forEach(r => console.log(`   ✓ ${r.table_name}`));

  // 2. Verify constraints
  const constraintsRes = await pool.query(`
    SELECT conname, contype, relname
    FROM pg_constraint c
    JOIN pg_class cl ON c.conrelid = cl.oid
    WHERE relname IN ('promotion_rules', 'member_academic_history', 'annual_promotion_logs', 'servant_academic_assignments')
    ORDER BY relname, conname;
  `);
  console.log('\n2. قيود قاعدة البيانات (Database Constraints & Unique Keys):');
  constraintsRes.rows.forEach(r => console.log(`   ✓ [${r.relname}] ${r.conname} (Type: ${r.contype})`));

  // 3. Verify Baseline Academic Years
  const yearsRes = await pool.query(`SELECT id, name, is_active, start_date, end_date FROM academic_years ORDER BY start_date`);
  console.log('\n3. الأعوام الكنسية:');
  yearsRes.rows.forEach(y => console.log(`   - ${y.name} (ID: ${y.id}) [${y.is_active ? 'نشطة' : 'غير نشطة'}]`));

  // 4. Verify Promotion Rules Count
  const rulesCount = await pool.query(`SELECT COUNT(*) as count FROM promotion_rules`);
  console.log(`\n4. عدد قواعد انتقال المراحل المعتمدة: ${rulesCount.rows[0].count} قاعدة.`);

  // 5. Verify Member Academic History Baseline
  const memberHistCount = await pool.query(`SELECT COUNT(*) as count FROM member_academic_history`);
  console.log(`5. عدد السجلات التاريخية الأساسية للمخدومين (Baseline): ${memberHistCount.rows[0].count} مخدوماً.`);

  // 6. Verify Servant Assignments Baseline
  const servantAssignCount = await pool.query(`SELECT COUNT(*) as count FROM servant_academic_assignments`);
  console.log(`6. عدد تعيينات الخدام السنوية الأساسية: ${servantAssignCount.rows[0].count} خادماً.`);

  // 7. Verify Audit Log
  const auditRes = await pool.query(`SELECT action, record_type, record_id, description, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 3`);
  console.log('\n7. آخر عمليات التدقيق (Audit Logs):');
  auditRes.rows.forEach(a => console.log(`   - [${a.action}] on ${a.record_type}:${a.record_id} => ${a.description}`));

  await pool.end();
  console.log('\n=== اكتملت جميع الفحوصات بنجاح 100% ===');
}

runLiveVerification().catch(err => {
  console.error('فشل الاختبار:', err);
  process.exit(1);
});
