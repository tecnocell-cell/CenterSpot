/**
 * Garante escopo multi-tenant em queries mutáveis.
 * Super admin sem x-empresa-id pode operar globalmente onde permitido.
 */
function requireEmpresaId(req, res) {
  if (req.user?.role === 'super_admin' && !req.empresa_id) {
    return null; // bypass explícito para operações globais
  }
  if (!req.empresa_id) {
    res.status(403).json({ error: 'Empresa não identificada' });
    return false;
  }
  return req.empresa_id;
}

/** SQL fragment: filtro empresa (retorna { sql, params }) */
function empresaFilter(req, column = 'empresa_id') {
  if (req.user?.role === 'super_admin' && !req.empresa_id) {
    return { sql: '1=1', params: [] };
  }
  return { sql: `${column} = ?`, params: [req.empresa_id] };
}

module.exports = { requireEmpresaId, empresaFilter };
