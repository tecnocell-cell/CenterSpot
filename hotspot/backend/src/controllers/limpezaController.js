const db = require("../../db");
const { audit } = require("../utils/audit");
const { requireEmpresaId } = require("../utils/tenantAssert");

exports.limparRadius = async (req, res) => {
  if (requireEmpresaId(req, res) === false) return;
  try {
    // Limpar apenas usuários da empresa via radius_users
    const [users] = await db.query(
      "SELECT username FROM radius_users WHERE empresa_id = ?",
      [req.empresa_id]
    );

    for (const { username } of users) {
      await db.query("DELETE FROM radcheck WHERE username = ?", [username]);
      await db.query("DELETE FROM radreply WHERE username = ?", [username]);
      await db.query("DELETE FROM radusergroup WHERE username = ?", [username]);
    }

    await db.query("DELETE FROM radius_users WHERE empresa_id = ?", [req.empresa_id]);
    await audit.action(req, 'limpeza_radius', 'radius', null, { removidos: users.length });
    res.json({ message: "Usuários RADIUS limpos com sucesso." });
  } catch (error) {
    console.error("Erro ao limpar RADIUS:", error);
    res.status(500).json({ message: "Erro ao limpar RADIUS." });
  }
};

exports.limparPagamentos = async (req, res) => {
  if (requireEmpresaId(req, res) === false) return;
  try {
    await db.query("DELETE FROM pagamentos WHERE empresa_id = ?", [req.empresa_id]);
    await audit.action(req, 'limpeza_pagamentos', 'pagamento', null, {});
    res.json({ message: "Pagamentos limpos com sucesso." });
  } catch (error) {
    console.error("Erro ao limpar pagamentos:", error);
    res.status(500).json({ message: "Erro ao limpar pagamentos." });
  }
};

exports.limparLGPD = async (req, res) => {
  if (requireEmpresaId(req, res) === false) return;
  try {
    await db.query("DELETE FROM leads WHERE empresa_id = ? AND origem = 'lgpd'", [req.empresa_id]);
    await audit.action(req, 'limpeza_lgpd', 'lead', null, {});
    res.json({ message: "Logins LGPD limpos com sucesso." });
  } catch (error) {
    console.error("Erro ao limpar LGPD:", error);
    res.status(500).json({ message: "Erro ao limpar logins LGPD." });
  }
};
