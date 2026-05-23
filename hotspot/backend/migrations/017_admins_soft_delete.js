require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function migrate() {
  const conn = await db.getConnection();
  try {
    console.log('=== Migration 017: admins soft delete ===\n');

    if (!(await columnExists(conn, 'admins', 'deleted_at'))) {
      await conn.query(
        'ALTER TABLE admins ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER role'
      );
      console.log('+ admins.deleted_at');
    }

    if (!(await columnExists(conn, 'admins', 'active'))) {
      await conn.query(
        'ALTER TABLE admins ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1 AFTER deleted_at'
      );
      console.log('+ admins.active');
    }

    await conn.query('UPDATE admins SET active = 1 WHERE active IS NULL OR active = 0 AND deleted_at IS NULL');

    console.log('Migration 017 concluída.');
  } catch (err) {
    console.error('Erro migration 017:', err);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
