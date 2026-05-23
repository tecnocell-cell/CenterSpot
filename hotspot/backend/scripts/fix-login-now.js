require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const bcrypt = require('bcryptjs')
const db = require('../db')

const EMAIL = 'giandersonfjs@gmail.com'
const PASS = '@Eaaj1302Enzo#'
const EMPRESA_ID = 1

async function main() {
  console.log('DB:', process.env.DB_HOST, process.env.DB_NAME, process.env.DB_USER)

  const [admins] = await db.execute(
    'SELECT id, email, role, empresa_id FROM admins ORDER BY id'
  )
  console.log('\n=== admins ===')
  console.table(admins)

  const [links] = await db.execute('SELECT * FROM admin_empresas ORDER BY admin_id')
  console.log('\n=== admin_empresas ===')
  console.table(links)

  const hash = await bcrypt.hash(PASS, 10)
  const [[row]] = await db.execute('SELECT id FROM admins WHERE email = ?', [EMAIL])

  let adminId = row?.id
  if (adminId) {
    await db.execute(
      'UPDATE admins SET password = ?, role = ?, empresa_id = ? WHERE id = ?',
      [hash, 'super_admin', EMPRESA_ID, adminId]
    )
    console.log('\nAdmin atualizado id=', adminId)
  } else {
    const [ins] = await db.execute(
      'INSERT INTO admins (empresa_id, email, role, password) VALUES (?, ?, ?, ?)',
      [EMPRESA_ID, EMAIL, 'super_admin', hash]
    )
    adminId = ins.insertId
    console.log('\nAdmin criado id=', adminId)
  }

  await db.execute(
    `INSERT INTO admin_empresas (admin_id, empresa_id, role) VALUES (?, ?, 'owner')
     ON DUPLICATE KEY UPDATE role = 'owner'`,
    [adminId, EMPRESA_ID]
  )

  const [[check]] = await db.execute('SELECT password FROM admins WHERE id = ?', [adminId])
  const ok = await bcrypt.compare(PASS, check.password)
  console.log('bcrypt.compare OK:', ok)

  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
