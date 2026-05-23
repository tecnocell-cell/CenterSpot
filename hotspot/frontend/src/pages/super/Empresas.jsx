import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import SuperAdminLayout from '../../components/admin/SuperAdminLayout';
import AdminModal from '../../components/admin/AdminModal';

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', cnpj: '', email: '', telefone: '' });
  const [erro, setErro] = useState(null);

  const token = localStorage.getItem('admin_token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const res = await fetch('/api/empresas', { headers });
      if (res.ok) setEmpresas(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    try {
      const url = editId ? `/api/empresas/${editId}` : '/api/empresas';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.message || 'Erro ao salvar empresa');
        return;
      }
      setShowModal(false);
      setEditId(null);
      setForm({ nome: '', cnpj: '', email: '', telefone: '' });
      fetchEmpresas();
    } catch {
      setErro('Erro de conexão');
    }
  };

  const handleDelete = async (id, slug) => {
    if (slug === 'default') {
      alert('Não é possível deletar a empresa padrão');
      return;
    }
    if (!confirm('Deseja realmente deletar esta empresa?')) return;
    const res = await fetch(`/api/empresas/${id}`, { method: 'DELETE', headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || 'Erro ao deletar');
      return;
    }
    fetchEmpresas();
  };

  const openNova = () => {
    setEditId(null);
    setForm({ nome: '', cnpj: '', email: '', telefone: '' });
    setErro(null);
    setShowModal(true);
  };

  return (
    <SuperAdminLayout
      title="Gerenciar empresas"
      subtitle="Cadastro e manutenção de tenants da plataforma."
      actions={
        <button type="button" className="rn-btn rn-btn--primary rn-btn--sm" onClick={openNova}>
          <Plus size={14} />
          Nova empresa
        </button>
      }
    >
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
                <th>Contato</th>
                <th style={{ textAlign: 'center' }}>Stats</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((e) => (
                <tr key={e.id}>
                  <td>
                    <p style={{ fontWeight: 600, margin: 0 }}>{e.nome}</p>
                    <p className="rn-muted" style={{ fontSize: 11, margin: '2px 0 0' }}>
                      /{e.slug}
                      {e.cnpj ? ` · ${e.cnpj}` : ''}
                    </p>
                  </td>
                  <td>
                    <p style={{ fontSize: 12, margin: 0 }}>{e.email}</p>
                    {e.telefone && (
                      <p className="rn-muted" style={{ fontSize: 11, margin: '2px 0 0' }}>
                        {e.telefone}
                      </p>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <span className="rn-pill rn-pill--info">{e.total_mikrotiks || 0} MKT</span>
                      <span className="rn-pill rn-pill--success">{e.total_planos || 0} planos</span>
                      <span className="rn-pill rn-pill--warning">{e.total_admins || 0} admins</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Link to={`/admin/${e.slug}`} className="rn-btn rn-btn--secondary rn-btn--sm">
                        Acessar
                      </Link>
                      <button
                        type="button"
                        className="rn-btn rn-btn--secondary rn-btn--sm"
                        onClick={() => {
                          setEditId(e.id);
                          setForm({
                            nome: e.nome,
                            cnpj: e.cnpj || '',
                            email: e.email,
                            telefone: e.telefone || '',
                          });
                          setErro(null);
                          setShowModal(true);
                        }}
                      >
                        Editar
                      </button>
                      {e.slug !== 'default' && (
                        <button
                          type="button"
                          className="rn-btn rn-btn--danger rn-btn--sm"
                          onClick={() => handleDelete(e.id, e.slug)}
                        >
                          Deletar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Editar empresa' : 'Nova empresa'}
      >
        <form onSubmit={handleSubmit}>
          {erro && <div className="rn-alert rn-alert--danger" style={{ marginBottom: 12 }}>{erro}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="rn-field">
              <label className="rn-label">Nome</label>
              <input
                type="text"
                required
                className="rn-input"
                value={form.nome}
                onChange={(ev) => setForm({ ...form, nome: ev.target.value })}
              />
            </div>
            <div className="rn-field">
              <label className="rn-label">Email</label>
              <input
                type="email"
                required
                className="rn-input"
                value={form.email}
                onChange={(ev) => setForm({ ...form, email: ev.target.value })}
              />
            </div>
            <div className="rn-field">
              <label className="rn-label">CNPJ</label>
              <input
                type="text"
                className="rn-input"
                value={form.cnpj}
                onChange={(ev) => setForm({ ...form, cnpj: ev.target.value })}
              />
            </div>
            <div className="rn-field">
              <label className="rn-label">Telefone</label>
              <input
                type="text"
                className="rn-input"
                value={form.telefone}
                onChange={(ev) => setForm({ ...form, telefone: ev.target.value })}
              />
            </div>
          </div>
          <div className="rn-form-actions">
            <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="rn-btn rn-btn--primary">
              {editId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </AdminModal>
    </SuperAdminLayout>
  );
}
