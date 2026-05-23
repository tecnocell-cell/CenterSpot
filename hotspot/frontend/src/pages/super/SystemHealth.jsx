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

const CARD_ACCENT = {
  online: 'rn-kpi--info',
  warning: 'rn-kpi--warning',
  offline: 'rn-kpi--highlight',
};

function parseApiError(res, body) {
  const msg =
    body?.error ||
    body?.message ||
    (typeof body === 'string' ? body : null);
  if (msg) return `${res.status}: ${msg}`;
  return `HTTP ${res.status}: Falha ao carregar diagnóstico`;
}

export default function SystemHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      setError('401: Token não encontrado. Faça login novamente como super admin.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/system/health', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      let body = {};
      const text = await res.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = { message: text.slice(0, 200) };
        }
      }

      if (!res.ok) {
        throw new Error(parseApiError(res, body));
      }

      if (!Array.isArray(body.checks)) {
        throw new Error('Resposta inválida: campo checks ausente');
      }

      setData(body);
      setError(null);
    } catch (e) {
      setError(e.message || 'Falha ao carregar diagnóstico');
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
  const checks = data?.checks ?? [];

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
      {error && (
        <div className="rn-alert rn-alert--danger" role="alert">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="rn-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <Activity size={24} style={{ opacity: 0.5, marginBottom: 8 }} />
          <p className="rn-muted" style={{ margin: 0 }}>
            Coletando status…
          </p>
        </div>
      ) : null}

      {data && (
        <>
          <div
            className={`rn-kpi ${
              data.status === 'online'
                ? 'rn-kpi--info'
                : data.status === 'warning'
                  ? 'rn-kpi--warning'
                  : 'rn-kpi--highlight'
            }`}
          >
            <span className="rn-kpi__label">Status geral</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span className={`rn-pill ${overallClass}`}>
                {STATE_LABELS[data.status] || data.status}
              </span>
              <span className="rn-muted" style={{ fontSize: 12 }}>
                {data.hostname} · {new Date(data.timestamp).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="rn-kpi-grid">
            {checks.map((check) => (
              <div
                key={check.name}
                className={`rn-kpi ${CARD_ACCENT[check.state] || 'rn-kpi--info'}`}
              >
                <span className="rn-kpi__label" style={{ textTransform: 'capitalize' }}>
                  {check.name.replace(/_/g, ' ')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span className={`rn-pill ${STATE_CLASS[check.state] || ''}`}>
                    {STATE_LABELS[check.state] || check.state}
                  </span>
                </div>
                {check.detail && (
                  <p className="rn-muted" style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.4 }}>
                    {check.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </SuperAdminLayout>
  );
}
