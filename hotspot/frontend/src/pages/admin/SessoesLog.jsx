import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Download, ChevronLeft, ChevronRight, Search } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import PageShell from "../../components/admin/PageShell";

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || bytes === 0) return "0 B";
  const num = Number(bytes);
  if (isNaN(num)) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let val = num;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return "-";
  const s = Number(seconds);
  if (isNaN(s) || s < 0) return "-";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(" ");
}

function fmtDateTime(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function SessoesLogPanel({ embedded = false }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);

  const [username, setUsername] = useState("");
  const [mac, setMac] = useState("");
  const [ip, setIp] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const token = localStorage.getItem("admin_token");

  const buildParams = (extraPage) => {
    const params = new URLSearchParams();
    if (username.trim()) params.set("username", username.trim());
    if (mac.trim()) params.set("mac", mac.trim());
    if (ip.trim()) params.set("ip", ip.trim());
    if (dataInicio) params.set("data_inicio", dataInicio);
    if (dataFim) params.set("data_fim", dataFim);
    if (extraPage !== undefined) {
      params.set("page", extraPage);
      params.set("per_page", perPage);
    }
    return params;
  };

  const fetchLogs = async (p = page) => {
    try {
      setLoading(true);
      const params = buildParams(p);
      const res = await fetch(`/api/radius-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setLogs(Array.isArray(json.data) ? json.data : []);
      setTotal(json.total || 0);
      setPage(json.page || 1);
    } catch (err) {
      console.error("Erro ao buscar logs:", err);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const handleClear = () => {
    setUsername("");
    setMac("");
    setIp("");
    setDataInicio("");
    setDataFim("");
    setPage(1);
    setTimeout(() => fetchLogs(1), 0);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const goPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    fetchLogs(p);
  };

  const exportCSV = () => {
    const params = buildParams();
    const url = `/api/radius-logs/export?${params.toString()}`;
    const a = document.createElement("a");
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.download = "radius-logs.csv";
        a.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => console.error("Erro ao exportar CSV:", err));
  };

  const toolbar = (
    <div className="rn-settings-toolbar">
      <p className="rn-muted" style={{ margin: 0, fontSize: 12 }}>
        {total} registro(s) no histórico
      </p>
      <button
        type="button"
        className="rn-btn rn-btn--secondary rn-btn--sm"
        onClick={exportCSV}
        title="Exportar CSV"
      >
        <Download size={14} />
        Exportar CSV
      </button>
    </div>
  );

  return (
    <PageShell embedded={embedded}>
      {embedded ? toolbar : (
        <AdminPageHeader title="Sessões RADIUS" subtitle={`${total} registro(s) no histórico`}>
          <button
            type="button"
            className="rn-btn rn-btn--secondary"
            onClick={exportCSV}
            title="Exportar CSV"
          >
            <Download size={16} />
            Exportar CSV
          </button>
        </AdminPageHeader>
      )}

      <form onSubmit={handleFilter} className="rn-card" style={{ padding: "1rem 1.25rem" }}>
        <div className="rn-form-grid-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          <div className="rn-field">
            <label className="rn-label">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: 54545454545"
              className="rn-input"
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">MAC</label>
            <input
              value={mac}
              onChange={(e) => setMac(e.target.value)}
              placeholder="Ex: AA:BB:CC:DD:EE:FF"
              className="rn-input"
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">IP</label>
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="Ex: 10.0.0.1"
              className="rn-input"
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="rn-input"
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="rn-input"
            />
          </div>
          <div className="rn-field" style={{ display: "flex", alignItems: "flex-end", gap: 8, flexWrap: "wrap" }}>
            <button type="submit" className="rn-btn rn-btn--primary">
              <Search size={16} />
              Filtrar
            </button>
            <button type="button" className="rn-btn rn-btn--secondary" onClick={handleClear}>
              Limpar
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <p className="rn-muted" style={{ textAlign: "center", padding: "2.5rem 0" }}>
          Carregando…
        </p>
      ) : (
        <div className="rn-card rn-table-wrap">
          <table className="rn-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>MAC</th>
                <th>IP</th>
                <th>NAS IP</th>
                <th>NAS Nome</th>
                <th>Conectado em</th>
                <th>Desconectado em</th>
                <th>Duração</th>
                <th>Bytes Entrada</th>
                <th>Bytes Saída</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="rn-muted" style={{ textAlign: "center", padding: "2rem" }}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((r, i) => (
                  <tr key={`${r.username}-${r.conectado_em}-${i}`}>
                    <td style={{ fontWeight: 600 }}>{r.username || "—"}</td>
                    <td className="rn-muted">{r.mac || "—"}</td>
                    <td className="rn-muted">{r.ip || "—"}</td>
                    <td className="rn-muted">{r.nas_ip || "—"}</td>
                    <td>{r.nas_nome || "—"}</td>
                    <td className="rn-muted">{fmtDateTime(r.conectado_em)}</td>
                    <td className="rn-muted">{fmtDateTime(r.desconectado_em)}</td>
                    <td className="rn-muted">{formatDuration(r.segundos_conectado)}</td>
                    <td className="rn-muted">{formatBytes(r.bytes_entrada)}</td>
                    <td className="rn-muted">{formatBytes(r.bytes_saida)}</td>
                    <td className="rn-muted">{r.motivo_desconexao || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span className="rn-muted" style={{ fontSize: 13 }}>
          Total: {total} registros · Página {page} de {totalPages}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => goPage(page - 1)}
            disabled={page <= 1}
            className="rn-btn rn-btn--secondary rn-btn--sm"
          >
            <ChevronLeft size={16} />
            Anterior
          </button>
          <button
            type="button"
            onClick={() => goPage(page + 1)}
            disabled={page >= totalPages}
            className="rn-btn rn-btn--secondary rn-btn--sm"
          >
            Próximo
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </PageShell>
  );
}

export default function SessoesLog() {
  const { empresaSlug } = useParams();
  return <Navigate to={`/admin/${empresaSlug}/radius?tab=log`} replace />;
}
