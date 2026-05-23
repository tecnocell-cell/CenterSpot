const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const { audit } = require("../utils/audit");
const { requireEmpresaId } = require("../utils/tenantAssert");

const EMPRESA_ROLES = new Set(["owner", "manager", "operator"]);

function mapEmpresaRole(role) {
  return EMPRESA_ROLES.has(role) ? role : "operator";
}

const listarAdmins = async (req, res) => {
  try {
    const admins = await Admin.findAll(req.empresa_id);
    res.json(admins);
  } catch (err) {
    console.error("Erro ao listar admins:", err);
    res.status(500).json({ message: "Erro ao listar administradores" });
  }
};

const criarAdmin = async (req, res) => {
  const { email, senha, nome, role } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ message: "Email e senha são obrigatórios" });
  }

  if (requireEmpresaId(req, res) === false) return;

  const globalRole = role || "operator";
  if (globalRole === "super_admin" && req.user.role !== "super_admin") {
    return res.status(403).json({ message: "Apenas super admin pode criar super admins" });
  }

  const empresaRole = mapEmpresaRole(globalRole);

  try {
    const hash = await bcrypt.hash(senha, 10);
    const adminId = await Admin.create(
      email,
      hash,
      req.empresa_id,
      globalRole,
      nome || null
    );
    await Admin.linkEmpresa(adminId, req.empresa_id, empresaRole);

    await audit.create(req, "admin", adminId, { email, role: globalRole });
    res.status(201).json({ message: "Administrador criado com sucesso", id: adminId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email já cadastrado" });
    }
    console.error("Erro ao criar admin:", err);
    res.status(500).json({ message: "Erro interno ao criar administrador" });
  }
};

const atualizarAdmin = async (req, res) => {
  const { id } = req.params;
  const { email, senha, nome } = req.body;
  const targetId = parseInt(id, 10);

  if (!email) return res.status(400).json({ message: "Email é obrigatório" });

  try {
    const target = await Admin.findById(targetId);
    if (!target) {
      return res.status(404).json({ message: "Administrador não encontrado" });
    }

    if (req.user.role !== "super_admin") {
      if (!req.empresa_id) {
        return res.status(403).json({ message: "Empresa não identificada" });
      }
      const noEscopo = await Admin.belongsToEmpresa(targetId, req.empresa_id);
      if (!noEscopo) {
        return res.status(403).json({
          message: "Não é permitido alterar administrador de outra empresa",
        });
      }
    }

    await Admin.update(targetId, email, nome || null);

    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      await Admin.updatePassword(targetId, hash);
    }

    await audit.update(req, "admin", targetId, { email });
    res.json({ message: "Administrador atualizado com sucesso" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Email já cadastrado" });
    }
    console.error("Erro ao atualizar admin:", err);
    res.status(500).json({ message: "Erro interno ao atualizar administrador" });
  }
};

const deletarAdmin = async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  try {
    const target = await Admin.findById(targetId);
    if (!target) {
      return res.status(404).json({ message: "Administrador não encontrado" });
    }

    if (targetId === req.user.id) {
      return res.status(403).json({ message: "Não é permitido excluir a própria conta" });
    }

    if (Admin.isSeedAdmin(target)) {
      return res.status(403).json({
        message: "Não é permitido excluir o administrador principal do sistema",
      });
    }

    if (target.role === "super_admin") {
      const total = await Admin.countSuperAdmins();
      if (total <= 1) {
        return res.status(403).json({
          message: "Não é permitido excluir o último super administrador",
        });
      }
    }

    if (req.user.role !== "super_admin") {
      if (!req.empresa_id) {
        return res.status(403).json({ message: "Empresa não identificada" });
      }
      const noEscopo = await Admin.belongsToEmpresa(targetId, req.empresa_id);
      if (!noEscopo) {
        return res.status(403).json({
          message: "Não é permitido excluir administrador de outra empresa",
        });
      }
    }

    await Admin.softDelete(targetId);
    await audit.delete(req, "admin", targetId);
    res.json({ message: "Administrador desativado com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar admin:", err);
    res.status(500).json({ message: "Erro interno ao remover administrador" });
  }
};

module.exports = {
  listarAdmins,
  criarAdmin,
  atualizarAdmin,
  deletarAdmin,
};
