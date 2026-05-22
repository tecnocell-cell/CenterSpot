import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminModal from "../../components/admin/AdminModal";
import ConfiguracaoMercadoPago from "../../components/admin/ConfiguracaoMercadoPago";
import ThemeEditor from "../../components/admin/ThemeEditor";
import ConfiguracoesGeralPanel from "../../components/admin/settings/ConfiguracoesGeralPanel";
import ConfiguracoesUsuariosPanel from "../../components/admin/settings/ConfiguracoesUsuariosPanel";
import ConfiguracoesPermissoesPanel from "../../components/admin/settings/ConfiguracoesPermissoesPanel";
import { useAuth } from "../../contexts/AuthContext";

const ALL_TABS = [
  { id: "geral", label: "Geral", perm: "configuracoes" },
  { id: "aparencia", label: "Aparência", perm: "configuracoes" },
  { id: "usuarios", label: "Usuários", perm: "usuarios" },
  { id: "permissoes", label: "Permissões", perm: "grupos-permissao", superOnly: true },
  { id: "limpeza", label: "Limpeza avançada", perm: "configuracoes" },
  { id: "mercado", label: "Mercado Pago", perm: "configuracoes" },
];

const acoes = [
  { chave: "radius", titulo: "Limpar Usuários RADIUS", endpoint: "/api/limpeza/radius" },
  { chave: "pagamentos", titulo: "Limpar Pagamentos", endpoint: "/api/limpeza/pagamentos" },
  { chave: "lgpd", titulo: "Limpar Logins LGPD", endpoint: "/api/limpeza/lgpd" },
];

export default function Configuracoes() {
  const { isSuperAdmin, hasPermission } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const tabs = useMemo(
    () =>
      ALL_TABS.filter((t) => {
        if (t.superOnly && !isSuperAdmin) return false;
        if (isSuperAdmin) return true;
        if (t.id === "permissoes") return false;
        if (t.perm === "usuarios") return hasPermission("usuarios", "ver");
        return hasPermission("configuracoes", "ver");
      }),
    [isSuperAdmin, hasPermission]
  );

  const aba = tabs.some((t) => t.id === tabParam) ? tabParam : tabs[0]?.id || "geral";

  const setAba = (id) => setSearchParams({ tab: id }, { replace: true });

  useEffect(() => {
    if (!tabs.length) return;
    if (tabParam !== aba) {
      setSearchParams({ tab: aba }, { replace: true });
    }
  }, [tabParam, aba, tabs.length, setSearchParams]);

  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("admin_token");

  const executarAcao = async (acao) => {
    setLoading(true);
    try {
      const res = await fetch(acao.endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        const erroTexto = contentType?.includes("application/json")
          ? (await res.json()).message
          : await res.text();
        throw new Error(erroTexto || "Erro desconhecido.");
      }
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      alert("Erro ao executar ação: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
      setModal(null);
    }
  };

  const canConfig = isSuperAdmin || hasPermission("configuracoes", "ver");
  const canUsuarios = isSuperAdmin || hasPermission("usuarios", "ver");
  const canPermissoes = isSuperAdmin;

  return (
    <AdminLayout>
      <div className="rn-page-stack">
        <AdminPageHeader
          title="Configurações"
          subtitle="Gerencie preferências, usuários, permissões e integrações da empresa."
        />

        <div className="rn-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rn-tab ${aba === t.id ? "active" : ""}`}
              onClick={() => setAba(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {aba === "geral" && (
          <ConfiguracoesGeralPanel
            onIrPara={setAba}
            isSuperAdmin={isSuperAdmin}
            canUsuarios={canUsuarios}
            canPermissoes={canPermissoes}
            canConfig={canConfig}
          />
        )}

        {aba === "aparencia" && <ThemeEditor />}

        {aba === "usuarios" && <ConfiguracoesUsuariosPanel />}

        {aba === "permissoes" && isSuperAdmin && <ConfiguracoesPermissoesPanel />}

        {aba === "limpeza" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {acoes.map((acao) => (
              <div
                key={acao.chave}
                className="rn-card"
                style={{
                  padding: "1rem 1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{acao.titulo}</h2>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
                    Esta ação é irreversível. Use com cautela.
                  </p>
                </div>
                <button type="button" className="rn-btn rn-btn--danger" onClick={() => setModal(acao)}>
                  Executar
                </button>
              </div>
            ))}
          </div>
        )}

        {aba === "mercado" && <ConfiguracaoMercadoPago />}

        <AdminModal open={!!modal} onClose={() => setModal(null)} title="Confirmar ação">
          <p className="rn-muted" style={{ margin: "0 0 1.25rem", lineHeight: 1.5 }}>
            Tem certeza que deseja <strong style={{ color: "var(--foreground)" }}>{modal?.titulo}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="rn-form-actions" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
            <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="rn-btn rn-btn--danger"
              onClick={() => executarAcao(modal)}
              disabled={loading}
            >
              {loading ? "Executando..." : "Confirmar"}
            </button>
          </div>
        </AdminModal>
      </div>
    </AdminLayout>
  );
}
