import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Shield,
  Users,
  CreditCard,
  Code2,
  Server,
  Eye,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";

const TIPO_META = {
  lgpd: { label: "LGPD", icon: Shield },
  planos: { label: "Planos", icon: CreditCard },
  lead: { label: "Lead", icon: Users },
  lead_passivo: { label: "Lead passivo", icon: Users },
  custom: { label: "Personalizado", icon: Code2 },
};

export default function Portais() {
  const [portais, setPortais] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);

  const { empresaSlug } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("admin_token");

  const carregarPlanos = async () => {
    try {
      const res = await fetch("/api/planos", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPlanos(await res.json());
    } catch {
      /* silencioso */
    }
  };

  const carregarPortais = async () => {
    try {
      const res = await fetch("/api/portais", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPortais(data);
    } catch (err) {
      console.error("Erro ao carregar portais:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPortais();
    carregarPlanos();
  }, []);

  const tipoMeta = (tipo) => TIPO_META[tipo] || TIPO_META.custom;

  const faltaPlanoLgpd = !loading && !planos.some((p) => p.nome === "LGPD");
  const faltaPlanoLead = !loading && !planos.some((p) => p.nome?.toLowerCase() === "lead");

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Portais Captive"
        subtitle="Páginas de autenticação e captura exibidas nos Mikrotiks vinculados à empresa."
      />

      {(faltaPlanoLgpd || faltaPlanoLead) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.25rem" }}>
          {faltaPlanoLgpd && (
            <div className="rn-alert rn-alert--warning" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ display: "block", fontSize: 13 }}>Plano LGPD não encontrado</strong>
                <span style={{ fontSize: 12, opacity: 0.9 }}>
                  Crie um plano gratuito com o nome <strong>LGPD</strong> em Planos para o portal LGPD funcionar.
                </span>
              </div>
            </div>
          )}
          {faltaPlanoLead && (
            <div className="rn-alert rn-alert--warning" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong style={{ display: "block", fontSize: 13 }}>Plano Lead não encontrado</strong>
                <span style={{ fontSize: 12, opacity: 0.9 }}>
                  Crie um plano gratuito com o nome <strong>Lead</strong> em Planos para o portal de leads funcionar.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="rn-card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted-foreground)" }}>
          Carregando portais…
        </div>
      ) : portais.length === 0 ? (
        <div className="rn-card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted-foreground)" }}>
          Nenhum portal cadastrado para esta empresa.
        </div>
      ) : (
        <div className="rn-portal-grid">
          {portais.map((p) => {
            const meta = tipoMeta(p.tipo);
            const Icon = meta.icon;
            return (
              <article key={p.id} className="rn-portal-card">
                <div className="rn-portal-card__head">
                  <div className="rn-portal-card__icon">
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <div className="rn-portal-card__title-wrap">
                    <h3 className="rn-portal-card__title">{p.nome}</h3>
                    <p className="rn-portal-card__slug">/{p.slug}</p>
                  </div>
                  <span className="rn-pill rn-pill--neutral">{meta.label}</span>
                </div>

                {p.descricao && (
                  <p className="rn-portal-card__desc">{p.descricao}</p>
                )}

                <div className="rn-portal-card__meta-row">
                  {p.template_nome && (
                    <span className="rn-portal-card__chip">{p.template_nome}</span>
                  )}
                  {(p.cor_primaria || (p.cor_fundo && p.cor_fundo !== "#0f111a")) && (
                    <span className="rn-portal-card__colors" title="Cores do portal">
                      {p.cor_primaria && (
                        <span className="rn-portal-card__swatch" style={{ background: p.cor_primaria }} />
                      )}
                      {p.cor_fundo && p.cor_fundo !== "#0f111a" && (
                        <span className="rn-portal-card__swatch" style={{ background: p.cor_fundo }} />
                      )}
                    </span>
                  )}
                </div>

                <div className="rn-portal-card__stat">
                  <Server size={14} strokeWidth={1.75} />
                  <span>
                    {p.mikrotiks_vinculados} Mikrotik{p.mikrotiks_vinculados !== 1 ? "s" : ""} vinculado
                    {p.mikrotiks_vinculados !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="rn-portal-card__actions">
                  <button
                    type="button"
                    className="rn-btn rn-btn--secondary rn-btn--sm"
                    onClick={() =>
                      window.open(
                        `/api/portais/${p.id}/preview?token=${encodeURIComponent(token)}`,
                        "_blank"
                      )
                    }
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                  <button
                    type="button"
                    className="rn-btn rn-btn--primary rn-btn--sm"
                    onClick={() => navigate(`/admin/${empresaSlug}/portais/${p.id}/editor`)}
                  >
                    <Pencil size={14} />
                    Editor visual
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
