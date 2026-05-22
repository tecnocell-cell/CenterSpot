import React, { useState, useEffect, useCallback } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminModal from "../../components/admin/AdminModal";
import PageShell from "../../components/admin/PageShell";

const API = "";

const statusLabels = {
  novo: "Novo",
  contactado: "Contactado",
  convertido: "Convertido",
  descartado: "Descartado",
};

const tabs = [
  { key: "todos", label: "Todos" },
  { key: "novo", label: "Novo" },
  { key: "contactado", label: "Contactado" },
  { key: "convertido", label: "Convertido" },
  { key: "descartado", label: "Descartado" },
];

export function LeadsPanel({ embedded = false }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", cpf: "", observacoes: "" });

  const token = localStorage.getItem("admin_token");

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "todos") params.append("status", statusFilter);
      if (search) params.append("q", search);

      const res = await fetch(`${API}/api/leads?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar leads:", err);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await fetch(`${API}/api/leads/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchLeads();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este lead?")) return;
    try {
      await fetch(`${API}/api/leads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchLeads();
    } catch (err) {
      console.error("Erro ao deletar lead:", err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API}/api/leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, origem: "manual" }),
      });
      setShowModal(false);
      setForm({ nome: "", email: "", telefone: "", cpf: "", observacoes: "" });
      fetchLeads();
    } catch (err) {
      console.error("Erro ao criar lead:", err);
    }
  };

  const handleExport = () => {
    window.open(`${API}/api/leads/export?token=${token}`, "_blank");
  };

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toolbar = (
    <div className="rn-settings-toolbar">
      <p className="rn-muted" style={{ margin: 0, fontSize: 12 }}>
        {leads.length} lead(s)
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="rn-btn rn-btn--secondary rn-btn--sm" onClick={handleExport}>
          Exportar CSV
        </button>
        <button type="button" className="rn-btn rn-btn--primary rn-btn--sm" onClick={() => setShowModal(true)}>
          <Plus size={14} />
          Novo Lead
        </button>
      </div>
    </div>
  );

  return (
    <PageShell embedded={embedded}>
        {embedded ? toolbar : (
          <AdminPageHeader title="Leads" subtitle="Gerencie seus leads e contatos">
            <button type="button" className="rn-btn rn-btn--secondary" onClick={handleExport}>
              Exportar CSV
            </button>
            <button type="button" className="rn-btn rn-btn--primary" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              Novo Lead
            </button>
          </AdminPageHeader>
        )}

        <div className="rn-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`rn-tab ${statusFilter === tab.key ? "active" : ""}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rn-field" style={{ maxWidth: 420 }}>
          <input
            type="text"
            placeholder="Buscar por nome, email ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rn-input"
          />
        </div>

        <div className="rn-card rn-table-wrap">
          <table className="rn-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>CPF</th>
                <th>Status</th>
                <th>Origem</th>
                <th>Data</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="rn-muted" style={{ textAlign: "center", padding: "2rem" }}>
                    Carregando...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="rn-muted" style={{ textAlign: "center", padding: "2rem" }}>
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: 500 }}>{lead.nome || "-"}</td>
                    <td className="rn-muted">{lead.email || "-"}</td>
                    <td className="rn-muted">{lead.telefone || "-"}</td>
                    <td className="rn-muted">{lead.cpf || "-"}</td>
                    <td>
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className="rn-select"
                        style={{ width: "auto", minWidth: 130, fontSize: 12 }}
                      >
                        {Object.entries(statusLabels).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="rn-muted" style={{ textTransform: "capitalize" }}>
                      {lead.origem}
                    </td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {formatDate(lead.criado_em)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="rn-btn rn-btn--danger rn-btn--sm"
                        onClick={() => handleDelete(lead.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminModal open={showModal} onClose={() => setShowModal(false)} title="Novo Lead">
          <form onSubmit={handleCreate}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="rn-field">
                <label className="rn-label">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="rn-input"
                  required
                />
              </div>
              <div className="rn-field">
                <label className="rn-label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rn-input"
                />
              </div>
              <div className="rn-form-grid-2">
                <div className="rn-field">
                  <label className="rn-label">Telefone</label>
                  <input
                    type="text"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    className="rn-input"
                  />
                </div>
                <div className="rn-field">
                  <label className="rn-label">CPF</label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    className="rn-input"
                  />
                </div>
              </div>
              <div className="rn-field">
                <label className="rn-label">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={3}
                  className="rn-textarea"
                />
              </div>
            </div>
            <div className="rn-form-actions">
              <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="rn-btn rn-btn--primary">
                Criar Lead
              </button>
            </div>
          </form>
        </AdminModal>
    </PageShell>
  );
}

export default function Leads() {
  const { empresaSlug } = useParams();
  return <Navigate to={`/admin/${empresaSlug}/clientes?tab=leads`} replace />;
}
