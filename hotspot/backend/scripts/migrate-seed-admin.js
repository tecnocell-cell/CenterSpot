/**
 * Migração única: admin seed admin@empresa.com → giandersonfjs@gmail.com
 * Uso: node scripts/migrate-seed-admin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const bcrypt = require('bcryptjs')
const db = require('../db')

const NEW_EMAIL = 'giandersonfjs@gmail.com'
const NEW_PASSWORD = '@Eaaj1302Enzo#'
const EMPRESA_ID = 1
async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 10)

  const [[oldAdmin]] = await db.execute(
    'SELECT id, email, role, empresa_id FROM admins WHERE email = ?',
    ['admin@empresa.com']
  )
  const [[newAdmin]] = await db.execute(
    'SELECT id, email, role, empresa_id FROM admins WHERE email = ?',
    [NEW_EMAIL]
  )

  let adminId

  if (oldAdmin) {
    if (newAdmin && newAdmin.id !== oldAdmin.id) {
      console.log(`Removendo admin duplicado id=${newAdmin.id} (email já migrado em outro registro)`)
      await db.execute('DELETE FROM admins WHERE id = ?', [newAdmin.id])
    }
    await db.execute(
      'UPDATE admins SET email = ?, password = ?, role = ?, empresa_id = ? WHERE id = ?',
      [NEW_EMAIL, hash, 'super_admin', EMPRESA_ID, oldAdmin.id]
    )
    adminId = oldAdmin.id
    console.log(`Admin id=${adminId} migrado de admin@empresa.com`)
  } else if (newAdmin) {
    await db.execute(
      'UPDATE admins SET password = ?, role = ?, empresa_id = ? WHERE id = ?',
      [hash, 'super_admin', EMPRESA_ID, newAdmin.id]
    )
    adminId = newAdmin.id
    console.log(`Admin id=${adminId} já existia com novo email — senha/role atualizados`)
  } else {
    const [result] = await db.execute(
      'INSERT INTO admins (empresa_id, email, role, password) VALUES (?, ?, ?, ?)',
      [EMPRESA_ID, NEW_EMAIL, 'super_admin', hash]
    )
    adminId = result.insertId
    console.log(`Admin criado id=${adminId}`)
  }

  await db.execute(
    `INSERT INTO admin_empresas (admin_id, empresa_id, role) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE role = VALUES(role)`,
    [adminId, EMPRESA_ID, 'owner']
  )

  await db.execute('UPDATE empresas SET email = ? WHERE id = ?', [NEW_EMAIL, EMPRESA_ID])

  const [[admin]] = await db.execute(
    'SELECT id, email, role, empresa_id FROM admins WHERE id = ?',
    [adminId]
  )
  const [links] = await db.execute(
    `SELECT ae.* FROM admin_empresas ae WHERE ae.admin_id = ?`,
    [adminId]
  )

  console.log('\n--- Validação ---')
  console.log('admins:', admin)
  console.log('admin_empresas:', links)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
