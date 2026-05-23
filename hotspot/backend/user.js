// backend/user.js
// Uso: node user.js [email] [password]
// Exemplo: node user.js giandersonfjs@gmail.com 'SuaSenhaSegura'
require('dotenv').config()

const bcrypt = require('bcryptjs')
const db = require('./db')

const DEFAULT_EMAIL = 'giandersonfjs@gmail.com'
const DEFAULT_PASSWORD = '@Eaaj1302Enzo#'
const DEFAULT_EMPRESA_ID = 1

const email = process.argv[2] || DEFAULT_EMAIL
const password = process.argv[3] || DEFAULT_PASSWORD

async function criarAdmin() {
  const hash = await bcrypt.hash(password, 10)

  const [[existing]] = await db.execute('SELECT id FROM admins WHERE email = ?', [email])
  let adminId = existing?.id

  if (adminId) {
    await db.execute(
      'UPDATE admins SET password = ?, empresa_id = ?, role = ? WHERE id = ?',
      [hash, DEFAULT_EMPRESA_ID, 'super_admin', adminId]
    )
    console.log(`Admin atualizado: ${email} (id=${adminId})`)
  } else {
    const [result] = await db.execute(
      'INSERT INTO admins (empresa_id, email, role, password) VALUES (?, ?, ?, ?)',
      [DEFAULT_EMPRESA_ID, email, 'super_admin', hash]
    )
    adminId = result.insertId
    console.log(`Admin criado: ${email} (id=${adminId})`)
  }

  await db.execute(
    `INSERT INTO admin_empresas (admin_id, empresa_id, role) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE role = VALUES(role)`,
    [adminId, DEFAULT_EMPRESA_ID, 'owner']
  )
  console.log(`Vínculo admin_empresas: admin_id=${adminId}, empresa_id=${DEFAULT_EMPRESA_ID}, role=owner`)

  process.exit(0)
}

criarAdmin().catch((err) => {
  console.error('Erro ao criar admin:', err)
  process.exit(1)
})
