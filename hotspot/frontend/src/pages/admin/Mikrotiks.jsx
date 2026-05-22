import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminModal from "../../components/admin/AdminModal";
import PageShell from "../../components/admin/PageShell";

export function MikrotiksPanel({ embedded = false }) {
  const [mikrotiks, setMikrotiks] = useState([]);
  const [portais, setPortais] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [hotspotLog, setHotspotLog] = useState([]);
  const [enviandoHotspot, setEnviandoHotspot] = useState(null);
  const [enviandoLogin, setEnviandoLogin] = useState(null);
  const [enviandoStatus, setEnviandoStatus] = useState(null);
  const [mikrotikInfo, setMikrotikInfo] = useState(null);
  const [form, setForm] = useState({ nome: "", ip: "", usuario: "", senha: "", porta: 8728, end_hotspot: "", portal_id: "" });
  const [erro, setErro] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const token = localStorage.getItem("admin_token");

  const carregarPortais = async () => {
    try {
      const res = await fetch("/api/portais", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPortais(data);
    } catch (err) { console.error(err); }
  };

  // Wizard states
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardMikrotikId, setWizardMikrotikId] = useState(null);
  const [scanData, setScanData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [wizardConfig, setWizardConfig] = useState({
    interface: "", localAddress: "10.5.50.1/24", poolName: "hs-pool", poolRange: "10.5.50.2-10.5.50.254", dnsName: ""
  });

  const abrirWizard = async (id) => {
    setWizardMikrotikId(id);
    setScanning(true);
    setScanData(null);
    setShowWizard(true);
    setWizardStep(0);
    setWizardConfig({ interface: "", localAddress: "10.5.50.1/24", poolName: "hs-pool", poolRange: "10.5.50.2-10.5.50.254", dnsName: "" });

    try {
      const res = await fetch(`/api/mikrotiks/${id}/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message); setShowWizard(false); return; }
      setScanData(data);
      if (data.interfaces?.length > 0) {
        setWizardConfig(c => ({ ...c, interface: data.interfaces[0]?.name || "ether2" }));
      }
      if (data.pools?.length > 0) {
        setWizardConfig(c => ({ ...c, poolName: data.pools[0].name, poolRange: data.pools[0].ranges }));
      }
    } catch (err) {
      alert("Erro ao escanear Mikrotik");
      setShowWizard(false);
    } finally {
      setScanning(false);
    }
  };

  const executarWizard = async () => {
    setEnviandoHotspot(wizardMikrotikId);
    setShowWizard(false);
    setHotspotLog([]);
    setShowLogModal(true);

    try {
      const res = await fetch(`/api/mikrotiks/${wizardMikrotikId}/enviar-hotspot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(wizardConfig),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "step") {
              setHotspotLog(prev => [...prev, `[${event.status}] ${event.message}`]);
            } else if (event.type === "error") {
              setHotspotLog(prev => [...prev, `[erro] ${event.message}`]);
            } else if (event.type === "done") {
              if (event.success) {
                setHotspotLog(prev => [...prev, "--- Configuracao finalizada com sucesso! ---"]);
              }
              carregarMikrotiks();
            }
          } catch (e) { /* parse error, ignora */ }
        }
      }
    } catch (err) {
      setHotspotLog(prev => [...prev, `[erro] Falha de conexao: ${err.message}`]);
    } finally {
      setEnviandoHotspot(null);
    }
  };

