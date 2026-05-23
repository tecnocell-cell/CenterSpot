/**
 * Testes manuais Fase 1 — usuários / admin_empresas
 * Uso: node scripts/test-fase1-admins.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const API = process.env.TEST_API_URL || 'http://localhost:3001';
const SUPER_EMAIL = process.env.SEED_ADMIN_EMAIL || 'giandersonfjs@gmail.com';
const SUPER_PASS = process.env.SEED_ADMIN_PASS || '';
const TEST_OPERATOR_EMAIL = `operator.test.${Date.now()}@test.local`;
const TEST_OPERATOR_PASS = 'TestOp123!';

async function login(email, senha) {
  const { data, status } = await axios.post(`${API}/api/auth/login`, { email, senha });
  return { token: data.token, user: data.user, status };
}

async function api(method, path, token, body) {
  try {
    const res = await axios({
      method,
      url: `${API}${path}`,
      headers: { Authorization: `Bearer ${token}` },
      data: body,
      validateStatus: () => true,
    });
    return { status: res.status, data: res.data };
  } catch (e) {
    return { status: 0, data: { message: e.message } };
  }
}

async function main() {
  if (!SUPER_PASS) {
    console.error('Defina SEED_ADMIN_PASS no ambiente para rodar os testes.');
    process.exit(1);
  }

  const results = [];

  const superLogin = await login(SUPER_EMAIL, SUPER_PASS);
  results.push(['Login super_admin', superLogin.status === 200 ? 'OK' : 'FAIL']);

  const token = superLogin.token;

  const create = await api('POST', '/api/admins', token, {
    email: TEST_OPERATOR_EMAIL,
    senha: TEST_OPERATOR_PASS,
    nome: 'Operator Test',
  });
  results.push(['Criar operator', create.status === 201 ? 'OK' : `FAIL ${create.status} ${create.data?.message}`]);
  const operatorId = create.data?.id;

  const opLogin = await login(TEST_OPERATOR_EMAIL, TEST_OPERATOR_PASS);
  results.push(['Login operator novo', opLogin.status === 200 ? 'OK' : `FAIL ${opLogin.data?.error}`]);

  const selfDel = await api('DELETE', `/api/admins/${opLogin.user.id}`, opLogin.token);
  results.push(['Autoexclusão bloqueada', selfDel.status === 403 ? 'OK' : `FAIL ${selfDel.status}`]);

  const seedDel = await api('DELETE', '/api/admins/1', opLogin.token);
  results.push(['Excluir seed bloqueado', seedDel.status === 403 ? 'OK' : `FAIL ${seedDel.status}`]);

  const db = require('../db');
  const [links] = await db.execute(
    `SELECT ae.* FROM admin_empresas ae JOIN admins a ON a.id = ae.admin_id WHERE a.email = ?`,
    [TEST_OPERATOR_EMAIL]
  );
  results.push(['admin_empresas do operator', links.length > 0 ? 'OK' : 'FAIL']);

  if (operatorId) {
    const delOp = await api('DELETE', `/api/admins/${operatorId}`, token);
    results.push(['Super remove operator teste', delOp.status === 200 ? 'OK' : `FAIL ${delOp.status}`]);
  }

  console.log('\n=== Resultados Fase 1 ===\n');
  results.forEach(([name, r]) => console.log(`${r === 'OK' ? '✓' : '✗'} ${name}: ${r}`));

  process.exit(results.every(([, r]) => r === 'OK') ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
