const fs = require('fs');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/DATABASE_URL=([^ \r\n]+)/);
const pool = new Pool({ connectionString: match[1] });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Starting Phase 1 Database Migration in a Transaction...');

    // 1. promotion_rules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS promotion_rules (
        id TEXT PRIMARY KEY,
        from_family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        from_stage TEXT NOT NULL,
        to_family_id TEXT REFERENCES families(id) ON DELETE SET NULL,
        to_stage TEXT,
        is_graduation BOOLEAN DEFAULT false,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uk_rule_from UNIQUE(from_family_id, from_stage)
      );
    `);
    console.log('Created table [promotion_rules].');

    // 2. member_academic_history table (Permanent member identity with yearly records)
    await client.query(`
      CREATE TABLE IF NOT EXISTS member_academic_history (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES served_members(id) ON DELETE CASCADE,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        stage TEXT,
        servant_id TEXT REFERENCES servants(id) ON DELETE SET NULL,
        code TEXT NOT NULL,
        status TEXT DEFAULT 'active', -- 'active', 'promoted', 'retained', 'graduated', 'transferred', 'stopped'
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uk_member_year UNIQUE(member_id, academic_year_id)
      );
    `);
    console.log('Created table [member_academic_history].');

    // 3. annual_promotion_logs table (Prevents duplicate promotions and enables safe rollback & audit)
    await client.query(`
      CREATE TABLE IF NOT EXISTS annual_promotion_logs (
        id TEXT PRIMARY KEY,
        from_academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        to_academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        total_eligible INTEGER NOT NULL,
        promoted_count INTEGER NOT NULL,
        graduated_count INTEGER NOT NULL,
        retained_count INTEGER NOT NULL,
        exceptions_count INTEGER NOT NULL,
        executed_by TEXT NOT NULL,
        executed_by_name TEXT NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT now(),
        status TEXT DEFAULT 'completed', -- 'completed', 'rolled_back'
        snapshot_data JSONB,
        CONSTRAINT uk_promotion_years UNIQUE(from_academic_year_id, to_academic_year_id)
      );
    `);
    console.log('Created table [annual_promotion_logs].');

    // 4. servant_academic_assignments table (Historical servant distributions per academic year)
    await client.query(`
      CREATE TABLE IF NOT EXISTS servant_academic_assignments (
        id TEXT PRIMARY KEY,
        servant_id TEXT NOT NULL REFERENCES servants(id) ON DELETE CASCADE,
        academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        stage TEXT,
        role_in_family TEXT DEFAULT 'خادم', -- 'أمين أسرة', 'أمين مساعد', 'خادم مسؤول', 'خادم مساعد'
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uk_servant_year_fam_stage UNIQUE(servant_id, academic_year_id, family_id, stage)
      );
    `);
    console.log('Created table [servant_academic_assignments].');

    // 5. Seed default Promotion Rules
    const defaultRules = [
      // Nursery
      { id: 'rule-nur-kg1', from_fam: 'fam-nursery', from_st: 'حضانة صغرى (KG1)', to_fam: 'fam-nursery', to_st: 'حضانة كبرى (KG2)', grad: false, order: 10 },
      { id: 'rule-nur-kg2', from_fam: 'fam-nursery', from_st: 'حضانة كبرى (KG2)', to_fam: 'fam-pri1-2', to_st: 'أولى ابتدائي', grad: false, order: 20 },

      // Primary 1-2
      { id: 'rule-pri-1', from_fam: 'fam-pri1-2', from_st: 'أولى ابتدائي', to_fam: 'fam-pri1-2', to_st: 'تانية ابتدائي', grad: false, order: 30 },
      { id: 'rule-pri-2', from_fam: 'fam-pri1-2', from_st: 'تانية ابتدائي', to_fam: 'fam-pri3-4', to_st: 'تالتة ابتدائي', grad: false, order: 40 },

      // Primary 3-4
      { id: 'rule-pri-3', from_fam: 'fam-pri3-4', from_st: 'تالتة ابتدائي', to_fam: 'fam-pri3-4', to_st: 'رابعة ابتدائي', grad: false, order: 50 },
      { id: 'rule-pri-4', from_fam: 'fam-pri3-4', from_st: 'رابعة ابتدائي', to_fam: 'fam-pri5-6', to_st: 'خامسة ابتدائي', grad: false, order: 60 },

      // Primary 5-6
      { id: 'rule-pri-5', from_fam: 'fam-pri5-6', from_st: 'خامسة ابتدائي', to_fam: 'fam-pri5-6', to_st: 'سادسة ابتدائي', grad: false, order: 70 },
      { id: 'rule-pri-6-boys', from_fam: 'fam-pri5-6', from_st: 'سادسة ابتدائي', to_fam: 'fam-prep-boys', to_st: 'أولى إعدادي', grad: false, order: 80 },

      // Prep Boys
      { id: 'rule-prep-b1', from_fam: 'fam-prep-boys', from_st: 'أولى إعدادي', to_fam: 'fam-prep-boys', to_st: 'تانية إعدادي', grad: false, order: 90 },
      { id: 'rule-prep-b2', from_fam: 'fam-prep-boys', from_st: 'تانية إعدادي', to_fam: 'fam-prep-boys', to_st: 'تالتة إعدادي', grad: false, order: 100 },
      { id: 'rule-prep-b3', from_fam: 'fam-prep-boys', from_st: 'تالتة إعدادي', to_fam: 'fam-sec', to_st: 'أولى ثانوي', grad: false, order: 110 },

      // Prep Girls
      { id: 'rule-prep-g1', from_fam: 'fam-prep-girls', from_st: 'أولى إعدادي', to_fam: 'fam-prep-girls', to_st: 'تانية إعدادي', grad: false, order: 120 },
      { id: 'rule-prep-g2', from_fam: 'fam-prep-girls', from_st: 'تانية إعدادي', to_fam: 'fam-prep-girls', to_st: 'تالتة إعدادي', grad: false, order: 130 },
      { id: 'rule-prep-g3', from_fam: 'fam-prep-girls', from_st: 'تالتة إعدادي', to_fam: 'fam-sec', to_st: 'أولى ثانوي', grad: false, order: 140 },

      // Secondary
      { id: 'rule-sec-1', from_fam: 'fam-sec', from_st: 'أولى ثانوي', to_fam: 'fam-sec', to_st: 'تانية ثانوي', grad: false, order: 150 },
      { id: 'rule-sec-2', from_fam: 'fam-sec', from_st: 'تانية ثانوي', to_fam: 'fam-sec', to_st: 'تالتة ثانوي', grad: false, order: 160 },
      { id: 'rule-sec-3', from_fam: 'fam-sec', from_st: 'تالتة ثانوي', to_fam: null, to_st: 'خريج خدمة ثانوي', grad: true, order: 170 },

      // Servant Prep
      { id: 'rule-sp-1', from_fam: 'fam-servant-prep', from_st: 'أولى إعداد خدام', to_fam: 'fam-servant-prep', to_st: 'تانية إعداد خدام', grad: false, order: 180 },
      { id: 'rule-sp-2', from_fam: 'fam-servant-prep', from_st: 'تانية إعداد خدام', to_fam: 'fam-servants', to_st: 'عام', grad: true, order: 190 },
    ];

    for (const r of defaultRules) {
      await client.query(`
        INSERT INTO promotion_rules (id, from_family_id, from_stage, to_family_id, to_stage, is_graduation, order_index)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          to_family_id = EXCLUDED.to_family_id,
          to_stage = EXCLUDED.to_stage,
          is_graduation = EXCLUDED.is_graduation,
          order_index = EXCLUDED.order_index
      `, [r.id, r.from_fam, r.from_st, r.to_fam, r.to_st, r.grad, r.order]);
    }
    console.log(`Seeded ${defaultRules.length} default promotion rules.`);

    // 6. Baseline Migration: lock in all current 26 members into member_academic_history for 'ay-2026-2027'
    const currentMembers = (await client.query('SELECT * FROM served_members')).rows;
    for (const m of currentMembers) {
      const histId = `mah-${m.id}-ay-2026-2027`;
      await client.query(`
        INSERT INTO member_academic_history (id, member_id, academic_year_id, family_id, stage, servant_id, code, status)
        VALUES ($1, $2, 'ay-2026-2027', $3, $4, $5, $6, 'active')
        ON CONFLICT (member_id, academic_year_id) DO UPDATE SET
          family_id = EXCLUDED.family_id,
          stage = EXCLUDED.stage,
          servant_id = EXCLUDED.servant_id,
          code = EXCLUDED.code
      `, [histId, m.id, m.current_family_id, m.stage, m.assigned_servant_id, m.code]);
    }
    console.log(`Archived baseline for ${currentMembers.length} active members into [member_academic_history] for ay-2026-2027.`);

    // 7. Baseline Migration: sync family_servants into servant_academic_assignments for 'ay-2026-2027'
    const fsRows = (await client.query('SELECT * FROM family_servants')).rows;
    for (const fs of fsRows) {
      const saaId = `saa-${fs.servant_id}-ay-2026-2027-${fs.family_id}-${fs.stage || 'general'}`;
      await client.query(`
        INSERT INTO servant_academic_assignments (id, servant_id, academic_year_id, family_id, stage, role_in_family, is_active)
        VALUES ($1, $2, 'ay-2026-2027', $3, $4, $5, $6)
        ON CONFLICT (servant_id, academic_year_id, family_id, stage) DO UPDATE SET
          role_in_family = EXCLUDED.role_in_family,
          is_active = EXCLUDED.is_active
      `, [saaId, fs.servant_id, fs.family_id, fs.stage, fs.role_in_family || 'خادم', fs.is_active]);
    }
    console.log(`Archived baseline for ${fsRows.length} servants into [servant_academic_assignments] for ay-2026-2027.`);

    await client.query('COMMIT');
    console.log('\n✅ Phase 1 Migration Committed Successfully with 0 Errors!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration Failed, Rolled back successfully:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
