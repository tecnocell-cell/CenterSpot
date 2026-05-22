import React, { useState, useEffect } from "react";
import axios from "axios";

export default function ConfiguracaoMercadoPago() {
  const [form, setForm] = useState({
    public_key: "",
    access_token: "",
    client_id: "",
    client_secret: "",
    email_pagador: "",
    webhook_secret: "",
  });

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios
      .get("/api/empresa-config/mercadopago", { headers })
      .then((res) => {
        setForm({
          public_key: res.data?.public_key || "",
          access_token: res.data?.access_token || "",
          client_id: res.data?.client_id || "",
          client_secret: res.data?.client_secret || "",
          email_pagador: res.data?.email_pagador || "",
          webhook_secret: res.data?.webhook_secret || "",
        });
      })
      .catch((err) => console.error("Erro ao carregar config:", err));
  }, []);

  const salvar = () => {
    axios
      .post("/api/empresa-config/mercadopago", form, { headers })
      .then(() => alert("Configurações salvas com sucesso!"))
      .catch(() => alert("Erro ao salvar configurações."));
  };

  const testarConexao = () => {
    axios
      .post("/api/empresa-config/mercadopago/testar", {}, { headers })
      .then((res) => {
        alert("✅ Comunicação OK com Mercado Pago!\nUsuário: " + res.data.usuario.nickname);
      })
      .catch((err) => {
        console.error(err);
        alert("❌ Falha na comunicação com Mercado Pago.");
      });
  };

  return (
    <div className="rn-card" style={{ padding: "1.25rem 1.5rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="rn-field">
          <label className="rn-label">Public Key</label>
          <input
            type="text"
            className="rn-input"
            value={form.public_key}
            onChange={(e) => setForm({ ...form, public_key: e.target.value })}
          />
        </div>

        <div className="rn-field">
          <label className="rn-label">Access Token</label>
          <input
            type="text"
            className="rn-input"
            value={form.access_token}
            onChange={(e) => setForm({ ...form, access_token: e.target.value })}
          />
        </div>

        <div className="rn-form-grid-2">
          <div className="rn-field">
            <label className="rn-label">Client ID</label>
            <input
              type="text"
              className="rn-input"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            />
          </div>
          <div className="rn-field">
            <label className="rn-label">Client Secret</label>
            <input
              type="text"
              className="rn-input"
              value={form.client_secret}
              onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
            />
          </div>
        </div>

        <div className="rn-field">
          <label className="rn-label">Email do Pagador (fallback)</label>
          <input
            type="email"
            className="rn-input"
            value={form.email_pagador}
            onChange={(e) => setForm({ ...form, email_pagador: e.target.value })}
            placeholder="email@empresa.com"
          />
          <p className="rn-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
            Usado quando o cliente não preencher email
          </p>
        </div>

        <div className="rn-field">
          <label className="rn-label">Webhook URL</label>
          <input
            type="text"
            className="rn-input"
            value={`${window.location.origin}/api/pagamentos/notificacao`}
            readOnly
            style={{ opacity: 0.75 }}
          />
        </div>

        <div className="rn-field">
          <label className="rn-label">Webhook Secret</label>
          <input
            type="text"
            className="rn-input"
            value={form.webhook_secret}
            onChange={(e) => setForm({ ...form, webhook_secret: e.target.value })}
          />
        </div>
      </div>

      <div className="rn-form-actions">
        <button type="button" className="rn-btn rn-btn--secondary" onClick={testarConexao}>
          Testar Conexão
        </button>
        <button type="button" className="rn-btn rn-btn--primary" onClick={salvar}>
          Salvar
        </button>
      </div>
    </div>
  );
}
