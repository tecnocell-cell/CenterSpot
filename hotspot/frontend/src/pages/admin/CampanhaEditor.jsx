import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminPageHeader from "../../components/admin/AdminPageHeader";

export default function CampanhaEditor() {
  const { empresaSlug, id } = useParams();
  const [campanha, setCampanha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const token = localStorage.getItem("admin_token");

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campanhas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar campanha");
      setCampanha(data.data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [id]);

  const handleToggleAtivo = async () => {
    if (!campanha) return;
    try {
      const res = await fetch(`/api/campanhas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ativo: !campanha.ativo }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar campanha");
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = "";

    const formData = new FormData();
    formData.append("arquivo", file);

    setUploading(true);
    try {
      const res = await fetch(`/api/campanhas/${id}/itens`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type here — browser sets it with boundary automatically
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar arquivo");
      carregar();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletarItem = async (itemId) => {
    if (!confirm("Deseja remover este item?")) return;
    try {
      const res = await fetch(`/api/campanhas/${id}/itens/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erro ao remover item");
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReordenar = async (itens) => {
    const ordens = itens.map((item, idx) => ({ id: item.id, ordem: idx + 1 }));
    try {
      const res = await fetch(`/api/campanhas/${id}/itens/reordenar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ordens }),
      });
      if (!res.ok) throw new Error("Erro ao reordenar itens");
      carregar();
    } catch (err) {
      alert(err.message);
    }
  };

  const moverItem = (index, direcao) => {
    if (!campanha) return;
    const itens = [...campanha.itens];
    const novoIndex = index + direcao;
    if (novoIndex < 0 || novoIndex >= itens.length) return;
    // Swap
    [itens[index], itens[novoIndex]] = [itens[novoIndex], itens[index]];
    handleReordenar(itens);
  };

  const formatarDuracao = (segundos) => {
    if (!segundos) return "—";
    if (segundos < 60) return `${segundos}s`;
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="rn-page-stack">
          <AdminPageHeader title="Campanha" subtitle="Carregando…" />
          <div className="rn-card" style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted-foreground)" }}>
            Carregando…
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!campanha) {
    return (
      <AdminLayout>
        <div className="rn-page-stack">
          <AdminPageHeader title="Campanha" subtitle="Campanha não encontrada." />
          <div className="rn-alert rn-alert--danger">Campanha não encontrada.</div>
        </div>
      </AdminLayout>
    );
  }

  const itens = campanha.itens || [];

  return (
    <AdminLayout>
      <div className="rn-page-stack">
        <AdminPageHeader
          title={campanha.nome}
          subtitle={campanha.descricao || `${campanha.views ?? 0} views · ${itens.length} item(ns)`}
        >
          <Link to={`/admin/${empresaSlug}/campanhas`} className="rn-btn rn-btn--secondary rn-btn--sm">
            <ArrowLeft size={14} />
            Voltar
          </Link>
          <button
            type="button"
            onClick={handleToggleAtivo}
            className={`rn-pill ${campanha.ativo ? "rn-pill--success" : "rn-pill--neutral"}`}
            style={{ cursor: "pointer", border: "none", fontFamily: "inherit" }}
            title="Clique para alternar"
          >
            {campanha.ativo ? "Ativo" : "Inativo"}
          </button>
        </AdminPageHeader>

        <div className="rn-card" style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem", flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Itens da Campanha</h2>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                className="hidden"
                onChange={handleUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={uploading}
                className="rn-btn rn-btn--primary rn-btn--sm"
              >
                <Plus size={14} />
                {uploading ? "Enviando..." : "Adicionar item"}
              </button>
            </div>
          </div>
          <p className="rn-muted" style={{ fontSize: 11, marginBottom: "1rem" }}>
            Imagens: JPG, PNG, WEBP até 10MB. Vídeos: MP4, WEBM até 50MB.
          </p>

          {itens.length === 0 ? (
            <p className="rn-muted" style={{ fontSize: 13 }}>Nenhum item adicionado. Clique em &quot;Adicionar item&quot; para começar.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
              {itens.map((item, index) => (
                <article
                  key={item.id}
                  className="rn-card"
                  style={{ overflow: "hidden", padding: 0, boxShadow: "none" }}
                >
                  <div style={{ width: "100%", height: 160, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {item.tipo === "video" ? (
                      <video
                        src={item.arquivo_url}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        muted
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={item.arquivo_url}
                        alt={item.titulo || `Item ${index + 1}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>

                  <div style={{ padding: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="rn-pill rn-pill--neutral" style={{ textTransform: "capitalize" }}>{item.tipo}</span>
                      <span className="rn-muted" style={{ fontSize: 11 }}>{formatarDuracao(item.duracao_segundos)}</span>
                    </div>
                    {item.titulo && (
                      <p style={{ fontSize: 13, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.titulo}</p>
                    )}
                    {item.link_destino && (
                      <p style={{ fontSize: 11, color: "var(--info)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 8 }}>{item.link_destino}</p>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => moverItem(index, -1)}
                        disabled={index === 0}
                        className="rn-btn rn-btn--secondary rn-btn--sm"
                        title="Mover para cima"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverItem(index, 1)}
                        disabled={index === itens.length - 1}
                        className="rn-btn rn-btn--secondary rn-btn--sm"
                        title="Mover para baixo"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <div style={{ flex: 1 }} />
                      <button
                        type="button"
                        onClick={() => handleDeletarItem(item.id)}
                        className="rn-btn rn-btn--danger rn-btn--sm"
                        title="Remover item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
