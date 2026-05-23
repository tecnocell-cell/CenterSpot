require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const bcrypt = require('bcryptjs')
const db = require('../db')

;(async () => {
  const [[row]] = await db.execute('SELECT password FROM admins WHERE email = ?', [
    'giandersonfjs@gmail.com',
  ])
  if (!row) {
    console.error('Admin não encontrado')
    process.exit(1)
  }
  const ok = await bcrypt.compare('@Eaaj1302Enzo#', row.password)
  console.log('hash:', row.password)
  console.log('bcrypt ok:', ok)
  process.exit(0)
})()
