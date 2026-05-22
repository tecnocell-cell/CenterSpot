import React, { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";

const API = import.meta.env.VITE_API_URL || "";

export default function EmpresasAdmin() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: "", cnpj: "", email: "", telefone: "" });
  const [erro, setErro] = useState(null);

  const [showAdminsModal, setShowAdminsModal] = useState(null);
  const [adminsEmpresa, setAdminsEmpresa] = useState([]);
  const [todosAdmins, setTodosAdmins] = useState([]);
  const [vinculandoAdmin, setVinculandoAdmin] = useState({ admin_id: "", role: "operator" });
  const [uploadingLogo, setUploadingLogo] = useState(null);

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const handleLogoUpload = async (empresaId, file) => {
    if (!file) return;
    setUploadingLogo(empresaId);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch(`${API}/api/empresas/${empresaId}/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) fetchEmpresas();
      else alert("Erro ao enviar logo");
    } catch {
      alert("Erro de conexão");
    } finally {
      setUploadingLogo(null);
    }
  };

  const fetchEmpresas = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/empresas`, { headers });
      if (res.ok) setEmpresas(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    try {
      const url = editId ? `${API}/api/empresas/${editId}` : `${API}/api/empresas`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (res.ok) {
        setShowModal(false);
        setEditId(null);
        setForm({ nome: "", cnpj: "", email: "", telefone: "" });
        fetchEmpresas();
      } else {
        const data = await res.json();
        setErro(data.message || "Erro ao salvar");
      }
    } catch {
      setErro("Erro de conexão");
    }
  };

  const handleEdit = (empresa) => {
    setEditId(empresa.id);
    setForm({
      nome: empresa.nome,
      cnpj: empresa.cnpj || "",
      email: empresa.email,
      telefone: empresa.telefone || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id, slug) => {
    if (slug === "default") return alert("Não é possível deletar a empresa padrão");
    if (!confirm("Deseja realmente deletar esta empresa? Todos os dados serão perdidos!")) return;
    await fetch(`${API}/api/empresas/${id}`, { method: "DELETE", headers });
    fetchEmpresas();
  };

  const openAdminsModal = async (empresaId) => {
    setShowAdminsModal(empresaId);
    const [adminsRes, todosRes] = await Promise.all([
      fetch(`${API}/api/empresas/${empresaId}/admins`, { headers }),
      fetch(`${API}/api/empresas/admins/todos`, { headers }),
    ]);
    setAdminsEmpresa(await adminsRes.json());
    setTodosAdmins(await todosRes.json());
  };

  const vincularAdmin = async () => {
    if (!vinculandoAdmin.admin_id) return;
    await fetch(`${API}/api/empresas/${showAdminsModal}/vincular-admin`, {
      method: "POST",
      headers,
      body: JSON.stringify(vinculandoAdmin),
    });
    setVinculandoAdmin({ admin_id: "", role: "operator" });
    openAdminsModal(showAdminsModal);
  };

  const desvincularAdmin = async (adminId) => {
    if (!confirm("Remover este admin da empresa?")) return;
    await fetch(`${API}/api/empresas/${showAdminsModal}/desvincular-admin/${adminId}`, {
      method: "DELETE",
      headers,
    });
    openAdminsModal(showAdminsModal);
  };

  const openNova = () => {
    setEditId(null);
    setForm({ nome: "", cnpj: "", email: "", telefone: "" });
    setErro(null);
    setShowModal(true);
  };

  return (
    <AdminLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="rn-page-title">Empresas</h1>
            <p className="rn-page-sub">{empresas.length} empresa(s) cadastrada(s)</p>
          </div>
          <button type="button" className="rn-btn rn-btn--primary" onClick={openNova}>
            <Plus size={16} />
            Nova Empresa
          </button>
        </div>

        {loading ? (
          <p className="rn-muted" style={{ textAlign: "center", padding: "2.5rem 0" }}>
            Carregando...
          </p>
        ) : (
          <div className="rn-card rn-table-wrap">
            <table className="rn-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>Logo</th>
                  <th>Empresa</th>
                  <th>CNPJ</th>
                  <th>Contato</th>
                  <th style={{ textAlign: "center" }}>Stats</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <label
                        style={{
                          cursor: "pointer",
                          display: "block",
                          width: 40,
                          height: 40,
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          position: "relative",
                        }}
                      >
                        {e.logo_url ? (
                          <img src={e.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                          <span style={{ fontSize: 10, color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            📷
                          </span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          style={{ display: "none" }}
                          disabled={uploadingLogo === e.id}
                          onChange={(ev) => handleLogoUpload(e.id, ev.target.files[0])}
                        />
                      </label>
                    </td>
                    <td>
                      <p style={{ fontWeight: 600, margin: 0 }}>{e.nome}</p>
                      <p className="rn-muted" style={{ fontSize: 11, margin: "2px 0 0" }}>
                        /{e.slug}
                      </p>
                    </td>
                    <td className="rn-muted">{e.cnpj || "—"}</td>
                    <td>
                      <p style={{ fontSize: 12, margin: 0 }}>{e.email}</p>
                      {e.telefone && (
                        <p className="rn-muted" style={{ fontSize: 11, margin: "2px 0 0" }}>
                          {e.telefone}
                        </p>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                        <span className="rn-pill rn-pill--info">{e.total_mikrotiks || 0} MKT</span>
                        <span className="rn-pill rn-pill--success">{e.total_planos || 0} Planos</span>
                        <span className="rn-pill rn-pill--warning">{e.total_admins || 0} Admins</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`rn-pill ${e.ativo ? "rn-pill--success" : "rn-pill--danger"}`}>
                        {e.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button type="button" className="rn-btn rn-btn--secondary rn-btn--sm" onClick={() => openAdminsModal(e.id)} title="Gerenciar Admins">
                          👥
                        </button>
                        <button type="button" className="rn-btn rn-btn--secondary rn-btn--sm" onClick={() => handleEdit(e)}>
                          Editar
                        </button>
                        {e.slug !== "default" && (
                          <button type="button" className="rn-btn rn-btn--danger rn-btn--sm" onClick={() => handleDelete(e.id, e.slug)}>
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="rn-modal-overlay" onClick={() => setShowModal(false)}>
            <form
              onSubmit={handleSubmit}
              className="rn-modal"
              onClick={(ev) => ev.stopPropagation()}
            >
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 1rem" }}>
                {editId ? "Editar Empresa" : "Nova Empresa"}
              </h2>
              {erro && <div className="rn-alert rn-alert--danger">{erro}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="rn-field">
                  <label className="rn-label">Nome *</label>
                  <input
                    type="text"
                    required
                    className="rn-input"
                    value={form.nome}
                    onChange={(ev) => setForm({ ...form, nome: ev.target.value })}
                  />
                </div>
                <div className="rn-field">
                  <label className="rn-label">Email *</label>
                  <input
                    type="email"
                    required
                    className="rn-input"
                    value={form.email}
                    onChange={(ev) => setForm({ ...form, email: ev.target.value })}
                  />
                </div>
                <div className="rn-field">
                  <label className="rn-label">CNPJ</label>
                  <input
                    type="text"
                    className="rn-input"
                    value={form.cnpj}
                    onChange={(ev) => setForm({ ...form, cnpj: ev.target.value })}
                  />
                </div>
                <div className="rn-field">
                  <label className="rn-label">Telefone</label>
                  <input
                    type="text"
                    className="rn-input"
                    value={form.telefone}
                    onChange={(ev) => setForm({ ...form, telefone: ev.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button type="submit" className="rn-btn rn-btn--primary" style={{ flex: 1 }}>
                  {editId ? "Salvar" : "Criar"}
                </button>
                <button type="button" className="rn-btn rn-btn--secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {showAdminsModal && (
          <div className="rn-modal-overlay" onClick={() => setShowAdminsModal(null)}>
            <div className="rn-modal rn-modal--lg" onClick={(ev) => ev.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Admins vinculados</h2>
                <button type="button" className="rn-btn rn-btn--ghost rn-btn--sm" onClick={() => setShowAdminsModal(null)}>
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {adminsEmpresa.length === 0 && <p className="rn-muted">Nenhum admin vinculado</p>}
                {adminsEmpresa.map((a) => (
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
                        {a.email} · {a.role_empresa}
                      </p>
                    </div>
                    <button type="button" className="rn-btn rn-btn--danger rn-btn--sm" onClick={() => desvincularAdmin(a.id)}>
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
                    value={vinculandoAdmin.admin_id}
                    onChange={(ev) => setVinculandoAdmin({ ...vinculandoAdmin, admin_id: ev.target.value })}
                  >
                    <option value="">Selecione um admin...</option>
                    {todosAdmins
                      .filter((a) => !adminsEmpresa.find((ae) => ae.id === a.id))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome || a.email} ({a.role})
                        </option>
                      ))}
                  </select>
                  <select
                    className="rn-select"
                    style={{ width: 120 }}
                    value={vinculandoAdmin.role}
                    onChange={(ev) => setVinculandoAdmin({ ...vinculandoAdmin, role: ev.target.value })}
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="operator">Operator</option>
                  </select>
                  <button type="button" className="rn-btn rn-btn--primary" onClick={vincularAdmin}>
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
