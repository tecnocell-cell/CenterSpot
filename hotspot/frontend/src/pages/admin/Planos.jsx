import React, { useEffect, useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminModal from "../../components/admin/AdminModal";

const formInicial = {
  nome: "",
  descricao: "",
  duracao: 1,
  valor: "0,00",
  velocidade_download: 0,
  velocidade_upload: 0,
  mikrotik_id: "",
  address_pool: "default-dhcp",
  shared_users: 10,
  ativo: true,
};

export default function Planos() {
  const [planos, setPlanos] = useState([]);
  const [mikrotiks, setMikrotiks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(formInicial);
  const token = localStorage.getItem("admin_token");

  const carregarPlanos = async () => {
    try {
      const res = await fetch("/api/planos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Erro ao carregar planos");
      setPlanos(data);
    } catch (err) {
      alert("Erro ao carregar planos.");
    } finally {
      setLoading(false);
    }
  };

  const carregarMikrotiks = async () => {
    try {
      const res = await fetch("/api/mikrotiks", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMikrotiks(data);
    } catch (err) {
      alert("Erro ao carregar Mikrotiks");
    }
  };

  useEffect(() => {
    carregarPlanos();
    carregarMikrotiks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editando ? `/api/planos/${editando}` : "/api/planos";
      const method = editando ? "PUT" : "POST";
      const valorEmCentavos = Math.round(
        parseFloat(form.valor.replace(",", ".") || "0") * 100
      );

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: form.nome,
          descricao: form.descricao,
          valor: valorEmCentavos,
          duracao_minutos: parseInt(form.duracao),
          velocidade_down: parseInt(form.velocidade_download),
          velocidade_up: parseInt(form.velocidade_upload),
          mikrotik_id: parseInt(form.mikrotik_id),
          address_pool: form.address_pool,
          shared_users: parseInt(form.shared_users),
          ativo: form.ativo,
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar plano");
      setShowModal(false);
      setEditando(null);
      carregarPlanos();
    } catch (err) {
      alert("Erro ao salvar plano.");
    }
  };

  const handleEditar = (plano) => {
    setForm({
      nome: plano.nome,
      descricao: plano.descricao,
      valor: (plano.valor / 100).toFixed(2).replace(".", ","),
      duracao: plano.duracao_minutos,
      velocidade_download: plano.velocidade_down,
      velocidade_upload: plano.velocidade_up,
      mikrotik_id: plano.mikrotik_id,
      address_pool: plano.address_pool || "default-dhcp",
      shared_users: plano.shared_users || 10,
      ativo: plano.ativo,
    });
    setEditando(plano.id);
    setShowModal(true);
  };

  const handleRemover = async (id) => {
    if (!confirm("Deseja remover este plano?")) return;
    try {
      await fetch(`/api/planos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      carregarPlanos();
    } catch (err) {
      alert("Erro ao remover plano.");
    }
  };

  const handleCopiar = (plano) => {
    setForm({
      nome: plano.nome + " (cópia)",
      descricao: plano.descricao,
      valor: (plano.valor / 100).toFixed(2).replace(".", ","),
      duracao: plano.duracao_minutos,
      velocidade_download: plano.velocidade_down,
      velocidade_upload: plano.velocidade_up,
      mikrotik_id: plano.mikrotik_id,
      address_pool: plano.address_pool || "default-dhcp",
      shared_users: plano.shared_users || 10,
      ativo: plano.ativo,
    });
    setEditando(null);
    setShowModal(true);
  };

  const enviarParaMikrotik = async (id) => {
    if (!confirm("Deseja realmente enviar esse plano para o Mikrotik?")) return;
    try {
      const res = await fetch(`/api/planos/${id}/enviar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert("Plano enviado com sucesso para o Mikrotik!");
    } catch (err) {
      alert("Erro ao enviar plano: " + err.message);
    }
  };

  const openNovo = () => {
    setForm(formInicial);
    setEditando(null);
    setShowModal(true);
  };

  return (
    <AdminLayout>
      <div className="rn-page-stack">
        <AdminPageHeader
          title="Planos"
          subtitle={`${planos.length} plano(s) cadastrado(s)`}
        >
          <button type="button" className="rn-btn rn-btn--primary" onClick={openNovo}>
            <Plus size={16} />
            Novo Plano
          </button>
        </AdminPageHeader>

        {!loading && !planos.some((p) => p.nome === "LGPD") && (
          <div className="rn-alert rn-alert--warning" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong style={{ display: "block", fontSize: 13 }}>Plano LGPD não encontrado</strong>
              <span style={{ fontSize: 12, opacity: 0.9 }}>
                O portal LGPD precisa de um plano com o nome exato <strong>LGPD</strong>. Crie um plano gratuito com esse nome e vincule a um Mikrotik.
              </span>
            </div>
          </div>
        )}
        {!loading && !planos.some((p) => p.nome.toLowerCase() === "lead") && (
          <div className="rn-alert rn-alert--warning" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong style={{ display: "block", fontSize: 13 }}>Plano Lead não encontrado</strong>
              <span style={{ fontSize: 12, opacity: 0.9 }}>
                O portal de Leads precisa de um plano com o nome exato <strong>Lead</strong>. Crie um plano gratuito com esse nome e vincule a um Mikrotik.
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <p className="rn-muted" style={{ textAlign: "center", padding: "2.5rem 0" }}>
            Carregando...
          </p>
        ) : (
          <div className="rn-card rn-table-wrap">
            <table className="rn-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Duração</th>
                  <th>Velocidade</th>
                  <th>Preço</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {planos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p style={{ fontWeight: 600, margin: 0 }}>{p.nome}</p>
                      {p.descricao && (
                        <p className="rn-muted" style={{ fontSize: 11, margin: "2px 0 0" }}>
                          {p.descricao}
                        </p>
                      )}
                    </td>
                    <td>{p.duracao_minutos} min</td>
                    <td>
                      <span className="rn-muted" style={{ fontSize: 12 }}>
                        ⬇ {p.velocidade_down} Mbps
                        <br />
                        ⬆ {p.velocidade_up} Mbps
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>R$ {(p.valor / 100).toFixed(2)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`rn-pill ${p.ativo ? "rn-pill--success" : "rn-pill--neutral"}`}>
                        {p.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="rn-btn rn-btn--secondary rn-btn--sm"
                          onClick={() => handleEditar(p)}
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rn-btn rn-btn--secondary rn-btn--sm"
                          onClick={() => handleCopiar(p)}
                          title="Copiar"
                        >
                          Copiar
                        </button>
                        <button
                          type="button"
                          className="rn-btn rn-btn--danger rn-btn--sm"
                          onClick={() => handleRemover(p.id)}
                          title="Remover"
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
          title={editando ? "Editar Plano" : "Criar Plano"}
        >
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="rn-field">
                <label className="rn-label">Nome do Plano</label>
                <input
                  type="text"
                  className="rn-input"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="rn-field">
                <label className="rn-label">Descrição</label>
                <textarea
                  className="rn-textarea"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <div className="rn-form-grid-2">
                <div className="rn-field">
                  <label className="rn-label">Duração (minutos)</label>
                  <input
                    type="number"
                    className="rn-input"
                    value={form.duracao}
                    onChange={(e) => setForm({ ...form, duracao: e.target.value })}
                  />
                </div>
                <div className="rn-field">
                  <label className="rn-label">Valor (R$)</label>
                  <input
                    type="text"
                    className="rn-input"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  />
                </div>
              </div>
              <div className="rn-form-grid-2">
                <div className="rn-field">
                  <label className="rn-label">Download (Mbps)</label>
                  <input
                    type="number"
                    className="rn-input"
                    value={form.velocidade_download}
                    onChange={(e) => setForm({ ...form, velocidade_download: e.target.value })}
                  />
                </div>
                <div className="rn-field">
                  <label className="rn-label">Upload (Mbps)</label>
                  <input
                    type="number"
                    className="rn-input"
                    value={form.velocidade_upload}
                    onChange={(e) => setForm({ ...form, velocidade_upload: e.target.value })}
                  />
                </div>
              </div>
              <div className="rn-field">
                <label className="rn-label">Mikrotik</label>
                <select
                  className="rn-select"
                  value={form.mikrotik_id}
                  onChange={(e) => setForm({ ...form, mikrotik_id: e.target.value })}
                >
                  <option value="">Selecione o Mikrotik</option>
                  {mikrotiks.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                />
                Plano ativo
              </label>
            </div>
            <div className="rn-form-actions">
              <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="rn-btn rn-btn--primary">
                {editando ? "Salvar" : "Criar"}
              </button>
            </div>
          </form>
        </AdminModal>
      </div>
    </AdminLayout>
  );
}
