import React, { useState, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Plus, AlertTriangle } from "lucide-react";
import axios from "axios";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminModal from "../../components/admin/AdminModal";
import PageShell from "../../components/admin/PageShell";

export function UsuariosRadiusPanel({ embedded = false }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [planos, setPlanos] = useState([]);
  const [planoSelecionado, setPlanoSelecionado] = useState("");
  const [status, setStatus] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);

  const token = localStorage.getItem("admin_token");

  const carregarUsuarios = async () => {
    try {
      const res = await axios.get("/api/radius/usuarios", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsuarios(res.data);
    } catch {
      setStatus("Erro ao carregar usuários.");
    }
  };

  useEffect(() => {
    axios
      .get("/api/planos", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setPlanos(res.data))
      .catch(() => setStatus("Erro ao carregar planos."));

    carregarUsuarios();
  }, [token]);

  const handleSubmit = async () => {
    try {
      await axios.post(
        "/api/radius/criar-usuario",
        { username, password },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await axios.post(
        "/api/radius/vincular-plano",
        {
          username,
          planoId: planoSelecionado,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setStatus("Usuário criado e plano vinculado com sucesso!");
      setUsername("");
      setPassword("");
      setPlanoSelecionado("");
      setMostrarModal(false);

      carregarUsuarios();
    } catch (err) {
      setStatus("Erro ao criar usuário ou vincular plano.");
    }
  };

  const handleDeletar = async (username) => {
    if (window.confirm(`Tem certeza que deseja remover o usuário ${username}?`)) {
      try {
        await axios.delete(`/api/radius/usuarios/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        carregarUsuarios();
      } catch {
        alert("Erro ao deletar usuário");
      }
    }
  };

  const openModal = () => {
    setStatus("");
    setMostrarModal(true);
  };

  const toolbar = (
    <div className="rn-settings-toolbar">
      <p className="rn-muted" style={{ margin: 0, fontSize: 12 }}>
        {usuarios.length} usuário(s) cadastrado(s)
      </p>
      <button type="button" className="rn-btn rn-btn--primary rn-btn--sm" onClick={openModal}>
        <Plus size={14} />
        Novo Usuário
      </button>
    </div>
  );

  return (
    <PageShell embedded={embedded}>
      {embedded ? toolbar : (
        <AdminPageHeader
          title="Usuários Radius"
          subtitle={`${usuarios.length} usuário(s) cadastrado(s)`}
        >
          <button type="button" className="rn-btn rn-btn--primary" onClick={openModal}>
            <Plus size={16} />
            Novo Usuário
          </button>
        </AdminPageHeader>
      )}

      {status && !mostrarModal && (
        <div
          className={`rn-alert ${status.includes("Erro") ? "rn-alert--danger" : "rn-alert--warning"}`}
          style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{status}</span>
        </div>
      )}

      <div className="rn-card rn-table-wrap">
        <table className="rn-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Senha</th>
              <th>Plano</th>
              <th>NAS</th>
              <th style={{ textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, idx) => (
              <tr key={idx}>
                <td>
                  <p style={{ fontWeight: 600, margin: 0 }}>{u.username}</p>
                </td>
                <td className="rn-muted">{u.value}</td>
                <td>
                  {u.plano ? (
                    <span className="rn-pill rn-pill--info">{u.plano}</span>
                  ) : (
                    <span className="rn-muted">—</span>
                  )}
                </td>
                <td className="rn-muted">{u.nas || "—"}</td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="rn-btn rn-btn--danger rn-btn--sm"
                    onClick={() => handleDeletar(u.username)}
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="rn-muted" style={{ textAlign: "center", padding: "2rem" }}>
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={mostrarModal}
        onClose={() => setMostrarModal(false)}
        title="Novo Usuário RADIUS"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="rn-field">
            <label className="rn-label">Usuário</label>
            <input
              type="text"
              className="rn-input"
              placeholder="Nome de usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">Senha</label>
            <input
              type="password"
              className="rn-input"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">Plano</label>
            <select
              className="rn-select"
              value={planoSelecionado}
              onChange={(e) => setPlanoSelecionado(e.target.value)}
            >
              <option value="">Selecione um plano</option>
              {planos.map((plano) => (
                <option key={plano.id} value={plano.id}>
                  {plano.nome}
                </option>
              ))}
            </select>
          </div>
          {status && (
            <div
              className={`rn-alert ${status.includes("Erro") ? "rn-alert--danger" : "rn-alert--warning"}`}
              style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
            >
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{status}</span>
            </div>
          )}
        </div>
        <div className="rn-form-actions">
          <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setMostrarModal(false)}>
            Cancelar
          </button>
          <button type="button" className="rn-btn rn-btn--primary" onClick={handleSubmit}>
            Salvar
          </button>
        </div>
      </AdminModal>
    </PageShell>
  );
}

export default function UsuariosRadius() {
  const { empresaSlug } = useParams();
  return <Navigate to={`/admin/${empresaSlug}/radius?tab=usuarios`} replace />;
}
