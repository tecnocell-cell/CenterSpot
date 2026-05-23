import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import SuperAdminLayout from '../../components/admin/SuperAdminLayout';

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/system-backup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(Array.isArray(data) ? data : data.backups || []);
      } else {
        setMessage({ type: 'error', text: 'Erro ao carregar backups.' });
      }
    } catch (err) {
      console.error('Erro ao buscar backups:', err);
      setMessage({ type: 'error', text: 'Erro de conexão ao buscar backups.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/system-backup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Backup criado com sucesso!' });
        fetchBackups();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao criar backup.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão ao criar backup.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async (backup) => {
    if (
      !confirm(
        `Restaurar o backup "${backup.id || backup.filename}"?\n\nIsso sobrescreve os dados atuais. O sistema será reiniciado.`
      )
    ) {
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/system-backup/restore/${backup.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: 'Restauração iniciada! A página será recarregada em 10 segundos…',
        });
        setTimeout(() => window.location.reload(), 10000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao restaurar backup.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão ao restaurar backup.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (backup) => {
    if (!confirm(`Remover o backup "${backup.id || backup.filename}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/system-backup/${backup.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Backup removido com sucesso!' });
        fetchBackups();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao remover backup.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão ao remover backup.' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const getTipoPill = (tipo) => {
    if (tipo === 'pre_update' || tipo === 'pre-atualizacao' || tipo === 'pre_atualizacao') {
      return <span className="rn-pill rn-pill--info">Pré-atualização</span>;
    }
    return <span className="rn-pill">Manual</span>;
  };

  const hasFiles = (backup) => backup.db_exists !== false && backup.files_exists !== false;

  return (
    <SuperAdminLayout
      title="Backups do sistema"
      subtitle="Backups de banco de dados e arquivos antes de atualizações."
      maxWidth="72rem"
      actions={
        <button
          type="button"
          className="rn-btn rn-btn--primary rn-btn--sm"
          onClick={handleCreateBackup}
          disabled={actionLoading}
        >
          <Plus size={14} />
          {actionLoading ? 'Aguarde…' : 'Criar backup'}
        </button>
      }
    >
      {message && (
        <div className={`rn-alert rn-alert--${message.type === 'success' ? 'success' : 'danger'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="rn-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
          Carregando backups…
        </div>
      ) : backups.length === 0 ? (
        <div className="rn-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ fontWeight: 600, margin: '0 0 0.5rem' }}>Nenhum backup encontrado</p>
          <p className="rn-muted" style={{ margin: 0, fontSize: 13 }}>
            Clique em &quot;Criar backup&quot; para gerar o primeiro backup do sistema.
          </p>
        </div>
      ) : (
        <div className="rn-card rn-table-wrap">
          <table className="rn-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Atualização</th>
                <th>Data</th>
                <th style={{ textAlign: 'center' }}>Banco</th>
                <th style={{ textAlign: 'center' }}>Arquivos</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => {
                const filesOk = hasFiles(backup);
                return (
                  <tr key={backup.id}>
                    <td>{getTipoPill(backup.tipo || backup.type)}</td>
                    <td className="rn-muted" style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                      {backup.update_id || '—'}
                    </td>
                    <td>{formatDate(backup.criado_em || backup.created_at || backup.date)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`rn-pill ${backup.db_exists !== false ? 'rn-pill--success' : 'rn-pill--danger'}`}>
                        {backup.db_exists !== false ? 'OK' : 'Ausente'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`rn-pill ${filesOk ? 'rn-pill--success' : ''}`}>
                        {filesOk ? 'OK' : 'Ausente'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="rn-btn rn-btn--secondary rn-btn--sm"
                          onClick={() => handleRestore(backup)}
                          disabled={actionLoading || !filesOk}
                          title={!filesOk ? 'Arquivos ausentes' : 'Restaurar'}
                        >
                          Restaurar
                        </button>
                        <button
                          type="button"
                          className="rn-btn rn-btn--danger rn-btn--sm"
                          onClick={() => handleDelete(backup)}
                          disabled={actionLoading}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="rn-alert rn-alert--warning">
        <p style={{ fontWeight: 600, margin: '0 0 0.35rem' }}>Acesso de emergência</p>
        <p className="rn-muted" style={{ margin: '0 0 0.5rem', fontSize: 13, lineHeight: 1.5 }}>
          Se o sistema ficar inacessível após restauração ou atualização, use no servidor:
        </p>
        <code
          style={{
            display: 'block',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-2)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}
        >
          http://servidor:3001/emergency
        </code>
      </div>
    </SuperAdminLayout>
  );
}
