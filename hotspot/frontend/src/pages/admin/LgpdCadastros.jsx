import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import PageShell from "../../components/admin/PageShell";

export function LgpdCadastrosPanel({ embedded = false }) {
  const [registros, setRegistros] = useState([]);
  const [filteredRegistros, setFilteredRegistros] = useState([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const token = localStorage.getItem("admin_token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/lgpd", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message);
        setRegistros(data);
        setFilteredRegistros(data);
      } catch (err) {
        setErro("Erro ao buscar registros LGPD");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  useEffect(() => {
    const filtered = registros.filter((r) => {
      const searchTerm = busca.toLowerCase();
      return (
        r.nome?.toLowerCase().includes(searchTerm) ||
        r.email?.toLowerCase().includes(searchTerm) ||
        r.cpf?.includes(searchTerm) ||
        r.telefone?.includes(searchTerm)
      );
    });
    setFilteredRegistros(filtered);
  }, [busca, registros]);

  const maskCPF = (cpf) => {
    if (!cpf) return "---";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$2");
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stats = {
    total: registros.length,
    aceitos: registros.filter((r) => r.aceite).length,
    recusados: registros.filter((r) => !r.aceite).length,
  };

  const toolbar = (
    <div className="rn-settings-toolbar">
      <p className="rn-muted" style={{ margin: 0, fontSize: 12 }}>
        {stats.total} registro(s) cadastrado(s)
      </p>
    </div>
  );

  return (
    <PageShell embedded={embedded}>
        {embedded ? toolbar : (
          <AdminPageHeader
            title="Cadastros LGPD"
            subtitle="Gerenciamento de consentimentos e dados pessoais"
          />
        )}

        <div className="rn-kpi-grid">
          <div className="rn-kpi rn-kpi--highlight">
            <span className="rn-kpi__label">Total de Registros</span>
            <span className="rn-kpi__value">{stats.total}</span>
          </div>
          <div className="rn-kpi rn-kpi--success">
            <span className="rn-kpi__label">Aceites</span>
            <span className="rn-kpi__value">{stats.aceitos}</span>
          </div>
          <div className="rn-kpi rn-kpi--warning">
            <span className="rn-kpi__label">Recusados</span>
            <span className="rn-kpi__value">{stats.recusados}</span>
          </div>
        </div>

        <div className="rn-field">
          <input
            type="text"
            placeholder="Buscar por nome, email, CPF ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="rn-input"
          />
        </div>

        {erro && <div className="rn-alert rn-alert--danger">{erro}</div>}

        {loading ? (
          <p className="rn-muted" style={{ textAlign: "center", padding: "2.5rem 0" }}>
            Carregando registros...
          </p>
        ) : filteredRegistros.length === 0 ? (
          <div className="rn-card" style={{ padding: "2.5rem", textAlign: "center" }}>
            <p style={{ fontWeight: 600, margin: "0 0 0.5rem" }}>Nenhum registro encontrado</p>
            <p className="rn-muted" style={{ fontSize: 13, margin: 0 }}>
              {busca ? "Tente ajustar sua busca" : "Ainda não há cadastros LGPD"}
            </p>
          </div>
        ) : (
          <div className="rn-card rn-table-wrap">
            <table className="rn-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>CPF</th>
                  <th>MAC</th>
                  <th>IP</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistros.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.nome || "---"}</td>
                    <td className="rn-muted">{r.email || "---"}</td>
                    <td className="rn-muted">{r.telefone || "---"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{maskCPF(r.cpf)}</td>
                    <td className="rn-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {r.mac || "---"}
                    </td>
                    <td className="rn-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {r.ip || "---"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`rn-pill ${r.aceite ? "rn-pill--success" : "rn-pill--danger"}`}>
                        {r.aceite ? "Aceito" : "Recusado"}
                      </span>
                    </td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {formatDate(r.criado_em)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredRegistros.length > 0 && (
          <p className="rn-muted" style={{ textAlign: "center", fontSize: 12 }}>
            Exibindo {filteredRegistros.length} de {registros.length} registros
          </p>
        )}
    </PageShell>
  );
}

export default function LgpdCadastros() {
  const { empresaSlug } = useParams();
  return <Navigate to={`/admin/${empresaSlug}/clientes?tab=lgpd`} replace />;
}
