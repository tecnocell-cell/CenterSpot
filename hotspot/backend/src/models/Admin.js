const db = require('../../db');

const SEED_ADMIN_ID = 1;
const SEED_ADMIN_EMAIL = 'giandersonfjs@gmail.com';

const findByEmail = async (email) => {
  const [rows] = await db.execute(
    `SELECT a.*, e.slug AS empresa_slug, e.nome AS empresa_nome
     FROM admins a
     LEFT JOIN empresas e ON a.empresa_id = e.id
     WHERE a.email = ?`,
    [email]
  );
  return rows[0];
};

const findAll = async (empresa_id) => {
  if (!empresa_id) {
    const [rows] = await db.execute(
      'SELECT id, email, nome, role, empresa_id, created_at FROM admins ORDER BY id DESC'
    );
    return rows;
  }
  const [rows] = await db.execute(
    `SELECT DISTINCT a.id, a.email, a.nome, a.role, a.empresa_id, a.created_at
     FROM admins a
     LEFT JOIN admin_empresas ae ON ae.admin_id = a.id AND ae.empresa_id = ?
     WHERE a.empresa_id = ? OR ae.empresa_id = ?
     ORDER BY a.id DESC`,
    [empresa_id, empresa_id, empresa_id]
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await db.execute(
    'SELECT id, email, nome, role, empresa_id FROM admins WHERE id = ?',
    [id]
  );
  return rows[0];
};

const create = async (email, passwordHash, empresa_id, role = 'operator', nome = null) => {
  const [result] = await db.execute(
    'INSERT INTO admins (empresa_id, email, password, nome, role) VALUES (?, ?, ?, ?, ?)',
    [empresa_id, email, passwordHash, nome, role]
  );
  return result.insertId;
};

const linkEmpresa = async (adminId, empresaId, role = 'operator') => {
  await db.execute(
    `INSERT INTO admin_empresas (admin_id, empresa_id, role) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE role = VALUES(role)`,
    [adminId, empresaId, role]
  );
};

const update = async (id, email, nome = null) => {
  await db.execute('UPDATE admins SET email = ?, nome = ? WHERE id = ?', [email, nome, id]);
};

const updatePassword = async (id, passwordHash) => {
  await db.execute('UPDATE admins SET password = ? WHERE id = ?', [passwordHash, id]);
};

const remove = async (id) => {
  await db.execute('DELETE FROM admins WHERE id = ?', [id]);
};

const belongsToEmpresa = async (adminId, empresaId) => {
  const [[row]] = await db.execute(
    `SELECT 1 AS ok FROM admins a
     LEFT JOIN admin_empresas ae ON ae.admin_id = a.id AND ae.empresa_id = ?
     WHERE a.id = ? AND (a.empresa_id = ? OR ae.empresa_id = ?)
     LIMIT 1`,
    [empresaId, adminId, empresaId, empresaId]
  );
  return !!row;
};

const countSuperAdmins = async () => {
  const [[row]] = await db.execute(
    "SELECT COUNT(*) AS total FROM admins WHERE role = 'super_admin'"
  );
  return row.total;
};

const isSeedAdmin = (admin) => {
  if (!admin) return false;
  return admin.id === SEED_ADMIN_ID || admin.email === SEED_ADMIN_EMAIL;
};

const getEmpresas = async (adminId, role) => {
  if (role === 'super_admin') {
    const [rows] = await db.execute(
      `SELECT id, nome, slug, cnpj, email, logo_url, 'owner' AS role
       FROM empresas
       WHERE ativo = 1
       ORDER BY nome`
    );
    return rows;
  }

  const [rows] = await db.execute(
    `SELECT e.id, e.nome, e.slug, e.cnpj, e.email, e.logo_url, ae.role
     FROM admin_empresas ae
     JOIN empresas e ON ae.empresa_id = e.id
     WHERE ae.admin_id = ? AND e.ativo = 1
     ORDER BY e.nome`,
    [adminId]
  );

  if (rows.length > 0) return rows;

  // Fallback legado: vínculo só em admins.empresa_id (usuários antigos)
  const [[admin]] = await db.execute(
    'SELECT empresa_id, role FROM admins WHERE id = ?',
    [adminId]
  );
  if (!admin?.empresa_id) return [];

  const empresaRole =
    admin.role === 'owner' || admin.role === 'manager' ? admin.role : 'operator';

  const [fallback] = await db.execute(
    `SELECT e.id, e.nome, e.slug, e.cnpj, e.email, e.logo_url, ? AS role
     FROM empresas e
     WHERE e.id = ? AND e.ativo = 1`,
    [empresaRole, admin.empresa_id]
  );
  return fallback;
};

module.exports = {
  SEED_ADMIN_ID,
  SEED_ADMIN_EMAIL,
  findByEmail,
  findAll,
  findById,
  create,
  linkEmpresa,
  update,
  remove,
  updatePassword,
  getEmpresas,
  belongsToEmpresa,
  countSuperAdmins,
  isSeedAdmin,
};
