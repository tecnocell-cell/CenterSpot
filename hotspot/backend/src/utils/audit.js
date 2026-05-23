const db = require('../../db');
const appConfig = require('../config/app');
const logger = require('./logger');

/**
 * Registra ação na tabela audit_logs (não bloqueia fluxo principal).
 */
async function recordAudit({
  empresaId = null,
  adminId = null,
  acao,
  entidade = null,
  entidadeId = null,
  payload = null,
  ip = null,
  req = null,
}) {
  if (!appConfig.flags.auditEnabled || !acao) return;

  const resolvedIp =
    ip ||
    req?.auditIp ||
    req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    null;

  const empresa = empresaId ?? req?.empresa_id ?? req?.user?.empresa_id ?? null;
  const admin = adminId ?? req?.user?.id ?? null;

  let payloadJson = null;
  if (payload != null) {
    try {
      payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (payloadJson.length > 65000) {
        payloadJson = payloadJson.slice(0, 65000) + '…';
      }
    } catch {
      payloadJson = null;
    }
  }

  try {
    await db.execute(
      `INSERT INTO audit_logs
        (empresa_id, admin_id, acao, entidade, entidade_id, payload_json, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [empresa, admin, acao, entidade, entidadeId != null ? String(entidadeId) : null, payloadJson, resolvedIp]
    );
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      logger.warn('audit', 'Tabela audit_logs ausente — rode migration 016');
      return;
    }
    logger.error('audit', 'Falha ao gravar audit_log', { acao, message: err.message });
  }
}

/** Atalhos padronizados */
const audit = {
  login: (req, adminId, extra) =>
    recordAudit({ req, adminId, acao: 'login', entidade: 'admin', entidadeId: adminId, payload: extra }),
  logout: (req) =>
    recordAudit({ req, acao: 'logout', entidade: 'admin', entidadeId: req?.user?.id }),
  create: (req, entidade, entidadeId, payload) =>
    recordAudit({ req, acao: 'criar', entidade, entidadeId, payload }),
  update: (req, entidade, entidadeId, payload) =>
    recordAudit({ req, acao: 'editar', entidade, entidadeId, payload }),
  delete: (req, entidade, entidadeId, payload) =>
    recordAudit({ req, acao: 'excluir', entidade, entidadeId, payload }),
  action: (req, acao, entidade, entidadeId, payload) =>
    recordAudit({ req, acao, entidade, entidadeId, payload }),
};

module.exports = { recordAudit, audit };
