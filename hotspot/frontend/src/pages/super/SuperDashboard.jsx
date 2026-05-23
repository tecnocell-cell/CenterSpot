import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Router, Users, ArrowRight } from 'lucide-react';
import SuperAdminLayout from '../../components/admin/SuperAdminLayout';

export default function SuperDashboard() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/empresas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setEmpresas(await res.json());
    } catch (err) {
      console.error('Erro ao buscar empresas:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalMikrotiks = empresas.reduce((acc, e) => acc + (e.total_mikrotiks || 0), 0);
  const totalAdmins = empresas.reduce((acc, e) => acc + (e.total_admins || 0), 0);

  const quickLinks = [
    { to: '/super/empresas', label: 'Gerenciar empresas', variant: 'primary' },
    { to: '/super/atualizar', label: 'Atualizar sistema', variant: 'secondary' },
    { to: '/super/backups', label: 'Backups', variant: 'secondary' },
    { to: '/super/system', label: 'Diagnóstico', variant: 'secondary' },
    { to: '/super/publicar-atualizacao', label: 'Publicar atualização', variant: 'secondary' },
  ];

  return (
    <SuperAdminLayout
      title="Painel Super Admin"
      subtitle="Gerenciamento da plataforma multi-tenant."
    >
      <div className="rn-kpi-grid">
        <div className="rn-kpi rn-kpi--info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="rn-kpi__label">Total de empresas</span>
            <Building2 size={18} strokeWidth={1.75} style={{ color: 'var(--primary)', opacity: 0.85 }} />
          </div>
          <span className="rn-kpi__value">{empresas.length}</span>
        </div>
        <div className="rn-kpi rn-kpi--warning">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="rn-kpi__label">Total de MikroTiks</span>
            <Router size={18} strokeWidth={1.75} style={{ color: 'var(--primary)', opacity: 0.85 }} />
          </div>
          <span className="rn-kpi__value">{totalMikrotiks}</span>
        </div>
        <div className="rn-kpi rn-kpi--highlight">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="rn-kpi__label">Total de admins</span>
            <Users size={18} strokeWidth={1.75} style={{ color: 'var(--primary)', opacity: 0.85 }} />
          </div>
          <span className="rn-kpi__value">{totalAdmins}</span>
        </div>
      </div>

      <div className="rn-settings-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`rn-btn rn-btn--${link.variant} rn-btn--sm`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <section>
        <h2 className="rn-section-sub" style={{ marginBottom: '0.75rem' }}>
          Empresas
        </h2>

        {loading ? (
          <div className="rn-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
            Carregando…
          </div>
        ) : (
          <div className="rn-card rn-table-wrap">
            <table className="rn-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Slug</th>
                  <th style={{ textAlign: 'center' }}>MikroTiks</th>
                  <th style={{ textAlign: 'center' }}>Planos</th>
                  <th style={{ textAlign: 'center' }}>Admins</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <p style={{ fontWeight: 600, margin: 0 }}>{e.nome}</p>
                    </td>
                    <td className="rn-muted">{e.slug}</td>
                    <td style={{ textAlign: 'center' }}>{e.total_mikrotiks || 0}</td>
                    <td style={{ textAlign: 'center' }}>{e.total_planos || 0}</td>
                    <td style={{ textAlign: 'center' }}>{e.total_admins || 0}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`rn-pill ${e.ativo ? 'rn-pill--success' : 'rn-pill--danger'}`}>
                        {e.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <a
                        href={`/admin/${e.slug}`}
                        className="rn-btn rn-btn--ghost rn-btn--sm"
                        onClick={async (ev) => {
                          ev.preventDefault();
                          try {
                            const token = localStorage.getItem('admin_token');
                            const res = await fetch('/api/auth/switch-empresa', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ empresa_id: e.id }),
                            });
                            const data = await res.json();
                            if (res.ok && data.token) {
                              localStorage.setItem('admin_token', data.token);
                            }
                          } catch {
                            /* segue para o painel */
                          }
                          window.location.href = `/admin/${e.slug}`;
                        }}
                      >
                        Acessar
                        <ArrowRight size={14} style={{ marginLeft: 4 }} />
                      </a>
                    </td>
                  </tr>
                ))}
                {empresas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="rn-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                      Nenhuma empresa cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SuperAdminLayout>
  );
}
