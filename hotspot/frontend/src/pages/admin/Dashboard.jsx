import React, { useEffect, useState } from "react";
import {
  DollarSign,
  CreditCard,
  Users,
  Server,
  Zap,
  AlertTriangle,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");

  const token = localStorage.getItem("admin_token");

  const carregarDados = async () => {
    try {
      const res = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setDados(json);
    } catch (err) {
      setErro("Erro ao carregar dashboard");
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const cards = dados
    ? [
        {
          title: "Pagamentos (24h)",
          value: dados.pagamentos.ultimas_24h,
          icon: DollarSign,
          variant: "success",
        },
        {
          title: "Pagamentos (total)",
          value: dados.pagamentos.total,
          icon: CreditCard,
          variant: "info",
        },
        {
          title: "Usuários Radius",
          value: dados.radius.total_usuarios,
          icon: Users,
          variant: "highlight",
        },
        {
          title: "Mikrotiks Online",
          value: `${dados.mikrotiks.online} / ${dados.mikrotiks.total}`,
          icon: Server,
          variant: "warning",
        },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="rn-page-stack">
        <AdminPageHeader
          title="Dashboard"
          subtitle="Visão geral de pagamentos, usuários e conectividade."
        />

        {erro && (
          <div
            className="rn-alert rn-alert--danger"
            style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{erro}</span>
          </div>
        )}

        {!dados ? (
          <div
            className="rn-card"
            style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted-foreground)" }}
          >
            Carregando…
          </div>
        ) : (
          <>
            <div className="rn-kpi-grid">
              {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <div key={i} className={`rn-kpi rn-kpi--${card.variant}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span className="rn-kpi__label">{card.title}</span>
                      <Icon size={18} strokeWidth={1.75} style={{ color: "var(--primary)", opacity: 0.85 }} />
                    </div>
                    <span className="rn-kpi__value">{card.value}</span>
                  </div>
                );
              })}
            </div>

            {dados?.sessoes && (
              <section>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.75rem" }}>
                  <Zap size={18} strokeWidth={1.75} style={{ color: "var(--primary)" }} />
                  <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Sessões Ativas por Mikrotik</h2>
                </div>
                <div className="rn-card rn-table-wrap">
                  <table className="rn-table">
                    <thead>
                      <tr>
                        <th>Mikrotik</th>
                        <th style={{ textAlign: "right" }}>Conectados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.sessoes.map((s, i) => (
                        <tr key={i}>
                          <td>{s.nome}</td>
                          <td style={{ textAlign: "right" }}>
                            <span className="rn-pill rn-pill--info">{s.conectados}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
