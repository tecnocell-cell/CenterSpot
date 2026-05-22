import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [ordenarPor, setOrdenarPor] = useState("id");
  const [ordemAsc, setOrdemAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const fetchPagamentos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pagamentos/todos", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
      });
      const data = await res.json();
      setPagamentos(data);
    } catch (err) {
      console.error("Erro ao buscar pagamentos:", err);
      setErro("Erro ao carregar pagamentos");
    } finally {
      setLoading(false);
    }
  };

  const liberarManual = async (id) => {
    if (!window.confirm("Deseja liberar este cliente manualmente?")) return;
    try {
      await fetch(`/api/pagamentos/liberar/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
      });
      alert("Usuário liberado com sucesso!");
      fetchPagamentos();
    } catch (err) {
      console.error("Erro ao liberar manualmente:", err);
      alert("Erro ao liberar.");
    }
  };

  useEffect(() => {
    fetchPagamentos();
  }, []);

  const toggleOrdenacao = (campo) => {
    if (ordenarPor === campo) {
      setOrdemAsc(!ordemAsc);
    } else {
      setOrdenarPor(campo);
      setOrdemAsc(true);
    }
  };

  const pagamentosFiltrados = pagamentos.filter((p) => {
    if (filtro === "todos") return true;
    if (filtro === "aprovados") return p.status.toLowerCase() === "approved";
    if (filtro === "pendentes") return p.status.toLowerCase() === "aguardando";
    return true;
  });

  const pagamentosOrdenados = [...pagamentosFiltrados].sort((a, b) => {
    if (ordemAsc) return a[ordenarPor] > b[ordenarPor] ? 1 : -1;
    else return a[ordenarPor] < b[ordenarPor] ? 1 : -1;
  });

  const badgeStatus = (status) => {
    const lower = status.toLowerCase();
    if (lower === "approved") {
      return <span className="rn-pill rn-pill--success">Aprovado</span>;
    }
    if (lower === "aguardando") {
      return <span className="rn-pill rn-pill--warning">Aguardando</span>;
    }
    return <span className="rn-pill rn-pill--neutral">{status}</span>;
  };

  const stats = {
    total: pagamentos.length,
    aprovados: pagamentos.filter((p) => p.status.toLowerCase() === "approved").length,
    pendentes: pagamentos.filter((p) => p.status.toLowerCase() === "aguardando").length,
    totalValor:
      pagamentos
        .filter((p) => p.status.toLowerCase() === "approved")
        .reduce((acc, p) => acc + (p.valor || 0), 0) / 100,
  };

  const SortIcon = ({ campo }) => {
    if (ordenarPor !== campo) return null;
    return <span style={{ fontSize: 10, marginLeft: 4 }}>{ordemAsc ? "↑" : "↓"}</span>;
  };

  const filtros = [
    { key: "todos", label: "Todos" },
    { key: "aprovados", label: "Aprovados" },
    { key: "pendentes", label: "Pendentes" },
  ];

  return (
    <AdminLayout>
      <div className="rn-page-stack">
        <AdminPageHeader
          title="Pagamentos"
          subtitle="Gerenciamento de transações e cobranças"
        />

        <div className="rn-grid-kpi">
          <div className="rn-kpi rn-kpi--highlight">
            <span className="rn-kpi__label">Total de Pagamentos</span>
            <span className="rn-kpi__value">{stats.total}</span>
          </div>
          <div className="rn-kpi rn-kpi--success">
            <span className="rn-kpi__label">Aprovados</span>
            <span className="rn-kpi__value">{stats.aprovados}</span>
          </div>
          <div className="rn-kpi rn-kpi--warning">
            <span className="rn-kpi__label">Pendentes</span>
            <span className="rn-kpi__value">{stats.pendentes}</span>
          </div>
          <div className="rn-kpi rn-kpi--info">
            <span className="rn-kpi__label">Valor Aprovado</span>
            <span className="rn-kpi__value" style={{ fontSize: 20 }}>
              R$ {stats.totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="rn-tabs" style={{ borderBottom: "none", marginBottom: 0 }}>
          {filtros.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`rn-tab ${filtro === f.key ? "active" : ""}`}
              onClick={() => setFiltro(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {erro && <div className="rn-alert rn-alert--danger">{erro}</div>}

        {loading ? (
          <p className="rn-muted" style={{ textAlign: "center", padding: "2.5rem 0" }}>
            Carregando pagamentos...
          </p>
        ) : pagamentosOrdenados.length === 0 ? (
          <div className="rn-card" style={{ padding: "2.5rem", textAlign: "center" }}>
            <p style={{ fontWeight: 600, margin: "0 0 0.5rem" }}>Nenhum pagamento encontrado</p>
            <p className="rn-muted" style={{ fontSize: 13, margin: 0 }}>
              {filtro !== "todos" ? "Tente outro filtro" : "Ainda não há pagamentos registrados"}
            </p>
          </div>
        ) : (
          <div className="rn-card rn-table-wrap">
            <table className="rn-table">
              <thead>
                <tr>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleOrdenacao("id")}>
                    ID
                    <SortIcon campo="id" />
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleOrdenacao("nome_plano")}>
                    Plano
                    <SortIcon campo="nome_plano" />
                  </th>
                  <th>MAC</th>
                  <th>IP</th>
                  <th>ID MP</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleOrdenacao("valor")}>
                    Valor
                    <SortIcon campo="valor" />
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleOrdenacao("status")}>
                    Status
                    <SortIcon campo="status" />
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleOrdenacao("criado_em")}>
                    Data
                    <SortIcon campo="criado_em" />
                  </th>
                  <th style={{ textAlign: "right" }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {pagamentosOrdenados.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>#{p.id}</td>
                    <td style={{ fontWeight: 500 }}>{p.nome_plano}</td>
                    <td className="rn-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {p.mac || "-"}
                    </td>
                    <td className="rn-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {p.ip || "-"}
                    </td>
                    <td className="rn-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {p.mp_pagamento_id ?? "-"}
                    </td>
                    <td style={{ fontWeight: 600 }}>R$ {(p.valor / 100).toFixed(2)}</td>
                    <td>{badgeStatus(p.status)}</td>
                    <td className="rn-muted" style={{ fontSize: 12 }}>
                      {new Date(p.criado_em).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="rn-btn rn-btn--success rn-btn--sm"
                        onClick={() => liberarManual(p.id)}
                      >
                        Liberar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagamentosOrdenados.length > 0 && (
          <p className="rn-muted" style={{ textAlign: "center", fontSize: 12 }}>
            Exibindo {pagamentosOrdenados.length} de {pagamentos.length} pagamentos
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