const carregarMikrotiks = async () => {
  try {
    const res = await fetch("/api/mikrotiks", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    // Inicia todos com status "loading"
    const mikrotiksComStatus = data.map(m => ({ ...m, status: "loading" }));
    setMikrotiks(mikrotiksComStatus);

    // Testa conexão de cada Mikrotik
    for (const m of data) {
      try {
        const res = await fetch(`/api/mikrotiks/${m.id}/testar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        setMikrotiks(prev => prev.map(item =>
          item.id === m.id
            ? { ...item, status: res.ok ? "online" : "offline" }
            : item
        ));
      } catch {
        setMikrotiks(prev => prev.map(item =>
          item.id === m.id
            ? { ...item, status: "offline" }
            : item
        ));
      }
    }
  } catch (err) {
    setErro("Erro ao buscar Mikrotiks");
  }
};
  const salvarMikrotik = async (e) => {
    e.preventDefault();
    setErro("");

    const method = editandoId ? "PUT" : "POST";
    const url = editandoId ? `/api/mikrotiks/${editandoId}` : "/api/mikrotiks";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.message || "Erro ao salvar");
      } else {
        setShowModal(false);
        setForm({ nome: "", ip: "", usuario: "", senha: "", porta: 8728, end_hotspot: "", portal_id: "" });
        setEditandoId(null);
        carregarMikrotiks();
      }
    } catch {
      setErro("Erro de conexão");
    }
  };

const editar = (mikrotik) => {
  setForm({ ...mikrotik, end_hotspot: mikrotik.end_hotspot || "", portal_id: mikrotik.portal_id || "" });
  setEditandoId(mikrotik.id);
  setShowModal(true);
};

  const remover = async (id) => {
    if (!confirm("Deseja realmente remover este Mikrotik?")) return;
    try {
      await fetch(`/api/mikrotiks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      carregarMikrotiks();
    } catch {
      alert("Erro ao deletar Mikrotik");
    }
  };

  const testarConexao = async (id) => {
    try {
      const res = await fetch(`/api/mikrotiks/${id}/testar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (res.ok) {
        alert("✅ Conexão bem-sucedida com o Mikrotik.");
      } else {
        alert(`❌ Falha: ${data.message}`);
      }
    } catch {
      alert("Erro ao testar conexão");
    }
  };

  const abrirInfo = async (id) => {
    try {
      const res = await fetch(`/api/mikrotiks/${id}/info`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMikrotikInfo(data);
        setShowInfoModal(true);
      } else {
        alert(`Erro ao obter informações: ${data.message}`);
      }
    } catch {
      alert("Erro ao conectar ao Mikrotik");
    }
  };

  const enviarLogin = async (id) => {
    setEnviandoLogin(id);
    try {
      const res = await fetch(`/api/mikrotiks/${id}/enviar-login`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      alert(data.message);
    } catch {
      alert("Erro de conexão ao enviar login.html");
    } finally {
      setEnviandoLogin(null);
    }
  };

  const enviarStatus = async (id) => {
    setEnviandoStatus(id);
    try {
      const res = await fetch(`/api/mikrotiks/${id}/enviar-status`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      alert(data.message);
    } catch {
      alert("Erro de conexão ao enviar status.html");
    } finally {
      setEnviandoStatus(null);
    }
  };

  useEffect(() => {
    carregarMikrotiks();
    carregarPortais();
  }, []);

  const openNovo = () => {
    setShowModal(true);
    setForm({ nome: "", ip: "", usuario: "", senha: "", porta: 8728, end_hotspot: "", portal_id: "" });
    setEditandoId(null);
  };

  const toolbar = (
    <div className="rn-settings-toolbar">
      <p className="rn-muted" style={{ margin: 0, fontSize: 12 }}>
        {mikrotiks.length} equipamento(s) cadastrado(s)
      </p>
      <button type="button" className="rn-btn rn-btn--primary rn-btn--sm" onClick={openNovo}>
        <Plus size={14} />
        Adicionar Mikrotik
      </button>
    </div>
  );

  return (
    <PageShell embedded={embedded}>
        {embedded ? toolbar : (
          <AdminPageHeader
            title="Mikrotiks"
            subtitle={`${mikrotiks.length} equipamento(s) cadastrado(s)`}
          >
            <button type="button" className="rn-btn rn-btn--primary" onClick={openNovo}>
              <Plus size={16} />
              Adicionar Mikrotik
            </button>
          </AdminPageHeader>
        )}

        {erro && <div className="rn-alert rn-alert--danger">{erro}</div>}

        <div className="rn-card rn-table-wrap">
          <div className="rn-section-header">
            <span className="rn-section-title">📶 Equipamentos cadastrados</span>
          </div>
          <table className="rn-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>IP</th>
                <th>Portal</th>
                <th>Status</th>
                <th>Usuários Ativos</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {mikrotiks.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.nome}</td>
                  <td className="rn-muted">{m.ip}</td>
                  <td>
                    {m.portal_nome ? (
                      <span className="rn-pill rn-pill--info">{m.portal_nome}</span>
                    ) : (
                      <span className="rn-muted" style={{ fontSize: 12 }}>
                        Nenhum
                      </span>
                    )}
                  </td>
                  <td>
                    {m.status === "loading" ? (
                      <span className="rn-muted" style={{ fontSize: 12 }}>
                        Verificando…
                      </span>
                    ) : (
                      <span
                        className={`rn-pill ${m.status === "online" ? "rn-pill--success" : "rn-pill--danger"}`}
                      >
                        {m.status === "online" ? "Online" : "Offline"}
                      </span>
                    )}
                  </td>
                  <td>{m.usuarios_ativos}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => abrirWizard(m.id)}
                        title="Enviar Hotspot"
                        className="rn-btn rn-btn--primary rn-btn--sm"
                        disabled={enviandoHotspot === m.id}
                      >
                        {enviandoHotspot === m.id ? "Enviando…" : "Hotspot"}
                      </button>
                      <button
                        type="button"
                        onClick={() => enviarLogin(m.id)}
                        title="Enviar login.html"
                        className="rn-btn rn-btn--secondary rn-btn--sm"
                        disabled={enviandoLogin === m.id}
                      >
                        {enviandoLogin === m.id ? "Enviando…" : "Login"}
                      </button>
                      <button
                        type="button"
                        onClick={() => enviarStatus(m.id)}
                        title="Enviar status.html"
                        className="rn-btn rn-btn--secondary rn-btn--sm"
                        disabled={enviandoStatus === m.id}
                      >
                        {enviandoStatus === m.id ? "Enviando…" : "Status"}
                      </button>
                      <button
                        type="button"
                        onClick={() => testarConexao(m.id)}
                        title="Testar"
                        className="rn-btn rn-btn--secondary rn-btn--sm"
                      >
                        Testar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirInfo(m.id)}
                        title="Info"
                        className="rn-btn rn-btn--secondary rn-btn--sm"
                      >
                        Info
                      </button>
                      <button
                        type="button"
                        onClick={() => editar(m)}
                        title="Editar"
                        className="rn-btn rn-btn--secondary rn-btn--sm"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => remover(m.id)}
                        title="Remover"
                        className="rn-btn rn-btn--danger rn-btn--sm"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AdminModal
          open={showInfoModal && !!mikrotikInfo}
          onClose={() => setShowInfoModal(false)}
          title="Informações do Mikrotik"
        >
          {mikrotikInfo && (
            <div className="rn-form-grid-2">
              <div className="rn-card" style={{ padding: "12px 14px", boxShadow: "none" }}>
                <p className="rn-muted" style={{ fontSize: 11, margin: "0 0 4px" }}>
                  Modelo
                </p>
                <p style={{ fontWeight: 500, margin: 0 }}>{mikrotikInfo.modelo}</p>
              </div>
              <div className="rn-card" style={{ padding: "12px 14px", boxShadow: "none" }}>
                <p className="rn-muted" style={{ fontSize: 11, margin: "0 0 4px" }}>
                  Versão
                </p>
                <p style={{ fontWeight: 500, margin: 0 }}>{mikrotikInfo.versao}</p>
              </div>
              <div className="rn-card" style={{ padding: "12px 14px", boxShadow: "none" }}>
                <p className="rn-muted" style={{ fontSize: 11, margin: "0 0 4px" }}>
                  Uptime
                </p>
                <p style={{ fontWeight: 500, margin: 0 }}>{mikrotikInfo.uptime}</p>
              </div>
              <div className="rn-card" style={{ padding: "12px 14px", boxShadow: "none" }}>
                <p className="rn-muted" style={{ fontSize: 11, margin: "0 0 4px" }}>
                  CPU
                </p>
                <p style={{ fontWeight: 500, margin: 0 }}>{mikrotikInfo.cpu}</p>
              </div>
            </div>
          )}
        </AdminModal>

        <AdminModal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editandoId ? "Editar Mikrotik" : "Adicionar Mikrotik"}
        >
          <form onSubmit={salvarMikrotik}>
            {erro && <div className="rn-alert rn-alert--danger">{erro}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="rn-field">
                <label className="rn-label">Nome</label>
                <input
                  placeholder="Ex: Mikrotik Principal"
                  className="rn-input"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </div>
              <div className="rn-field">
                <label className="rn-label">Endereço IP</label>
                <input
                  placeholder="192.168.1.1"
                  className="rn-input"
                  value={form.ip}
                  onChange={(e) => setForm({ ...form, ip: e.target.value })}
                  required
                />
              </div>
              <div className="rn-form-grid-2">
                <div className="rn-field">
                  <label className="rn-label">Usuário</label>
                  <input
                    className="rn-input"
                    value={form.usuario}
                    onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                    required
                  />
                </div>
                <div className="rn-field">
                  <label className="rn-label">Porta API</label>
                  <input
                    type="number"
                    className="rn-input"
                    value={form.porta}
                    onChange={(e) => setForm({ ...form, porta: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="rn-field">
                <label className="rn-label">Senha</label>
                <input
                  type="password"
                  className="rn-input"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  required
                />
              </div>
              <div className="rn-field">
                <label className="rn-label">Endereço Hotspot</label>
                <input
                  type="text"
                  className="rn-input"
                  placeholder="http://192.168.1.1/login"
                  value={form.end_hotspot}
                  onChange={(e) => setForm({ ...form, end_hotspot: e.target.value })}
                />
              </div>
              <div className="rn-field">
                <label className="rn-label">Portal Captive</label>
                <select
                  className="rn-select"
                  value={form.portal_id}
                  onChange={(e) => setForm({ ...form, portal_id: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {portais.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.tipo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="rn-form-actions">
              <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="rn-btn rn-btn--primary">
                {editandoId ? "Atualizar" : "Adicionar"}
              </button>
            </div>
          </form>
        </AdminModal>

        <AdminModal
          open={showWizard}
          onClose={() => setShowWizard(false)}
          title="Hotspot Setup"
          large
        >
          {scanning ? (
            <div style={{ textAlign: "center", padding: "2.5rem 0" }}>
              <div
                className="rn-spin"
                style={{
                  width: 32,
                  height: 32,
                  border: "3px solid var(--border)",
                  borderTopColor: "var(--primary)",
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                }}
              />
              <p className="rn-muted">Escaneando Mikrotik…</p>
            </div>
          ) : (
            scanData && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="rn-card" style={{ padding: "12px 14px", boxShadow: "none" }}>
                  <div className="rn-form-grid-2" style={{ fontSize: 12 }}>
                    <div>
                      <span className="rn-muted">Interfaces</span>
                      <p style={{ fontWeight: 500, margin: "4px 0 0" }}>
                        {scanData.interfaces?.length || 0}
                      </p>
                    </div>
                    <div>
                      <span className="rn-muted">Pools</span>
                      <p style={{ fontWeight: 500, margin: "4px 0 0" }}>
                        {scanData.pools?.length || 0}
                      </p>
                    </div>
                    <div>
                      <span className="rn-muted">Hotspot Ativo</span>
                      <p style={{ fontWeight: 500, margin: "4px 0 0" }}>
                        {scanData.hotspots?.length ? "Sim" : "Não"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rn-field">
                  <label className="rn-label">Interface do Hotspot</label>
                  <select
                    className="rn-select"
                    value={wizardConfig.interface}
                    onChange={(e) => setWizardConfig({ ...wizardConfig, interface: e.target.value })}
                  >
                    {scanData.interfaces?.map((i) => (
                      <option key={i.name} value={i.name}>
                        {i.name} ({i.type}){i.disabled === "true" ? " [desabilitada]" : ""}
                      </option>
                    ))}
                  </select>
                  {scanData.addresses
                    ?.filter((a) => a.interface === wizardConfig.interface)
                    .map((a) => (
                      <p key={a.address} className="rn-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
                        IP atual: {a.address}
                      </p>
                    ))}
                </div>

                <div className="rn-field">
                  <label className="rn-label">Endereço IP do Hotspot (gateway)</label>
                  <input
                    className="rn-input"
                    value={wizardConfig.localAddress}
                    onChange={(e) => setWizardConfig({ ...wizardConfig, localAddress: e.target.value })}
                    placeholder="10.5.50.1/24"
                  />
                  <p className="rn-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
                    Será atribuído à interface se ainda não tiver IP
                  </p>
                </div>

                <div className="rn-form-grid-2">
                  <div className="rn-field">
                    <label className="rn-label">Nome do Pool</label>
                    <input
                      className="rn-input"
                      value={wizardConfig.poolName}
                      onChange={(e) => setWizardConfig({ ...wizardConfig, poolName: e.target.value })}
                    />
                  </div>
                  <div className="rn-field">
                    <label className="rn-label">Range do Pool</label>
                    <input
                      className="rn-input"
                      value={wizardConfig.poolRange}
                      onChange={(e) => setWizardConfig({ ...wizardConfig, poolRange: e.target.value })}
                      placeholder="10.5.50.2-10.5.50.254"
                    />
                  </div>
                </div>
                {scanData.pools?.length > 0 && (
                  <p className="rn-muted" style={{ fontSize: 11, margin: 0 }}>
                    Pools existentes: {scanData.pools.map((p) => `${p.name} (${p.ranges})`).join(", ")}
                  </p>
                )}

                <div className="rn-field">
                  <label className="rn-label">DNS Name (opcional)</label>
                  <input
                    className="rn-input"
                    value={wizardConfig.dnsName}
                    onChange={(e) => setWizardConfig({ ...wizardConfig, dnsName: e.target.value })}
                    placeholder="hotspot.minharede.com"
                  />
                </div>

                <div className="rn-card" style={{ padding: "12px 14px", boxShadow: "none", fontSize: 12 }}>
                  <p className="rn-muted" style={{ fontWeight: 500, margin: "0 0 8px" }}>
                    Será configurado automaticamente:
                  </p>
                  <p style={{ margin: "0 0 4px" }}>• RADIUS Client → 10.8.0.1:1812/1813</p>
                  <p style={{ margin: "0 0 4px" }}>• Walled Garden → domínio do sistema liberado</p>
                  <p style={{ margin: 0 }}>• Login URL → redirect para o portal vinculado</p>
                  {scanData.radius?.length > 0 && (
                    <p className="rn-alert rn-alert--warning" style={{ marginTop: 8, marginBottom: 0 }}>
                      Atenção: RADIUS existente será atualizado ({scanData.radius[0].address})
                    </p>
                  )}
                </div>

                <div className="rn-form-actions">
                  <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowWizard(false)}>
                    Cancelar
                  </button>
                  <button type="button" className="rn-btn rn-btn--primary" onClick={executarWizard}>
                    Configurar Hotspot
                  </button>
                </div>
              </div>
            )
          )}
        </AdminModal>

        <AdminModal
          open={showLogModal}
          onClose={() => {
            if (!enviandoHotspot) setShowLogModal(false);
          }}
          title="Log de Configuração"
          large
        >
          <div
            className="rn-card"
            style={{
              padding: "1rem",
              fontFamily: "var(--font-mono, ui-monospace, monospace)",
              fontSize: 11,
              maxHeight: 320,
              overflowY: "auto",
              boxShadow: "none",
            }}
            ref={(el) => {
              if (el) el.scrollTop = el.scrollHeight;
            }}
          >
            {hotspotLog.length === 0 && enviandoHotspot && (
              <p className="rn-muted">Conectando ao Mikrotik…</p>
            )}
            {hotspotLog.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 4,
                  color: line.includes("[erro]")
                    ? "var(--danger)"
                    : line.includes("[aviso]")
                      ? "var(--warning)"
                      : line.startsWith("---")
                        ? "var(--info)"
                        : "var(--success)",
                  fontWeight: line.startsWith("---") ? 600 : 400,
                }}
              >
                <span className="rn-muted" style={{ flexShrink: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{line}</span>
              </div>
            ))}
          </div>
          <div className="rn-form-actions">
            <button
              type="button"
              onClick={() => setShowLogModal(false)}
              disabled={!!enviandoHotspot}
              className="rn-btn rn-btn--primary"
            >
              {enviandoHotspot ? "Aguarde…" : "Fechar"}
            </button>
          </div>
        </AdminModal>
    </PageShell>
  );
}

export default function Mikrotiks() {
  const { empresaSlug } = useParams();
  return <Navigate to={`/admin/${empresaSlug}/mikrotik?tab=mikrotiks`} replace />;
}
