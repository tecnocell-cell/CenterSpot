import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminModal from "../../components/admin/AdminModal";

export default function Campanhas() {
  const { empresaSlug } = useParams();
  const [campanhas, setCampanhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "" });
  const [salvando, setSalvando] = useState(false);
  const token = localStorage.getItem("admin_token");

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campanhas", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar campanhas");
      setCampanhas(data.data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleCriar = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return alert("Informe o nome da campanha.");
    setSalvando(true);
    try {
      const res = await fetch("/api/campanhas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nome: form.nome, descricao: form.descricao }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar campanha");
      setShowModal(false);
      setForm({ nome: "", descricao: "" });
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleToggleAtivo = async (c) => {
    try {
      const res = await fetch(`/api/campanhas/${c.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !c.ativo }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar campanha");
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletar = async (id) => {
    if (!confirm("Deseja realmente excluir esta campanha?")) return;
    try {
      const res = await fetch(`/api/campanhas/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao excluir campanha");
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="rn-page-stack">
        <AdminPageHeader
          title="Campanhas"
          subtitle={`${campanhas.length} campanha(s) cadastrada(s)`}
        >
          <button
            type="button"
            className="rn-btn rn-btn--primary"
            onClick={() => {
              setForm({ nome: "", descricao: "" });
              setShowModal(true);
            }}
          >
            <Plus size={16} />
            Nova Campanha
          </button>
        </AdminPageHeader>

        {loading ? (
          <p className="rn-muted" style={{ textAlign: "center", padding: "2.5rem 0" }}>
            Carregando...
          </p>
        ) : campanhas.length === 0 ? (
          <div className="rn-card" style={{ padding: "2.5rem", textAlign: "center" }}>
            <p className="rn-muted">Nenhuma campanha cadastrada.</p>
          </div>
        ) : (
          <div className="rn-card rn-table-wrap">
            <table className="rn-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th style={{ textAlign: "center" }}>Itens</th>
                  <th style={{ textAlign: "center" }}>Views</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {campanhas.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p style={{ fontWeight: 600, margin: 0 }}>{c.nome}</p>
                    </td>
                    <td className="rn-muted" style={{ maxWidth: 240 }}>
                      {c.descricao || "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>{c.total_itens ?? 0}</td>
                    <td style={{ textAlign: "center" }}>{c.views ?? 0}</td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleAtivo(c)}
                        className={`rn-pill ${c.ativo ? "rn-pill--success" : "rn-pill--neutral"}`}
                        title="Clique para alternar"
                        style={{ cursor: "pointer", border: "none", font: "inherit" }}
                      >
                        {c.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <Link
                          to={`/admin/${empresaSlug}/campanhas/${c.id}`}
                          className="rn-btn rn-btn--secondary rn-btn--sm"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          className="rn-btn rn-btn--danger rn-btn--sm"
                          onClick={() => handleDeletar(c.id)}
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

        <AdminModal open={showModal} onClose={() => setShowModal(false)} title="Nova Campanha">
          <form onSubmit={handleCriar}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="rn-field">
                <label className="rn-label">
                  Nome <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="rn-input"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </div>
              <div className="rn-field">
                <label className="rn-label">Descrição</label>
                <textarea
                  className="rn-textarea"
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
            </div>
            <div className="rn-form-actions">
              <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="rn-btn rn-btn--primary" disabled={salvando}>
                {salvando ? "Criando..." : "Criar"}
              </button>
            </div>
          </form>
        </AdminModal>
      </div>
    </AdminLayout>
  );
}
