require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
  const conn = await db.getConnection();
  try {
    console.log('=== Migration 016: audit_logs ===\n');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        empresa_id INT NULL,
        admin_id INT NULL,
        acao VARCHAR(80) NOT NULL,
        entidade VARCHAR(80) NULL,
        entidade_id VARCHAR(64) NULL,
        payload_json JSON NULL,
        ip VARCHAR(45) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_empresa (empresa_id),
        INDEX idx_audit_admin (admin_id),
        INDEX idx_audit_acao (acao),
        INDEX idx_audit_entidade (entidade, entidade_id),
        INDEX idx_audit_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log('Migration 016 concluída.');
  } catch (err) {
    console.error('Erro migration 016:', err);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
