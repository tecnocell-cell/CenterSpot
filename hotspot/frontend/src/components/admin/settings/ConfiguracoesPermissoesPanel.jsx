import React, { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import AdminModal from "../AdminModal";

const API = import.meta.env.VITE_API_URL || "";

const MODULOS_LABELS = {
  dashboard: "Dashboard",
  mikrotiks: "Mikrotiks",
  vpn: "VPN WireGuard",
  portais: "Portais",
  planos: "Planos",
  clientes: "Clientes (LGPD)",
  leads: "Leads",
  radius: "Usuários RADIUS",
  pagamentos: "Pagamentos",
  sessoes: "Sessões Ativas",
  sessoeslog: "Log Radius",
  compliance: "Marco Civil",
  configuracoes: "Configurações",
  usuarios: "Usuários",
};

const ACOES = ["ver", "criar", "editar", "excluir"];
const ACOES_LABELS = { ver: "Ver", criar: "Criar", editar: "Editar", excluir: "Excluir" };

function emptyPermissoes() {
  return Object.keys(MODULOS_LABELS).map((m) => ({
    modulo: m,
    ver: false,
    criar: false,
    editar: false,
    excluir: false,
  }));
}

export default function ConfiguracoesPermissoesPanel() {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: "", descricao: "", permissoes: emptyPermissoes() });
  const [erro, setErro] = useState(null);

  const [showAdminsModal, setShowAdminsModal] = useState(null);
  const [adminsGrupo, setAdminsGrupo] = useState([]);
  const [todosAdmins, setTodosAdmins] = useState([]);
  const [adminSelecionado, setAdminSelecionado] = useState("");

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchGrupos = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/grupos-permissao`, { headers });
      if (res.ok) setGrupos(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrupos();
  }, [fetchGrupos]);

  const openNovo = () => {
    setEditId(null);
    setForm({ nome: "", descricao: "", permissoes: emptyPermissoes() });
    setErro(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    try {
      const url = editId ? `${API}/api/grupos-permissao/${editId}` : `${API}/api/grupos-permissao`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (res.ok) {
        setShowModal(false);
        setEditId(null);
        setForm({ nome: "", descricao: "", permissoes: emptyPermissoes() });
        fetchGrupos();
      } else {
        const data = await res.json();
        setErro(data.message || "Erro ao salvar");
      }
    } catch (err) {
      setErro("Erro de conexão");
    }
  };

  const handleEdit = async (grupo) => {
    try {
      const res = await fetch(`${API}/api/grupos-permissao/${grupo.id}`, { headers });
      const data = await res.json();
      const perms = emptyPermissoes().map((p) => {
        const found = data.permissoes?.find((dp) => dp.modulo === p.modulo);
        return found
          ? { ...p, ver: !!found.ver, criar: !!found.criar, editar: !!found.editar, excluir: !!found.excluir }
          : p;
      });
      setEditId(grupo.id);
      setForm({ nome: data.nome, descricao: data.descricao || "", permissoes: perms });
      setShowModal(true);
    } catch (err) {
      alert("Erro ao carregar grupo");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deletar este grupo de permissão?")) return;
    await fetch(`${API}/api/grupos-permissao/${id}`, { method: "DELETE", headers });
    fetchGrupos();
  };

  const togglePerm = (modulo, acao) => {
    setForm((prev) => ({
      ...prev,
      permissoes: prev.permissoes.map((p) =>
        p.modulo === modulo ? { ...p, [acao]: !p[acao] } : p
      ),
    }));
  };

  const toggleAllModulo = (modulo) => {
    const perm = form.permissoes.find((p) => p.modulo === modulo);
    const allChecked = ACOES.every((a) => perm[a]);
    setForm((prev) => ({
      ...prev,
      permissoes: prev.permissoes.map((p) =>
        p.modulo === modulo
          ? { ...p, ver: !allChecked, criar: !allChecked, editar: !allChecked, excluir: !allChecked }
          : p
      ),
    }));
  };

  const toggleAllAcao = (acao) => {
    const allChecked = form.permissoes.every((p) => p[acao]);
    setForm((prev) => ({
      ...prev,
      permissoes: prev.permissoes.map((p) => ({ ...p, [acao]: !allChecked })),
    }));
  };

  const openAdminsModal = async (grupoId) => {
    setShowAdminsModal(grupoId);
    const [admRes, todosRes] = await Promise.all([
      fetch(`${API}/api/grupos-permissao/${grupoId}/admins`, { headers }),
      fetch(`${API}/api/grupos-permissao/admins/todos`, { headers }),
    ]);
    setAdminsGrupo(await admRes.json());
    setTodosAdmins(await todosRes.json());
  };

  const vincularAdmin = async () => {
    if (!adminSelecionado) return;
    await fetch(`${API}/api/grupos-permissao/${showAdminsModal}/vincular-admin`, {
      method: "POST",
      headers,
      body: JSON.stringify({ admin_id: adminSelecionado }),
    });
    setAdminSelecionado("");
    openAdminsModal(showAdminsModal);
  };

  const desvincularAdmin = async (adminId) => {
    if (!confirm("Remover este admin do grupo?")) return;
    await fetch(`${API}/api/grupos-permissao/${showAdminsModal}/desvincular-admin/${adminId}`, {
      method: "DELETE",
      headers,
    });
    openAdminsModal(showAdminsModal);
  };

  return (
    <div className="rn-settings-panel">
        <div className="rn-settings-toolbar">
          <p className="rn-muted" style={{ margin: 0, fontSize: 12 }}>
            {grupos.length} grupo(s) de permissão
          </p>
          <button type="button" className="rn-btn rn-btn--primary rn-btn--sm" onClick={openNovo}>
            <Plus size={14} />
            Novo grupo
          </button>
        </div>

        {loading ? (
          <div
            className="rn-card"
            style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted-foreground)" }}
          >
            Carregando…
          </div>
        ) : (
          <div className="rn-card rn-table-wrap">
            <table className="rn-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th style={{ textAlign: "center" }}>Admins</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <p style={{ fontWeight: 600, margin: 0 }}>{g.nome}</p>
                    </td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {g.descricao || "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="rn-pill rn-pill--info">{g.total_admins || 0}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="rn-btn rn-btn--secondary rn-btn--sm"
                          onClick={() => openAdminsModal(g.id)}
                          title="Admins do grupo"
                        >
                          👥
                        </button>
                        <button
                          type="button"
                          className="rn-btn rn-btn--secondary rn-btn--sm"
                          onClick={() => handleEdit(g)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rn-btn rn-btn--danger rn-btn--sm"
                          onClick={() => handleDelete(g.id)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AdminModal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editId ? "Editar Grupo" : "Novo Grupo de Permissão"}
          large
        >
          <form onSubmit={handleSubmit}>
            {erro && <div className="rn-alert rn-alert--danger">{erro}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div className="rn-field">
                <label className="rn-label">Nome *</label>
                <input
                  type="text"
                  required
                  className="rn-input"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="rn-field">
                <label className="rn-label">Descrição</label>
                <input
                  type="text"
                  className="rn-input"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
            </div>

            <p className="rn-section-sub" style={{ marginTop: 0 }}>
              Permissões por módulo
            </p>
            <div className="rn-card rn-table-wrap" style={{ boxShadow: "none", marginBottom: 16 }}>
              <table className="rn-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Módulo</th>
                    {ACOES.map((a) => (
                      <th
                        key={a}
                        style={{ textAlign: "center", cursor: "pointer" }}
                        onClick={() => toggleAllAcao(a)}
                      >
                        {ACOES_LABELS[a]}
                      </th>
                    ))}
                    <th style={{ textAlign: "center" }}>Todos</th>
                  </tr>
                </thead>
                <tbody>
                  {form.permissoes.map((p) => (
                    <tr key={p.modulo}>
                      <td style={{ fontWeight: 500 }}>{MODULOS_LABELS[p.modulo]}</td>
                      {ACOES.map((a) => (
                        <td key={a} style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={p[a]}
                            onChange={() => togglePerm(p.modulo, a)}
                          />
                        </td>
                      ))}
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="rn-btn rn-btn--ghost rn-btn--sm"
                          onClick={() => toggleAllModulo(p.modulo)}
                        >
                          {ACOES.every((a) => p[a]) ? "✓" : "—"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rn-form-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
              <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="rn-btn rn-btn--primary">
                {editId ? "Salvar" : "Criar"}
              </button>
            </div>
          </form>
        </AdminModal>

        <AdminModal
          open={!!showAdminsModal}
          onClose={() => setShowAdminsModal(null)}
          title="Admins do Grupo"
          large
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {adminsGrupo.length === 0 && <p className="rn-muted">Nenhum admin vinculado</p>}
            {adminsGrupo.map((a) => (
              <div
                key={a.id}
                className="rn-card"
                style={{
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "none",
                }}
              >
                <div>
                  <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>{a.nome || a.email}</p>
                  <p className="rn-muted" style={{ fontSize: 11, margin: "2px 0 0" }}>
                    {a.email} · {a.role}
                  </p>
                </div>
                <button
                  type="button"
                  className="rn-btn rn-btn--danger rn-btn--sm"
                  onClick={() => desvincularAdmin(a.id)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <p className="rn-section-sub" style={{ marginTop: 0 }}>
              Vincular admin
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                className="rn-select"
                style={{ flex: 1, minWidth: 160 }}
                value={adminSelecionado}
                onChange={(e) => setAdminSelecionado(e.target.value)}
              >
                <option value="">Selecione um admin...</option>
                {todosAdmins
                  .filter((a) => !adminsGrupo.find((ag) => ag.id === a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome || a.email} ({a.role})
                    </option>
                  ))}
              </select>
              <button type="button" className="rn-btn rn-btn--primary" onClick={vincularAdmin}>
                +
              </button>
            </div>
          </div>
        </AdminModal>
    </div>
  );
}
