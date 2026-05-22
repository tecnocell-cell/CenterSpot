import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminModal from "./AdminModal";

const STEPS = [
  "Selecionar MikroTik",
  "Escanear Rede",
  "Interface e IP",
  "Configurar RADIUS",
  "Deploy",
];

export default function HotspotWizard({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mikrotiks, setMikrotiks] = useState([]);
  const [selectedMikrotik, setSelectedMikrotik] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [config, setConfig] = useState({
    interface: "",
    localAddress: "10.5.50.1/24",
    poolName: "hs-pool",
    poolRange: "10.5.50.2-10.5.50.254",
    radiusServerIp: "10.8.0.1",
    radiusPort: 1812,
    radiusSecret: "",
    dnsName: "",
  });

  useEffect(() => {
    if (isOpen) {
      axios.get("/api/mikrotiks").then(res => {
        setMikrotiks(Array.isArray(res.data) ? res.data : res.data.mikrotiks || []);
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleScan = async () => {
    if (!selectedMikrotik) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await axios.get(`/api/mikrotiks/${selectedMikrotik.id}/scan`);
      setScanResult(res.data);
      if (res.data.interfaces?.length > 0) {
        setConfig(c => ({ ...c, interface: res.data.interfaces[0].name || res.data.interfaces[0].defaultName || "ether2" }));
      }
      if (res.data.pools?.length > 0) {
        setConfig(c => ({ ...c, poolName: res.data.pools[0].name, poolRange: res.data.pools[0].ranges }));
      }
    } catch (err) {
      setScanResult({ error: err.response?.data?.message || err.message });
    }
    setScanning(false);
  };

  const handleDeploy = async () => {
    if (!selectedMikrotik) return;
    setDeploying(true);
    setDeployResult(null);
    try {
      const res = await axios.post(`/api/mikrotiks/${selectedMikrotik.id}/enviar-hotspot`, config);
      setDeployResult(res.data);
    } catch (err) {
      setDeployResult({ success: false, error: err.response?.data?.message || err.message });
    }
    setDeploying(false);
  };

  const canNext = () => {
    if (currentStep === 0) return !!selectedMikrotik;
    if (currentStep === 1) return !!scanResult && !scanResult.error;
    if (currentStep === 2) return !!config.interface;
    return true;
  };

  return (
    <AdminModal
      open={isOpen}
      onClose={onClose}
      title="Wizard de Hotspot"
      large
      className="rn-modal--wizard"
    >
      <div className="rn-wizard-steps">
        {STEPS.map((step, i) => (
          <React.Fragment key={i}>
            <div
              className={`rn-wizard-step-item${i === currentStep ? " is-active" : ""}${i < currentStep ? " is-done" : ""}`}
            >
              <div className="rn-wizard-step-num">
                {i < currentStep ? "\u2713" : i + 1}
              </div>
              <span className="rn-wizard-step-label">{step}</span>
            </div>
            {i < STEPS.length - 1 && <div className="rn-wizard-step-sep" />}
          </React.Fragment>
        ))}
      </div>

      <div className="rn-wizard-panel">
        {currentStep === 0 && (
          <div>
            <div className="rn-field">
              <label className="rn-label">Selecione o MikroTik</label>
              <select
                className="rn-select"
                value={selectedMikrotik?.id || ""}
                onChange={(e) => {
                  const mk = mikrotiks.find(m => m.id === Number(e.target.value));
                  setSelectedMikrotik(mk || null);
                  setConfig(c => ({ ...c, radiusSecret: mk?.senha || "" }));
                }}
              >
                <option value="">-- Selecione --</option>
                {mikrotiks.map(mk => (
                  <option key={mk.id} value={mk.id}>{mk.nome || mk.ip} ({mk.ip})</option>
                ))}
              </select>
            </div>
            {selectedMikrotik && (
              <div className="rn-card" style={{ marginTop: 12, padding: "12px 14px", boxShadow: "none", fontSize: 13 }}>
                <p style={{ margin: "0 0 4px" }}>IP: {selectedMikrotik.ip}</p>
                <p style={{ margin: 0 }}>Porta: {selectedMikrotik.porta || 8728}</p>
              </div>
            )}
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <button
              type="button"
              onClick={handleScan}
              disabled={scanning}
              className="rn-btn rn-btn--primary"
            >
              {scanning ? "Escaneando..." : "Escanear Rede"}
            </button>
            {scanResult && scanResult.error && (
              <div className="rn-alert rn-alert--danger" style={{ marginTop: 12 }}>
                {scanResult.error}
              </div>
            )}
            {scanResult && !scanResult.error && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div className="rn-label">Interfaces ({scanResult.interfaces?.length || 0})</div>
                  <div className="rn-wizard-list">
                    {(scanResult.interfaces || []).map((iface, i) => (
                      <div key={i} className="rn-wizard-list__row">
                        {iface.name || iface.defaultName} {iface.type ? `(${iface.type})` : ""} {iface.running === "true" ? " - UP" : ""}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="rn-label">Pools ({scanResult.pools?.length || 0})</div>
                  <div className="rn-wizard-list">
                    {(scanResult.pools || []).map((pool, i) => (
                      <div key={i} className="rn-wizard-list__row">
                        {pool.name}: {pool.ranges}
                      </div>
                    ))}
                    {(!scanResult.pools || scanResult.pools.length === 0) && (
                      <div className="rn-wizard-list__row rn-muted">Nenhum pool encontrado</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="rn-field">
              <label className="rn-label">Interface</label>
              <select
                className="rn-select"
                value={config.interface}
                onChange={(e) => setConfig({ ...config, interface: e.target.value })}
              >
                {(scanResult?.interfaces || []).map((iface, i) => (
                  <option key={i} value={iface.name || iface.defaultName}>
                    {iface.name || iface.defaultName}
                  </option>
                ))}
              </select>
            </div>
            <div className="rn-field">
              <label className="rn-label">Endereço Local (CIDR)</label>
              <input
                type="text"
                className="rn-input"
                value={config.localAddress}
                onChange={(e) => setConfig({ ...config, localAddress: e.target.value })}
              />
            </div>
            <div className="rn-field">
              <label className="rn-label">Nome do Pool</label>
              <input
                type="text"
                className="rn-input"
                value={config.poolName}
                onChange={(e) => setConfig({ ...config, poolName: e.target.value })}
              />
            </div>
            <div className="rn-field">
              <label className="rn-label">Range do Pool</label>
              <input
                type="text"
                className="rn-input"
                value={config.poolRange}
                onChange={(e) => setConfig({ ...config, poolRange: e.target.value })}
              />
            </div>
            <div className="rn-field">
              <label className="rn-label">DNS Name (opcional)</label>
              <input
                type="text"
                className="rn-input"
                value={config.dnsName}
                onChange={(e) => setConfig({ ...config, dnsName: e.target.value })}
                placeholder="hotspot.meudominio.com"
              />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="rn-card" style={{ padding: "12px 14px", boxShadow: "none" }}>
              <div className="rn-label" style={{ marginBottom: 12 }}>Configuração RADIUS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="rn-field">
                  <label className="rn-label">Servidor RADIUS IP</label>
                  <input
                    type="text"
                    className="rn-input"
                    value={config.radiusServerIp}
                    onChange={(e) => setConfig({ ...config, radiusServerIp: e.target.value })}
                  />
                </div>
                <div className="rn-field">
                  <label className="rn-label">Porta</label>
                  <input
                    type="number"
                    className="rn-input"
                    value={config.radiusPort}
                    onChange={(e) => setConfig({ ...config, radiusPort: parseInt(e.target.value) || 1812 })}
                  />
                </div>
                <div className="rn-field">
                  <label className="rn-label">Secret</label>
                  <input
                    type="text"
                    className="rn-input"
                    value={config.radiusSecret}
                    onChange={(e) => setConfig({ ...config, radiusSecret: e.target.value })}
                    placeholder="Senha do MikroTik"
                  />
                </div>
              </div>
            </div>
            <p className="rn-muted" style={{ fontSize: 12, margin: 0 }}>
              O RADIUS sera configurado no MikroTik para apontar para o servidor acima.
              Para VPN, use o IP do tunnel (ex: 10.8.0.1).
            </p>
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <div className="rn-card" style={{ marginBottom: 16, padding: "12px 14px", boxShadow: "none", fontSize: 13 }}>
              <p style={{ margin: "0 0 4px" }}><strong>MikroTik:</strong> {selectedMikrotik?.nome || selectedMikrotik?.ip}</p>
              <p style={{ margin: "0 0 4px" }}><strong>Interface:</strong> {config.interface}</p>
              <p style={{ margin: "0 0 4px" }}><strong>IP:</strong> {config.localAddress}</p>
              <p style={{ margin: "0 0 4px" }}><strong>Pool:</strong> {config.poolName} ({config.poolRange})</p>
              <p style={{ margin: 0 }}><strong>RADIUS:</strong> {config.radiusServerIp}:{config.radiusPort}</p>
            </div>

            {!deployResult && (
              <button
                type="button"
                onClick={handleDeploy}
                disabled={deploying}
                className="rn-btn rn-btn--success"
              >
                {deploying ? "Deployando..." : "Iniciar Deploy"}
              </button>
            )}

            {deployResult && (
              <div>
                <div
                  className={`rn-alert ${deployResult.success ? "rn-alert--success" : "rn-alert--danger"}`}
                  style={{ marginBottom: 12 }}
                >
                  {deployResult.success ? "Deploy concluido com sucesso!" : `Erro: ${deployResult.error || "Falha no deploy"}`}
                </div>
                <div className="rn-wizard-list">
                  {(deployResult.steps || deployResult.log || []).map((item, i) => {
                    const step = typeof item === "string" ? { message: item, status: "ok" } : item;
                    return (
                      <div key={i} className="rn-wizard-list__row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: step.status === "ok" ? "var(--success-fg)" : "var(--danger-fg)" }}>
                          {step.status === "ok" ? "\u2713" : "\u2717"}
                        </span>
                        <span>{step.message}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rn-wizard-footer">
        <button
          type="button"
          onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="rn-btn rn-btn--ghost"
        >
          Voltar
        </button>
        <div className="rn-form-actions" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
          <button type="button" onClick={onClose} className="rn-btn rn-btn--secondary">
            Fechar
          </button>
          {currentStep < STEPS.length - 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canNext()}
              className="rn-btn rn-btn--primary"
            >
              Proximo
            </button>
          )}
        </div>
      </div>
    </AdminModal>
  );
}
