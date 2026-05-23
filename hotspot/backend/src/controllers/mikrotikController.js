const Mikrotik = require("../models/Mikrotik");
const { audit } = require("../utils/audit");
const { requireEmpresaId } = require("../utils/tenantAssert");

exports.createMikrotik = async (req, res) => {
  const { nome, ip, usuario, senha, porta, end_hotspot } = req.body;

  if (!nome || !ip || !usuario || !senha || !porta) {
    return res.status(400).json({ message: "Campos obrigatórios faltando" });
  }
  if (requireEmpresaId(req, res) === false) return;

  try {
    const result = await Mikrotik.create({ nome, ip, usuario, senha, porta, end_hotspot, empresa_id: req.empresa_id });
    await audit.create(req, 'mikrotik', result.insertId, { nome, ip });
    res.status(201).json({ message: "Mikrotik cadastrado com sucesso" });
  } catch (error) {
    console.error("Erro ao cadastrar Mikrotik:", error);
    res.status(500).json({ message: "Erro interno ao salvar Mikrotik" });
  }
};

exports.listarMikrotiks = async (req, res) => {
  try {
    const lista = await Mikrotik.findAll(req.empresa_id);
    res.json(lista);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar Mikrotiks" });
  }
};
