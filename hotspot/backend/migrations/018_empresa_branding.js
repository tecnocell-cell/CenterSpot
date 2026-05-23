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
    console.log('=== Migration 018: empresa branding (favicon) ===\n');

    if (!(await columnExists(conn, 'empresas', 'favicon_url'))) {
      await conn.query('ALTER TABLE empresas ADD COLUMN favicon_url VARCHAR(500) NULL DEFAULT NULL AFTER logo_url');
      console.log('+ empresas.favicon_url');
    }

    await conn.query(
      `UPDATE empresas SET logo_url = '/logo-centerspot.png'
       WHERE slug = 'default' AND (logo_url IS NULL OR logo_url = '')`
    );
    await conn.query(
      `UPDATE empresas SET favicon_url = '/faveicon.png'
       WHERE slug = 'default' AND (favicon_url IS NULL OR favicon_url = '')`
    );

    console.log('Migration 018 concluída.');
  } catch (err) {
    console.error('Erro migration 018:', err);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
