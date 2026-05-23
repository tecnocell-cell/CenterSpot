import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import SuperAdminLayout from '../../components/admin/SuperAdminLayout';

const STATE_LABELS = {
  online: 'Online',
  warning: 'Atenção',
  offline: 'Offline',
};

const STATE_CLASS = {
  online: 'rn-pill--success',
  warning: 'rn-pill--warning',
  offline: 'rn-pill--danger',
};

export default function SystemHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/system/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao carregar diagnóstico');
      }
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 30000);
    return () => clearInterval(id);
  }, [fetchHealth]);

  const overallClass = data?.status ? STATE_CLASS[data.status] || '' : '';

  return (
    <SuperAdminLayout
      title="Diagnóstico do sistema"
      subtitle="Healthcheck de serviços, recursos e integrações."
      maxWidth="56rem"
      actions={
        <button
          type="button"
          className="rn-btn rn-btn--secondary rn-btn--sm"
          onClick={() => {
            setLoading(true);
            fetchHealth();
          }}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'rn-spin' : ''} />
          Atualizar
        </button>
      }
    >
      {error && <div className="rn-alert rn-alert--danger">{error}</div>}

      {loading && !data ? (
        <div className="rn-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <Activity size={24} style={{ opacity: 0.5, marginBottom: 8 }} />
          <p className="rn-muted" style={{ margin: 0 }}>
            Coletando status…
          </p>
        </div>
      ) : data ? (
        <>
          <div className={`rn-kpi rn-kpi--${data.status === 'online' ? 'info' : data.status === 'warning' ? 'warning' : 'highlight'}`}>
            <span className="rn-kpi__label">Status geral</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span className={`rn-pill ${overallClass}`}>{STATE_LABELS[data.status] || data.status}</span>
              <span className="rn-muted" style={{ fontSize: 12 }}>
                {data.hostname} · {new Date(data.timestamp).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="rn-card rn-table-wrap">
            <table className="rn-table">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Status</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {data.checks.map((check) => (
                  <tr key={check.name}>
                    <td style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                      {check.name.replace(/_/g, ' ')}
                    </td>
                    <td>
                      <span className={`rn-pill ${STATE_CLASS[check.state] || ''}`}>
                        {STATE_LABELS[check.state] || check.state}
                      </span>
                    </td>
                    <td className="rn-muted" style={{ fontSize: 13 }}>
                      {check.detail || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </SuperAdminLayout>
  );
}
