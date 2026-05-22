import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import PageShell from "../../components/admin/PageShell";

export function SessoesPanel({ embedded = false }) {
  const [sessoes, setSessoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregarSessoes = async () => {
    try {
      const res = await fetch("/api/radius/sessoes", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar sessões");
      setSessoes(data);
    } catch (err) {
      console.error("Erro ao carregar sessões:", err);
      setSessoes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarSessoes();
  }, []);

  const subtitle = loading
    ? "Carregando sessões…"
    : `${sessoes.length} sessão(ões) ativa(s) no momento`;

  const toolbar = (
    <div className="rn-settings-toolbar">
      <p className="rn-muted" style={{ margin: 0, fontSize: 12 }}>
        {subtitle}
      </p>
    </div>
  );

  return (
    <PageShell embedded={embedded}>
      {embedded ? toolbar : (
        <AdminPageHeader title="Sessões RADIUS Ativas" subtitle={subtitle} />
      )}

      {loading ? (
        <p className="rn-muted" style={{ textAlign: "center", padding: "2.5rem 0" }}>
          Carregando sessões…
        </p>
      ) : (
        <div className="rn-card rn-table-wrap">
          <table className="rn-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>CPF</th>
                <th>MAC</th>
                <th>IP</th>
                <th>NAS (Mikrotik)</th>
                <th>Início da Sessão</th>
              </tr>
            </thead>
            <tbody>
              {sessoes.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.username}</td>
                  <td className="rn-muted">{s.cpf || "—"}</td>
                  <td className="rn-muted">{s.mac || "—"}</td>
                  <td className="rn-muted">{s.ip || "—"}</td>
                  <td>{s.gateway || "—"}</td>
                  <td className="rn-muted">
                    {new Date(s.acctstarttime).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
              {sessoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="rn-muted" style={{ textAlign: "center", padding: "2rem" }}>
                    Nenhuma sessão ativa no momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}

export default function Sessoes() {
  const { empresaSlug } = useParams();
  return <Navigate to={`/admin/${empresaSlug}/radius?tab=sessoes`} replace />;
}
