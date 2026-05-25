require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, indexName]
  );
  return rows.length > 0;
}

async function migrate() {
  const conn = await db.getConnection();
  const report = { tablesCreated: [], columnsAdded: [], indexesCreated: [], seedInserted: 0 };

  try {
    console.log('=== Migration 019: Billing SaaS (schema base) ===\n');

    // --- billing_configs ---
    if (!(await tableExists(conn, 'billing_configs'))) {
      await conn.query(`
        CREATE TABLE billing_configs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          empresa_id INT NOT NULL,
          billing_model ENUM('monthly','percentage','fixed_fee','hybrid','free') NOT NULL DEFAULT 'free',
          monthly_amount_cents INT UNSIGNED NOT NULL DEFAULT 0,
          commission_percent DECIMAL(5,2) NULL,
          fixed_fee_per_transaction_cents INT UNSIGNED NOT NULL DEFAULT 0,
          commission_min_cents INT UNSIGNED NULL,
          commission_max_cents INT UNSIGNED NULL,
          monthly_commission_cap_cents INT UNSIGNED NULL,
          billing_day TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1-28',
          grace_period_days TINYINT UNSIGNED NOT NULL DEFAULT 0,
          trial_ends_at DATETIME NULL,
          subscription_status ENUM('trial','active','past_due','suspended','cancelled','exempt') NOT NULL DEFAULT 'exempt',
          auto_block_enabled TINYINT(1) NOT NULL DEFAULT 0,
          blocked_manually TINYINT(1) NOT NULL DEFAULT 0,
          usage_limits_json JSON NULL,
          notes TEXT NULL,
          effective_from DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_billing_configs_empresa (empresa_id),
          CONSTRAINT fk_billing_configs_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      report.tablesCreated.push('billing_configs');
      console.log('+ tabela billing_configs');
    } else {
      console.log('  billing_configs já existe');
    }

    // --- billing_config_history ---
    if (!(await tableExists(conn, 'billing_config_history'))) {
      await conn.query(`
        CREATE TABLE billing_config_history (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          billing_config_id INT NOT NULL,
          empresa_id INT NOT NULL,
          admin_id INT NULL,
          snapshot_json JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_bch_empresa (empresa_id, created_at),
          INDEX idx_bch_config (billing_config_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      report.tablesCreated.push('billing_config_history');
      console.log('+ tabela billing_config_history');
    } else {
      console.log('  billing_config_history já existe');
    }

    // --- billing_invoices ---
    if (!(await tableExists(conn, 'billing_invoices'))) {
      await conn.query(`
        CREATE TABLE billing_invoices (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          empresa_id INT NOT NULL,
          invoice_number VARCHAR(32) NOT NULL,
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          invoice_type ENUM('subscription','commission_settlement','hybrid','adjustment','manual') NOT NULL,
          subtotal_cents INT NOT NULL DEFAULT 0,
          commission_cents INT NOT NULL DEFAULT 0,
          subscription_cents INT NOT NULL DEFAULT 0,
          total_cents INT NOT NULL DEFAULT 0,
          status ENUM('draft','open','paid','overdue','void','waived') NOT NULL DEFAULT 'draft',
          due_date DATE NOT NULL,
          paid_at DATETIME NULL,
          mp_payment_id BIGINT NULL,
          payment_method VARCHAR(32) NULL,
          line_items_json JSON NULL,
          metadata_json JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_invoice_number (invoice_number),
          INDEX idx_bi_empresa_status (empresa_id, status),
          INDEX idx_bi_due (due_date, status),
          CONSTRAINT fk_bi_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      report.tablesCreated.push('billing_invoices');
      console.log('+ tabela billing_invoices');
    } else {
      console.log('  billing_invoices já existe');
    }

    // --- billing_events ---
    if (!(await tableExists(conn, 'billing_events'))) {
      await conn.query(`
        CREATE TABLE billing_events (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          empresa_id INT NOT NULL,
          event_type VARCHAR(64) NOT NULL,
          reference_type VARCHAR(32) NULL,
          reference_id VARCHAR(64) NULL,
          payload_json JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_be_empresa (empresa_id, created_at),
          INDEX idx_be_type (event_type, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      report.tablesCreated.push('billing_events');
      console.log('+ tabela billing_events');
    } else {
      console.log('  billing_events já existe');
    }

    // --- pagamentos: colunas de comissão SaaS ---
    console.log('\nColunas em pagamentos:');
    const pagCols = [
      {
        name: 'saas_commission_cents',
        sql: 'ADD COLUMN saas_commission_cents INT UNSIGNED NULL DEFAULT NULL AFTER valor',
      },
      {
        name: 'saas_commission_rate',
        sql: 'ADD COLUMN saas_commission_rate DECIMAL(5,2) NULL DEFAULT NULL AFTER saas_commission_cents',
      },
      {
        name: 'saas_commission_status',
        sql: `ADD COLUMN saas_commission_status ENUM('pending','invoiced','waived','not_applicable') NOT NULL DEFAULT 'not_applicable' AFTER saas_commission_rate`,
      },
      {
        name: 'saas_billing_invoice_id',
        sql: 'ADD COLUMN saas_billing_invoice_id BIGINT NULL DEFAULT NULL AFTER saas_commission_status',
      },
    ];

    for (const col of pagCols) {
      if (!(await columnExists(conn, 'pagamentos', col.name))) {
        await conn.query(`ALTER TABLE pagamentos ${col.sql}`);
        report.columnsAdded.push(col.name);
        console.log(`+ pagamentos.${col.name}`);
      } else {
        console.log(`  pagamentos.${col.name} já existe`);
      }
    }

    if (!(await indexExists(conn, 'pagamentos', 'idx_pagamentos_commission'))) {
      await conn.query(
        `CREATE INDEX idx_pagamentos_commission ON pagamentos (empresa_id, saas_commission_status, criado_em)`
      );
      report.indexesCreated.push('idx_pagamentos_commission');
      console.log('+ índice idx_pagamentos_commission');
    } else {
      console.log('  idx_pagamentos_commission já existe');
    }

    // --- seed: uma config free/exempt por empresa sem registro ---
    console.log('\nSeed billing_configs (free / exempt):');
    const [seedResult] = await conn.query(`
      INSERT INTO billing_configs (empresa_id, billing_model, subscription_status, auto_block_enabled)
      SELECT e.id, 'free', 'exempt', 0
      FROM empresas e
      WHERE NOT EXISTS (
        SELECT 1 FROM billing_configs bc WHERE bc.empresa_id = e.id
      )
    `);
    report.seedInserted = seedResult.affectedRows || 0;
    console.log(`  -> ${report.seedInserted} empresa(s) seedada(s)`);

    const [[{ total_configs }]] = await conn.query(
      'SELECT COUNT(*) AS total_configs FROM billing_configs'
    );
    const [[{ total_empresas }]] = await conn.query(
      'SELECT COUNT(*) AS total_empresas FROM empresas'
    );

    console.log('\n=== Migration 019 concluída ===');
    console.log(JSON.stringify({ ...report, total_configs, total_empresas }, null, 2));
  } catch (err) {
    console.error('Erro migration 019:', err);
    process.exitCode = 1;
    throw err;
  } finally {
    conn.release();
    process.exit(process.exitCode ?? 0);
  }
}

migrate();
