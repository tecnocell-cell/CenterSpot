import React, { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import PageShell from "../../components/admin/PageShell";

function formatDuracao(segundos) {
  if (!segundos) return "0h 0m";
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

function formatDateTime(dt) {
  if (!dt) return "-";
  return new Date(dt).toLocaleString("pt-BR");
}

export function CompliancePanel({ embedded = false }) {
  const [cpf, setCpf] = useState("");
  const [mac, setMac] = useState("");
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("admin_token");

  const buildParams = (extraPage) => {
    const params = new URLSearchParams();
    if (cpf.trim()) params.set("cpf", cpf.trim());
    if (mac.trim()) params.set("mac", mac.trim());
    if (ip.trim()) params.set("ip", ip.trim());
    if (username.trim()) params.set("username", username.trim());
    if (dataInicio) params.set("data_inicio", dataInicio);
    if (dataFim) params.set("data_fim", dataFim);
    params.set("page", extraPage || page);
    params.set("per_page", perPage);
    return params.toString();
  };

  const buscar = async (pg = 1) => {
    try {
      setLoading(true);
      setPage(pg);
      const res = await fetch(`/api/compliance?${buildParams(pg)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setLogs(json.data || []);
      setTotal(json.total || 0);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (cpf.trim()) params.set("cpf", cpf.trim());
      if (mac.trim()) params.set("mac", mac.trim());
      if (ip.trim()) params.set("ip", ip.trim());
      if (username.trim()) params.set("username", username.trim());
      if (dataInicio) params.set("data_inicio", dataInicio);
      if (dataFim) params.set("data_fim", dataFim);

      const res = await fetch(`/api/compliance/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "compliance_logs.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar CSV:", err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    buscar(1);
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <PageShell embedded={embedded}>
      {!embedded && (
        <AdminPageHeader
          title="Marco Civil — Logs de Conexão"
          subtitle="Consulta de registros de conexão conforme Marco Civil da Internet (Lei 12.965/2014)"
        >
          <button type="button" className="rn-btn rn-btn--secondary" onClick={exportarCSV}>
            <Download size={16} />
            Exportar CSV
          </button>
        </AdminPageHeader>
      )}

      <form onSubmit={handleSubmit} className="rn-card" style={{ padding: "1.25rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <div className="rn-field">
            <label className="rn-label">CPF</label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              className="rn-input"
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">MAC</label>
            <input
              type="text"
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
              className="rn-input"
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">IP</label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.0.1"
              className="rn-input"
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="usuario"
              className="rn-input"
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">Data Início</label>
            <input
              type="datetime-local"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="rn-input"
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">Data Fim</label>
            <input
              type="datetime-local"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="rn-input"
            />
          </div>
        </div>
        <div className="rn-form-actions" style={{ marginTop: "1rem", paddingTop: 0, borderTop: "none" }}>
          <button type="submit" disabled={loading} className="rn-btn rn-btn--primary">
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      <div className="rn-card">
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span className="rn-muted" style={{ fontSize: 12 }}>
            {total > 0 ? `${total} registro(s) encontrado(s)` : "Nenhum registro"}
          </span>
          {totalPages > 1 && (
            <span className="rn-muted" style={{ fontSize: 11 }}>
              Página {page} de {totalPages}
            </span>
          )}
        </div>

        <div className="rn-table-wrap">
          <table className="rn-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>CPF</th>
                <th>MAC</th>
                <th>IP</th>
                <th>NAS IP</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Duração</th>
                <th>Entrada</th>
                <th>Saída</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan="10" className="rn-muted" style={{ textAlign: "center", padding: "2rem" }}>
                    Utilize os filtros acima para buscar registros de conexão.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan="10" className="rn-muted" style={{ textAlign: "center", padding: "2rem" }}>
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{log.username}</td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {log.cpf || "-"}
                    </td>
                    <td className="rn-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {log.mac}
                    </td>
                    <td className="rn-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {log.ip_atribuido}
                    </td>
                    <td className="rn-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {log.nas_ip}
                    </td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {formatDateTime(log.inicio_conexao)}
                    </td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {formatDateTime(log.fim_conexao)}
                    </td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {formatDuracao(log.duracao_segundos)}
                    </td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {formatBytes(log.bytes_entrada)}
                    </td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {formatBytes(log.bytes_saida)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => buscar(page - 1)}
              disabled={page <= 1}
              className="rn-btn rn-btn--secondary rn-btn--sm"
            >
              Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
              let pageNum;
              if (totalPages <= 7) {
                pageNum = idx + 1;
              } else if (page <= 4) {
                pageNum = idx + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + idx;
              } else {
                pageNum = page - 3 + idx;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => buscar(pageNum)}
                  className={`rn-btn rn-btn--sm ${pageNum === page ? "rn-btn--primary" : "rn-btn--secondary"}`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => buscar(page + 1)}
              disabled={page >= totalPages}
              className="rn-btn rn-btn--secondary rn-btn--sm"
            >
              Próximo
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function Compliance() {
  const { empresaSlug } = useParams();
  return <Navigate to={`/admin/${empresaSlug}/radius?tab=compliance`} replace />;
}
