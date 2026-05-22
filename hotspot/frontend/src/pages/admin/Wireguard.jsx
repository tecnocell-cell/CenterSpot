import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Plus, Settings, Shield, Code, Trash2, Copy, AlertTriangle } from "lucide-react";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminModal from "../../components/admin/AdminModal";
import PageShell from "../../components/admin/PageShell";

export function WireguardPanel({ embedded = false }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPeerName, setNewPeerName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptData, setScriptData] = useState("");
  const [serverSettings, setServerSettings] = useState({ wgPort: "51820", wgHost: "92.113.34.197" });
  const [editSettings, setEditSettings] = useState({ wgPort: "", wgHost: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const token = localStorage.getItem("admin_token");

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/wireguard/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error("Erro ao carregar VPN:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/wireguard/settings", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setServerSettings(data);
      setEditSettings({ wgPort: data.wgPort, wgHost: data.wgHost });
    } catch (err) {
      console.error("Erro ao carregar settings:", err);
    }
  };

  useEffect(() => {
    loadStatus();
    loadSettings();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddPeer = async (e) => {
    e.preventDefault();
    if (!newPeerName) return;
    try {
      const res = await fetch("/api/wireguard/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newPeerName }),
      });

      const statusRes = await fetch("/api/wireguard/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const statusData = await statusRes.json();
      const createdClient = statusData.clients.find((c) => c.name === newPeerName);

      if (!createdClient) throw new Error("Cliente não encontrado");

      const scriptRes = await fetch(`/api/wireguard/clients/${createdClient.id}/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const scriptJson = await scriptRes.json();

      setShowAddModal(false);
      setNewPeerName("");
      setScriptData(scriptJson.routerOsScript);
      setShowScriptModal(true);
      loadStatus();
    } catch (err) {
      alert("Erro ao criar peer");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja deletar este peer? Isso derrubará a VPN do Mikrotik!")) return;
    try {
      await fetch(`/api/wireguard/clients/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadStatus();
    } catch (err) {
      alert("Erro ao deletar");
    }
  };

  const showScript = async (id) => {
    try {
      const scriptRes = await fetch(`/api/wireguard/clients/${id}/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const scriptJson = await scriptRes.json();
      setScriptData(scriptJson.routerOsScript);
      setShowScriptModal(true);
    } catch (err) {
      alert("Erro ao carregar script");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(scriptData);
    alert("Script copiado! Cole no terminal do Mikrotik.");
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const onlineCount = status?.clients?.filter((c) => c.latestHandshakeAt).length || 0;

  if (loading && !status) {
    return (
      <PageShell embedded={embedded}>
        <div
          className="rn-card"
          style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted-foreground)" }}
        >
          Carregando VPN…
        </div>
      </PageShell>
    );
  }

  const toolbar = (
    <div className="rn-settings-toolbar">
      <p className="rn-muted" style={{ margin: 0, fontSize: 12 }}>
        {onlineCount} / {status?.clients?.length || 0} peer(s) online
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="rn-btn rn-btn--secondary rn-btn--sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings size={14} />
          Configurações
        </button>
        <button type="button" className="rn-btn rn-btn--primary rn-btn--sm" onClick={() => setShowAddModal(true)}>
          <Plus size={14} />
          Adicionar Peer
        </button>
      </div>
    </div>
  );

  return (
    <PageShell embedded={embedded}>
        {embedded ? toolbar : (
          <AdminPageHeader
            title="VPN WireGuard"
            subtitle="Gerencie peers e conectividade segura com os Mikrotiks."
          >
            <button
              type="button"
              className="rn-btn rn-btn--secondary"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={16} />
              Configurações
            </button>
            <button type="button" className="rn-btn rn-btn--primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />
              Adicionar Peer
            </button>
          </AdminPageHeader>
        )}

        {showSettings && (
          <div className="rn-card" style={{ padding: "1.25rem 1.5rem" }}>
            <p className="rn-section-sub" style={{ marginTop: 0 }}>
              Configurações do servidor VPN
            </p>
            <div className="rn-form-grid-2">
              <div className="rn-field">
                <label className="rn-label">IP Público / Domínio</label>
                <input
                  className="rn-input"
                  value={editSettings.wgHost}
                  onChange={(e) => setEditSettings({ ...editSettings, wgHost: e.target.value })}
                />
              </div>
              <div className="rn-field">
                <label className="rn-label">Porta UDP do WireGuard</label>
                <input
                  type="number"
                  className="rn-input"
                  value={editSettings.wgPort}
                  onChange={(e) => setEditSettings({ ...editSettings, wgPort: e.target.value })}
                  min="1024"
                  max="65535"
                />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={savingSettings}
                className="rn-btn rn-btn--primary"
                onClick={async () => {
                  setSavingSettings(true);
                  try {
                    const res = await fetch("/api/wireguard/settings", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                      body: JSON.stringify(editSettings),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setServerSettings(data.settings);
                      alert("Configurações salvas! O servidor WireGuard foi reiniciado.");
                      loadStatus();
                    } else {
                      alert("Erro: " + (data.message || "Falha ao salvar"));
                    }
                  } catch (err) {
                    alert("Erro ao salvar configurações");
                  } finally {
                    setSavingSettings(false);
                  }
                }}
              >
                {savingSettings ? "Reiniciando VPN…" : "Salvar e Reiniciar VPN"}
              </button>
              <div
                className="rn-alert rn-alert--warning"
                style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 0, flex: 1 }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 12 }}>
                  Alterar a porta irá desconectar todos os peers temporariamente.
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="rn-kpi-grid">
          <div className="rn-kpi rn-kpi--info">
            <span className="rn-kpi__label">Sub-rede</span>
            <span className="rn-kpi__value" style={{ fontSize: 20 }}>
              {status?.server?.subNet || "—"}
            </span>
          </div>
          <div className="rn-kpi rn-kpi--highlight">
            <span className="rn-kpi__label">Endpoint</span>
            <span className="rn-kpi__value" style={{ fontSize: 20 }}>
              {status?.server?.endpoint || "—"}
            </span>
          </div>
          <div className="rn-kpi rn-kpi--success">
            <span className="rn-kpi__label">Server IP / Peers</span>
            <span className="rn-kpi__value" style={{ fontSize: 20 }}>
              {status?.server?.address || "—"}
            </span>
            <span className="rn-muted" style={{ fontSize: 12 }}>
              {onlineCount} / {status?.clients?.length || 0} online
            </span>
          </div>
        </div>

        <div
          className="rn-card"
          style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 12 }}
        >
          <Shield size={20} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p className="rn-section-sub" style={{ margin: "0 0 4px", paddingBottom: 0, border: "none" }}>
              Server Public Key
            </p>
            <p
              style={{
                fontSize: 12,
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                margin: 0,
                wordBreak: "break-all",
              }}
            >
              {status?.server?.publicKey}
            </p>
          </div>
        </div>

        <div className="rn-card rn-table-wrap">
          <table className="rn-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Identificação</th>
                <th>IP VPN</th>
                <th>Tipo</th>
                <th>Último Handshake</th>
                <th>Tráfego</th>
                <th style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {status?.clients?.map((client) => {
                const isOnline =
                  client.latestHandshakeAt &&
                  new Date() - new Date(client.latestHandshakeAt) < 180000;
                return (
                  <tr key={client.id}>
                    <td>
                      <span className={`rn-pill ${isOnline ? "rn-pill--success" : "rn-pill--neutral"}`}>
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{client.name}</td>
                    <td className="rn-muted">{client.address}</td>
                    <td>
                      <span className="rn-pill rn-pill--info">MikroTik</span>
                    </td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {client.latestHandshakeAt
                        ? new Date(client.latestHandshakeAt).toLocaleString()
                        : "—"}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      <span style={{ color: "var(--success)" }}>↓ {formatBytes(client.transferRx)}</span>
                      {" · "}
                      <span style={{ color: "var(--info)" }}>↑ {formatBytes(client.transferTx)}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="rn-btn rn-btn--secondary rn-btn--sm"
                          onClick={() => showScript(client.id)}
                          title="Ver Script Mikrotik"
                        >
                          <Code size={14} />
                        </button>
                        <button
                          type="button"
                          className="rn-btn rn-btn--danger rn-btn--sm"
                          onClick={() => handleDelete(client.id)}
                          title="Deletar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!status?.clients || status.clients.length === 0) && (
                <tr>
                  <td colSpan={7} className="rn-muted" style={{ textAlign: "center", padding: "2rem" }}>
                    Nenhum peer cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <AdminModal open={showAddModal} onClose={() => setShowAddModal(false)} title="Adicionar Peer">
          <form onSubmit={handleAddPeer}>
            <div className="rn-field">
              <label className="rn-label">Identificação (Nome do Mikrotik)</label>
              <input
                autoFocus
                placeholder="Ex: RB-Torre-Centro"
                className="rn-input"
                value={newPeerName}
                onChange={(e) => setNewPeerName(e.target.value)}
                required
              />
            </div>
            <div className="rn-form-actions">
              <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowAddModal(false)}>
                Cancelar
              </button>
              <button type="submit" className="rn-btn rn-btn--primary">
                Salvar e Gerar Script
              </button>
            </div>
          </form>
        </AdminModal>

        <AdminModal
          open={showScriptModal}
          onClose={() => setShowScriptModal(false)}
          title="Script de Instalação Rápida"
          large
        >
          <p className="rn-muted" style={{ marginBottom: 12 }}>
            Copie o código abaixo e cole no terminal (New Terminal) do seu Mikrotik. Ele conectará o
            Winbox/Mikrotik automaticamente à VPN deste servidor.
          </p>
          <div style={{ position: "relative" }}>
            <pre
              className="rn-card"
              style={{
                padding: "1rem",
                fontSize: 12,
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                boxShadow: "none",
                margin: 0,
              }}
            >
              {scriptData}
            </pre>
            <button
              type="button"
              className="rn-btn rn-btn--primary rn-btn--sm"
              onClick={copyToClipboard}
              title="Copiar Script"
              style={{ position: "absolute", top: 8, right: 8 }}
            >
              <Copy size={14} />
              Copiar
            </button>
          </div>
          <div className="rn-form-actions">
            <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowScriptModal(false)}>
              Fechar
            </button>
          </div>
        </AdminModal>
    </PageShell>
  );
}

export default function Wireguard() {
  const { empresaSlug } = useParams();
  return <Navigate to={`/admin/${empresaSlug}/mikrotik?tab=vpn`} replace />;
}
