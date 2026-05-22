import React, { useEffect, useState, useRef } from "react";
import { MessageCircle, RefreshCw, Trash2 } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminModal from "../../components/admin/AdminModal";

export default function WhatsApp() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [mensagemTeste, setMensagemTeste] = useState({ telefone: "", mensagem: "" });
  const [envioResult, setEnvioResult] = useState(null);
  const [config, setConfig] = useState({ api_url: "", api_key: "", instance_name: "" });
  const [configSaved, setConfigSaved] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const token = localStorage.getItem("admin_token");
  const pollingRef = useRef(null);

  // Historico de envios
  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsFilter, setLogsFilter] = useState({ status: "", telefone: "" });
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [cleanupDate, setCleanupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [showCleanup, setShowCleanup] = useState(false);
  const PER_PAGE = 20;

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchStatus();
    fetchConfig();
    fetchLogs();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  useEffect(() => { fetchLogs(); /* eslint-disable-next-line */ }, [logsPage, logsFilter.status]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({ page: logsPage, per_page: PER_PAGE });
      if (logsFilter.status) params.append("status", logsFilter.status);
      if (logsFilter.telefone) params.append("telefone", logsFilter.telefone);
      const res = await fetch(`/api/whatsapp/logs?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setLogsTotal(data.total || 0);
      }
    } catch (err) { console.error("Erro ao buscar logs:", err); }
  };

  const handleLimparLogs = async () => {
    if (!confirm(`Remover todos os logs anteriores a ${cleanupDate}?`)) return;
    try {
      const res = await fetch(`/api/whatsapp/logs?antes_de=${cleanupDate}`, {
        method: "DELETE", headers,
      });
      const data = await res.json();
      if (res.ok) {
        alert(`${data.removidos} logs removidos.`);
        setShowCleanup(false);
        setLogsPage(1);
        fetchLogs();
      }
    } catch (err) {
      alert("Erro ao limpar logs");
    }
  };

  const formatDate = (s) => {
    if (!s) return "";
    const d = new Date(s);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const statusBadge = (s) => {
    if (s === "ok") return <span className="rn-pill rn-pill--success">OK</span>;
    if (s === "erro") return <span className="rn-pill rn-pill--danger">Erro</span>;
    if (s === "skipped") return <span className="rn-pill rn-pill--neutral">Pulado</span>;
    return <span className="rn-muted" style={{ fontSize: 12 }}>{s}</span>;
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp/config", { headers });
      const data = await res.json();
      setConfig({ api_url: data.api_url || "", api_key: data.api_key || "", instance_name: data.instance_name || "" });
    } catch (err) { console.error("Erro ao buscar config:", err); }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSaved(null);
    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setConfigSaved({ ok: true, msg: "Configuracao salva!" });
        fetchStatus();
      } else {
        setConfigSaved({ ok: false, msg: "Erro ao salvar." });
      }
    } catch (err) {
      setConfigSaved({ ok: false, msg: "Erro de conexao." });
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/instance/status", { headers });
      const data = await res.json();
      setStatus(data);
      // Se estava mostrando QR e agora conectou, limpar QR
      if (data.state === "open") {
        setQrCode(null);
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      }
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/whatsapp/instance/create", { method: "POST", headers });
      await res.json();
      await fetchStatus();
      // Apos criar, buscar QR automaticamente
      handleConnect();
    } catch (err) {
      console.error("Erro ao criar instancia:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/whatsapp/instance/qrcode", { headers });
      const data = await res.json();
      if (data.base64) {
        setQrCode(data.base64);
        // Polling para verificar quando conectar
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(fetchStatus, 5000);
      } else if (data.instance?.state === "open") {
        setQrCode(null);
        await fetchStatus();
      }
    } catch (err) {
      console.error("Erro ao obter QR:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestart = async () => {
    setActionLoading(true);
    try {
      await fetch("/api/whatsapp/instance/restart", { method: "POST", headers });
      setTimeout(fetchStatus, 3000);
    } catch (err) {
      console.error("Erro ao reiniciar:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Desconectar o WhatsApp? Voce precisara escanear o QR Code novamente.")) return;
    setActionLoading(true);
    try {
      await fetch("/api/whatsapp/instance/logout", { method: "POST", headers });
      setQrCode(null);
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      console.error("Erro ao desconectar:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remover a instancia completamente? Todos os dados serao perdidos.")) return;
    setActionLoading(true);
    try {
      await fetch("/api/whatsapp/instance/delete", { method: "DELETE", headers });
      setQrCode(null);
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      console.error("Erro ao remover:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnviarTeste = async (e) => {
    e.preventDefault();
    setEnvioResult(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: `55${mensagemTeste.telefone}`, mensagem: mensagemTeste.mensagem }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnvioResult({ ok: true, msg: "Mensagem enviada com sucesso!" });
        setMensagemTeste({ telefone: "", mensagem: "" });
      } else {
        setEnvioResult({ ok: false, msg: data.error || "Erro ao enviar." });
      }
    } catch (err) {
      setEnvioResult({ ok: false, msg: "Erro de conexao." });
    }
  };

  const statePill = (state) => {
    const labels = {
      open: { text: "Conectado", cls: "rn-pill--success" },
      close: { text: "Desconectado", cls: "rn-pill--danger" },
      connecting: { text: "Conectando...", cls: "rn-pill--warning" },
    };
    return labels[state] || { text: state || "Desconhecido", cls: "rn-pill--neutral" };
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="rn-page-stack">
          <AdminPageHeader title="WhatsApp" subtitle="Integração com Evolution API e histórico de envios." />
          <div className="rn-card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted-foreground)" }}>
            Carregando…
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="rn-page-stack">
        <AdminPageHeader
          title="WhatsApp"
          subtitle="Gerencie a instância Evolution API, envie testes e consulte o histórico de mensagens."
        />

        {/* Status Card */}
        <div className="rn-card" style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Status da Instancia</h2>
            <button type="button" className="rn-btn rn-btn--ghost rn-btn--sm" onClick={fetchStatus}>
              <RefreshCw size={14} />
              Atualizar
            </button>
          </div>

          {!status?.exists ? (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <MessageCircle size={48} strokeWidth={1.25} style={{ margin: "0 auto 1rem", opacity: 0.35, color: "var(--muted-foreground)" }} />
              <p className="rn-muted" style={{ marginBottom: "1rem" }}>Nenhuma instancia WhatsApp configurada.</p>
              <button
                type="button"
                onClick={handleCreate}
                disabled={actionLoading}
                className="rn-btn rn-btn--success"
              >
                {actionLoading ? "Criando..." : "Criar Instancia"}
              </button>
            </div>
          ) : (
            <div>
              <div className="rn-kpi-grid" style={{ marginBottom: "1.25rem" }}>
                <div className="rn-kpi rn-kpi--success">
                  <span className="rn-kpi__label">Status</span>
                  <span className={`rn-pill ${statePill(status.state).cls}`} style={{ alignSelf: "flex-start" }}>
                    {statePill(status.state).text}
                  </span>
                </div>
                <div className="rn-kpi rn-kpi--info">
                  <span className="rn-kpi__label">Numero</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{status.number || status.owner_jid?.split("@")[0] || "-"}</span>
                </div>
                <div className="rn-kpi rn-kpi--highlight">
                  <span className="rn-kpi__label">Nome do Perfil</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{status.profile_name || "-"}</span>
                </div>
                <div className="rn-kpi">
                  <span className="rn-kpi__label">Instancia</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-mono)" }}>{status.instance_name}</span>
                </div>
              </div>

              {status.state === "open" && (
                <div className="rn-kpi-grid" style={{ marginBottom: "1.25rem" }}>
                  <div className="rn-kpi rn-kpi--info" style={{ textAlign: "center" }}>
                    <span className="rn-kpi__label">Mensagens</span>
                    <span className="rn-kpi__value">{status.messages_count}</span>
                  </div>
                  <div className="rn-kpi rn-kpi--success" style={{ textAlign: "center" }}>
                    <span className="rn-kpi__label">Contatos</span>
                    <span className="rn-kpi__value">{status.contacts_count}</span>
                  </div>
                  <div className="rn-kpi rn-kpi--highlight" style={{ textAlign: "center" }}>
                    <span className="rn-kpi__label">Conversas</span>
                    <span className="rn-kpi__value">{status.chats_count}</span>
                  </div>
                </div>
              )}

              {qrCode && status.state !== "open" && (
                <div className="rn-card" style={{ padding: "1.5rem", marginBottom: "1.25rem", textAlign: "center", boxShadow: "none", background: "var(--surface-2)" }}>
                  <p className="rn-muted" style={{ fontSize: 13, marginBottom: "1rem" }}>Escaneie o QR Code com seu WhatsApp:</p>
                  <img src={qrCode} alt="QR Code WhatsApp" style={{ margin: "0 auto", width: 256, height: 256, borderRadius: "var(--radius-md)", background: "#fff", padding: 8 }} />
                  <p className="rn-muted" style={{ fontSize: 11, marginTop: "0.75rem" }}>Abra o WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho</p>
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {status.state !== "open" && (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={actionLoading}
                    className="rn-btn rn-btn--success rn-btn--sm"
                  >
                    {actionLoading ? "..." : "Conectar (QR Code)"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleRestart}
                  disabled={actionLoading}
                  className="rn-btn rn-btn--secondary rn-btn--sm"
                >
                  Reiniciar
                </button>
                {status.state === "open" && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={actionLoading}
                    className="rn-btn rn-btn--secondary rn-btn--sm"
                  >
                    Desconectar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="rn-btn rn-btn--danger rn-btn--sm"
                >
                  Remover Instancia
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Configuracao Evolution API */}
        <div className="rn-card" style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Configuracao da API</h2>
            <button type="button" className="rn-btn rn-btn--ghost rn-btn--sm" onClick={() => setShowConfig(!showConfig)}>
              {showConfig ? "Ocultar" : "Editar"}
            </button>
          </div>

          {!showConfig ? (
            <div className="rn-kpi-grid">
              <div className="rn-kpi">
                <span className="rn-kpi__label">URL da API</span>
                <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{config.api_url || "-"}</span>
              </div>
              <div className="rn-kpi">
                <span className="rn-kpi__label">API Key</span>
                <span style={{ fontSize: 13, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{config.api_key ? "••••••••" + config.api_key.slice(-8) : "-"}</span>
              </div>
              <div className="rn-kpi">
                <span className="rn-kpi__label">Nome da Instancia</span>
                <span style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>{config.instance_name || "-"}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveConfig} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="rn-field">
                <label className="rn-label">URL da Evolution API</label>
                <input
                  type="text"
                  placeholder="http://localhost:8080"
                  value={config.api_url}
                  onChange={(e) => setConfig(prev => ({ ...prev, api_url: e.target.value }))}
                  className="rn-input"
                />
              </div>
              <div className="rn-field">
                <label className="rn-label">API Key</label>
                <input
                  type="text"
                  placeholder="Chave da API"
                  value={config.api_key}
                  onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                  className="rn-input"
                />
              </div>
              <div className="rn-field">
                <label className="rn-label">Nome da Instancia</label>
                <input
                  type="text"
                  placeholder="empresa_1"
                  value={config.instance_name}
                  onChange={(e) => setConfig(prev => ({ ...prev, instance_name: e.target.value }))}
                  className="rn-input"
                />
              </div>
              {configSaved && (
                <div
                  className={`rn-alert ${configSaved.ok ? "" : "rn-alert--danger"}`}
                  style={configSaved.ok ? { fontSize: 13, background: "var(--success-soft)", color: "var(--success-fg)", border: "1px solid color-mix(in oklab, var(--success) 25%, transparent)" } : { fontSize: 13 }}
                >
                  {configSaved.msg}
                </div>
              )}
              <button type="submit" className="rn-btn rn-btn--primary rn-btn--sm" style={{ alignSelf: "flex-start" }}>
                Salvar Configuracao
              </button>
            </form>
          )}
        </div>

        {/* Enviar mensagem teste */}
        {status?.exists && status?.state === "open" && (
          <div className="rn-card" style={{ padding: "1.25rem 1.5rem" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 1rem" }}>Enviar Mensagem de Teste</h2>

            <form onSubmit={handleEnviarTeste} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="rn-field">
                <label className="rn-label">Telefone (DDD + numero)</label>
                <div style={{ display: "flex" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "0 0.75rem", background: "var(--surface-2)", border: "1px solid var(--border)", borderRight: 0, borderRadius: "var(--radius-md) 0 0 var(--radius-md)", fontSize: 13, color: "var(--muted-foreground)" }}>+55</span>
                  <input
                    type="text"
                    placeholder="41999999999"
                    value={mensagemTeste.telefone}
                    onChange={(e) => setMensagemTeste(prev => ({ ...prev, telefone: e.target.value.replace(/\D/g, "") }))}
                    required
                    className="rn-input"
                    style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0" }}
                  />
                </div>
              </div>
              <div className="rn-field">
                <label className="rn-label">Mensagem</label>
                <textarea
                  placeholder="Digite sua mensagem..."
                  value={mensagemTeste.mensagem}
                  onChange={(e) => setMensagemTeste(prev => ({ ...prev, mensagem: e.target.value }))}
                  required
                  rows={3}
                  className="rn-textarea"
                  style={{ resize: "none" }}
                />
              </div>

              {envioResult && (
                <div
                  className={`rn-alert ${envioResult.ok ? "" : "rn-alert--danger"}`}
                  style={envioResult.ok ? { fontSize: 13, background: "var(--success-soft)", color: "var(--success-fg)", border: "1px solid color-mix(in oklab, var(--success) 25%, transparent)" } : { fontSize: 13 }}
                >
                  {envioResult.msg}
                </div>
              )}

              <button type="submit" className="rn-btn rn-btn--success rn-btn--sm" style={{ alignSelf: "flex-start" }}>
                Enviar
              </button>
            </form>
          </div>
        )}

        {/* Historico de envios */}
        <div className="rn-card" style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Histórico de Envios</h2>
              <p className="rn-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>Mensagens disparadas automaticamente pelos portais</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <select
                value={logsFilter.status}
                onChange={(e) => { setLogsFilter({ ...logsFilter, status: e.target.value }); setLogsPage(1); }}
                className="rn-select"
                style={{ width: "auto", minWidth: 120 }}
              >
                <option value="">Todos</option>
                <option value="ok">OK</option>
                <option value="erro">Erro</option>
                <option value="skipped">Pulado</option>
              </select>
              <input
                type="text"
                value={logsFilter.telefone}
                onChange={(e) => setLogsFilter({ ...logsFilter, telefone: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") { setLogsPage(1); fetchLogs(); } }}
                placeholder="Buscar telefone..."
                className="rn-input"
                style={{ width: 160 }}
              />
              <button
                type="button"
                onClick={() => { setLogsPage(1); fetchLogs(); }}
                className="rn-btn rn-btn--primary rn-btn--sm"
              >
                Filtrar
              </button>
              <button
                type="button"
                onClick={() => setShowCleanup(true)}
                className="rn-btn rn-btn--danger rn-btn--sm"
              >
                <Trash2 size={14} />
                Limpar
              </button>
            </div>
          </div>

          <div className="rn-table-wrap">
            <table className="rn-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Telefone</th>
                  <th>Portal</th>
                  <th>Contexto</th>
                  <th>Status</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan="6" className="rn-muted" style={{ textAlign: "center", padding: "2rem" }}>Nenhum log encontrado</td></tr>
                ) : logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(log.criado_em)}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{log.telefone || "-"}</td>
                      <td className="rn-muted" style={{ fontSize: 12 }}>{log.portal_nome || "-"}</td>
                      <td className="rn-muted" style={{ fontSize: 12 }}>{log.contexto_tipo || "-"}</td>
                      <td>
                        {statusBadge(log.status)}
                        {log.skip_motivo && <span className="rn-muted" style={{ marginLeft: 8, fontSize: 11 }}>({log.skip_motivo})</span>}
                      </td>
                      <td>
                        {(log.mensagem || log.erro_msg) && (
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                            className="rn-btn rn-btn--ghost rn-btn--sm"
                          >
                            {expandedLogId === log.id ? "Ocultar" : "Ver"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedLogId === log.id && (
                      <tr>
                        <td colSpan="6" style={{ background: "var(--surface-2)" }}>
                          {log.erro_msg && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--danger)", marginBottom: 4 }}>Erro:</div>
                              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--danger-fg)" }}>{log.erro_msg}</div>
                            </div>
                          )}
                          {log.mensagem && (
                            <div>
                              <div className="rn-muted" style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Mensagem enviada:</div>
                              <div style={{ fontSize: 11, whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", background: "var(--card)", padding: 8, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>{log.mensagem}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {logsTotal > PER_PAGE && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem", fontSize: 13 }}>
              <span className="rn-muted">
                {((logsPage - 1) * PER_PAGE) + 1}-{Math.min(logsPage * PER_PAGE, logsTotal)} de {logsTotal}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                  disabled={logsPage === 1}
                  className="rn-btn rn-btn--secondary rn-btn--sm"
                >
                  ← Anterior
                </button>
                <span className="rn-muted">Página {logsPage} de {Math.ceil(logsTotal / PER_PAGE)}</span>
                <button
                  type="button"
                  onClick={() => setLogsPage((p) => p + 1)}
                  disabled={logsPage * PER_PAGE >= logsTotal}
                  className="rn-btn rn-btn--secondary rn-btn--sm"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>

        <AdminModal
          open={showCleanup}
          onClose={() => setShowCleanup(false)}
          title="Limpar logs antigos"
        >
          <p className="rn-muted" style={{ fontSize: 13, marginBottom: "1rem" }}>
            Remover todos os logs anteriores à data selecionada. Esta ação não pode ser desfeita.
          </p>
          <div className="rn-field" style={{ marginBottom: "1.25rem" }}>
            <label className="rn-label">Remover logs anteriores a</label>
            <input
              type="date"
              value={cleanupDate}
              onChange={(e) => setCleanupDate(e.target.value)}
              className="rn-input"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowCleanup(false)}>
              Cancelar
            </button>
            <button type="button" className="rn-btn rn-btn--danger" onClick={handleLimparLogs}>
              Confirmar
            </button>
          </div>
        </AdminModal>
      </div>
    </AdminLayout>
  );
}
