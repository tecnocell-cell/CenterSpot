import React, { useState, useEffect } from "react";
import axios from "axios";

export default function ConfiguracaoEfi() {
  const [form, setForm] = useState({
    client_id: "",
    client_secret: "",
    chave_pix: "",
    ambiente: "sandbox",
    certificado_nome: "",
  });

  useEffect(() => {
    axios
      .get("/api/empresa-config/efi")
      .then((res) => {
        setForm({
          client_id: res.data?.client_id || "",
          client_secret: res.data?.client_secret || "",
          chave_pix: res.data?.chave_pix || "",
          ambiente: res.data?.ambiente || "sandbox",
          certificado_nome: res.data?.certificado_nome || "",
        });
      })
      .catch((err) => console.error("Erro ao carregar config EFI:", err));
  }, []);

  const salvar = () => {
    axios
      .post("/api/empresa-config/efi", form)
      .then(() => alert("Configurações EFI salvas com sucesso!"))
      .catch(() => alert("Erro ao salvar configurações EFI."));
  };

  return (
    <div className="rn-card" style={{ padding: "1.25rem 1.5rem" }}>
      <div className="rn-page-stack" style={{ gap: "1rem" }}>
        <div className="rn-field">
          <label className="rn-label" htmlFor="efi-client-id">
            Client ID
          </label>
          <input
            id="efi-client-id"
            type="text"
            className="rn-input"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          />
        </div>
        <div className="rn-field">
          <label className="rn-label" htmlFor="efi-client-secret">
            Client Secret
          </label>
          <input
            id="efi-client-secret"
            type="text"
            className="rn-input"
            value={form.client_secret}
            onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
          />
        </div>
        <div className="rn-field">
          <label className="rn-label" htmlFor="efi-chave-pix">
            Chave PIX
          </label>
          <input
            id="efi-chave-pix"
            type="text"
            className="rn-input"
            value={form.chave_pix}
            onChange={(e) => setForm({ ...form, chave_pix: e.target.value })}
          />
        </div>
        <div className="rn-field">
          <label className="rn-label" htmlFor="efi-ambiente">
            Ambiente
          </label>
          <select
            id="efi-ambiente"
            className="rn-select"
            value={form.ambiente}
            onChange={(e) => setForm({ ...form, ambiente: e.target.value })}
          >
            <option value="sandbox">Sandbox</option>
            <option value="producao">Produção</option>
          </select>
        </div>
        <div className="rn-field">
          <label className="rn-label" htmlFor="efi-cert">
            Nome do certificado
          </label>
          <input
            id="efi-cert"
            type="text"
            className="rn-input"
            value={form.certificado_nome}
            onChange={(e) => setForm({ ...form, certificado_nome: e.target.value })}
          />
        </div>
        <div className="rn-form-actions" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
          <button type="button" className="rn-btn rn-btn--primary" onClick={salvar}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
