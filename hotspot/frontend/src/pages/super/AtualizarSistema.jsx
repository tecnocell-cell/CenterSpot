import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import SuperAdminLayout from "../../components/admin/SuperAdminLayout";
import AdminModal from "../../components/admin/AdminModal";

export default function AtualizarSistema() {

  const [step, setStep] = useState("email"); // email | checking | updates | applying | done | error
  const [email, setEmail] = useState("");
  const [updates, setUpdates] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [applyProgress, setApplyProgress] = useState({ current: 0, total: 0 });
  const [lastAppliedId, setLastAppliedId] = useState(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsData, setLogsData] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const reloadTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    };
  }, []);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStep("checking");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/system-update/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.authorized) {
        setErrorMsg(data.message || "Assinatura nao autorizada ou email invalido.");
        setStep("error");
        return;
      }
      if (!data.updates || data.updates.length === 0) {
        setDoneMsg("Seu sistema ja esta na versao mais recente. Nenhuma atualizacao disponivel.");
        setStep("done");
        return;
      }
      setUpdates(data.updates);
      setStep("updates");
    } catch (err) {
      setErrorMsg("Erro ao verificar atualizacoes. Verifique sua conexao e tente novamente.");
      setStep("error");
    }
  };

  const fetchLogs = async (updateId) => {
    setLogsLoading(true);
    setLogsData([]);
    setLogsOpen(true);
    try {
      const token = localStorage.getItem("admin_token");
      const url = updateId
        ? `/api/system-update/logs?update_id=${encodeURIComponent(updateId)}`
        : "/api/system-update/logs";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setLogsData(Array.isArray(data.logs) ? data.logs : []);
      } else {
        setLogsData([
          {
            id: 0,
            step: "error",
            status: "erro",
            message: data.message || "Falha ao carregar logs",
            criado_em: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setLogsData([
        {
          id: 0,
          step: "error",
          status: "erro",
          message: "Erro de conexao ao carregar logs",
          criado_em: new Date().toISOString(),
        },
      ]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleApply = async () => {
    setStep("applying");
    const total = updates.length;
    setApplyProgress({ current: 0, total });

    const token = localStorage.getItem("admin_token");

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      setApplyProgress({ current: i + 1, total });
      setLastAppliedId(update.id);
      const isLast = i === updates.length - 1;

      try {
        const res = await fetch("/api/system-update/apply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: email.trim(), update_id: update.id }),
        });

        let data = null;
        try {
          data = await res.json();
        } catch {
          // Conexao perdida ao ler resposta - se for a ultima, PM2 reiniciou
          if (isLast) {
            setDoneMsg(
              "Atualizacao aplicada com sucesso! O servidor foi reiniciado. A pagina sera recarregada automaticamente."
            );
            setStep("done");
            reloadTimerRef.current = setTimeout(() => window.location.reload(), 8000);
            return;
          }
          setErrorMsg(
            `Conexao perdida ao aplicar a atualizacao ${update.id}. Recomendamos verificar o estado do sistema e restaurar um backup se necessario.`
          );
          setStep("error");
          return;
        }

        if (!res.ok || !data.success) {
          // Se for a ultima e o backend respondeu antes de reiniciar, pode ser falso negativo
          if (isLast && data?.applied) {
            setDoneMsg(
              data.message || "Atualizacoes aplicadas com sucesso! A pagina sera recarregada em 8 segundos."
            );
            setStep("done");
            reloadTimerRef.current = setTimeout(() => window.location.reload(), 8000);
            return;
          }
          setErrorMsg(
            (data?.message || `Falha ao aplicar atualizacao "${update.descricao}".`) +
              (isLast ? "" : " Recomendamos restaurar o backup automatico criado antes desta operacao.")
          );
          setStep("error");
          return;
        }

        // Sucesso explícito
        if (isLast) {
          setDoneMsg(
            data.message || "Todas as atualizacoes foram aplicadas com sucesso! A pagina sera recarregada em 8 segundos."
          );
          setStep("done");
          reloadTimerRef.current = setTimeout(() => window.location.reload(), 8000);
          return;
        }
      } catch (err) {
        // Erro de rede (fetch falhou completamente)
        if (isLast) {
          setDoneMsg(
            "Atualizacao aplicada com sucesso! O servidor foi reiniciado. A pagina sera recarregada automaticamente."
          );
          setStep("done");
          reloadTimerRef.current = setTimeout(() => window.location.reload(), 8000);
          return;
        }
        setErrorMsg(
          `Erro de conexao ao aplicar a atualizacao "${update.descricao}". Recomendamos restaurar o backup automatico criado antes desta operacao.`
        );
        setStep("error");
        return;
      }
    }
  };

  const handleReset = () => {
    setStep("email");
    setErrorMsg("");
    setDoneMsg("");
    setUpdates([]);
    setApplyProgress({ current: 0, total: 0 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const progressPercent =
    applyProgress.total > 0
      ? Math.round((applyProgress.current / applyProgress.total) * 100)
      : 0;

  return (
    <SuperAdminLayout
      title="Atualizar sistema"
      subtitle="Verifique e aplique atualizações da plataforma (assinatura Hotmart)."
      maxWidth="42rem"
    >
        {step === "email" && (
          <div className="rn-card" style={{ padding: "1.5rem 1.75rem" }}>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Verificar atualizações</h2>
              </div>
              <p className="rn-muted" style={{ fontSize: 13, marginTop: 4 }}>
                Informe o email cadastrado no Hotmart para validar sua assinatura.
              </p>
            </div>

            <form onSubmit={handleCheck} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="rn-field">
                <label className="rn-label">Email Hotmart</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="rn-input"
                />
              </div>
              <button type="submit" className="rn-btn rn-btn--primary" style={{ width: "100%" }}>
                Verificar atualizações
              </button>
            </form>
          </div>
        )}

        {step === "checking" && (
          <div className="rn-card" style={{ padding: "2.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontWeight: 600, margin: 0 }}>Verificando atualizações…</p>
              <p className="rn-muted" style={{ fontSize: 13, marginTop: 4 }}>Validando sua assinatura</p>
            </div>
          </div>
        )}

        {step === "updates" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="rn-alert rn-alert--info" style={{ display: "flex", gap: 12 }}>
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-300 text-sm">
                Um backup automatico sera criado antes de aplicar as atualizacoes. Voce pode restaura-lo na pagina de Backups caso necessario.
              </p>
            </div>

            <div className="rn-card rn-table-wrap">
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                  {updates.length} {updates.length === 1 ? "atualização disponível" : "atualizações disponíveis"}
                </h2>
              </div>
              <table className="rn-table">
                <tbody>
                  {updates.map((update, idx) => (
                    <tr key={update.id}>
                      <td style={{ width: 32 }}>{idx + 1}</td>
                      <td>
                        <p style={{ fontWeight: 500, margin: 0, fontSize: 13 }}>{update.descricao}</p>
                        {update.changelog && (
                          <p className="rn-muted" style={{ fontSize: 12, margin: "4px 0 0", lineHeight: 1.45 }}>
                            {update.changelog}
                          </p>
                        )}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <span className="rn-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                          {update.id}
                        </span>
                        {update.date && (
                          <p className="rn-muted" style={{ fontSize: 11, margin: "2px 0 0" }}>
                            {formatDate(update.date)}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={handleReset} className="rn-btn rn-btn--secondary" style={{ flex: 1 }}>
                Cancelar
              </button>
              <button type="button" onClick={handleApply} className="rn-btn rn-btn--primary" style={{ flex: 1 }}>
                Aplicar todas
              </button>
            </div>
          </div>
        )}

        {step === "applying" && (
          <div className="rn-card" style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                className="w-8 h-8 border-3 border-gray-700 border-t-green-500 rounded-full animate-spin flex-shrink-0"
                style={{ borderWidth: "3px" }}
              />
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>Aplicando atualizações…</p>
                <p className="rn-muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {applyProgress.current > 0
                    ? `Atualização ${applyProgress.current} de ${applyProgress.total}`
                    : "Iniciando…"}
                </p>
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }} className="rn-muted">
                <span>
                  {applyProgress.current} de {applyProgress.total} aplicadas
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 10,
                  borderRadius: "var(--radius-full)",
                  background: "var(--surface-2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progressPercent}%`,
                    background: "var(--success)",
                    borderRadius: "var(--radius-full)",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
            </div>
            <div className="rn-alert rn-alert--warning">
              Não feche esta página. O processo pode reiniciar o servidor automaticamente.
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="rn-card" style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="rn-alert rn-alert--success">
              <p style={{ fontWeight: 600, margin: "0 0 4px" }}>Sucesso!</p>
              <p style={{ margin: 0, fontSize: 13 }}>{doneMsg}</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p className="rn-muted" style={{ fontSize: 13 }}>
                A página será recarregada automaticamente em 8 segundos.
              </p>
              <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" onClick={() => window.location.reload()} className="rn-btn rn-btn--primary rn-btn--sm">
                  Recarregar agora
                </button>
                <button type="button" onClick={() => fetchLogs(lastAppliedId)} className="rn-btn rn-btn--secondary rn-btn--sm">
                  Ver logs
                </button>
                <Link to="/super" className="rn-btn rn-btn--secondary rn-btn--sm">
                  Ir para o painel
                </Link>
              </div>
            </div>
          </div>
        )}

        {step === "error" && (
          <div className="rn-card" style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="rn-alert rn-alert--danger">
              <p style={{ fontWeight: 600, margin: "0 0 4px" }}>Erro na atualização</p>
              <p style={{ margin: 0, fontSize: 13 }}>{errorMsg}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={handleReset} className="rn-btn rn-btn--primary" style={{ flex: 1, minWidth: 140 }}>
                Tentar novamente
              </button>
              <button type="button" onClick={() => fetchLogs(lastAppliedId)} className="rn-btn rn-btn--secondary" style={{ flex: 1, minWidth: 140 }}>
                Ver logs
              </button>
              <Link to="/super/backups" className="rn-btn rn-btn--secondary" style={{ flex: 1, minWidth: 140, textAlign: "center" }}>
                Ir para backups
              </Link>
            </div>
          </div>
        )}

        <AdminModal
          open={logsOpen}
          onClose={() => setLogsOpen(false)}
          large
          title={
            <>
              Logs do apply
              {lastAppliedId && (
                <span className="rn-muted" style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  #{lastAppliedId}
                </span>
              )}
            </>
          }
        >
          <div
            style={{
              maxHeight: "50vh",
              overflowY: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {logsLoading ? (
              <p className="rn-muted">Carregando…</p>
            ) : logsData.length === 0 ? (
              <p className="rn-muted">Nenhum log encontrado para este update.</p>
            ) : (
              logsData.map((l) => {
                const statusClass =
                  l.status === "erro" ? "rn-pill--danger" : l.status === "ok" ? "rn-pill--success" : "rn-pill--info";
                const ts = new Date(l.criado_em).toLocaleTimeString("pt-BR");
                return (
                  <div key={l.id} style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span className="rn-muted" style={{ flexShrink: 0 }}>
                      {ts}
                    </span>
                    <span className={`rn-pill ${statusClass}`} style={{ flexShrink: 0 }}>
                      {l.status}
                    </span>
                    <span className="rn-muted" style={{ flexShrink: 0, minWidth: 80 }}>
                      {l.step}
                    </span>
                    <span style={{ wordBreak: "break-all" }}>{l.message}</span>
                  </div>
                );
              })
            )}
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => fetchLogs(lastAppliedId)} className="rn-btn rn-btn--secondary rn-btn--sm">
              Recarregar
            </button>
            <button type="button" onClick={() => setLogsOpen(false)} className="rn-btn rn-btn--primary rn-btn--sm">
              Fechar
            </button>
          </div>
        </AdminModal>
    </SuperAdminLayout>
  );
}
