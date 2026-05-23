import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import AdminModal from '../AdminModal';

async function parseApiError(res, fallback) {
  try {
    const data = await res.json();
    return data.message || data.error || fallback;
  } catch {
    return fallback;
  }
}

export default function ConfiguracoesUsuariosPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ email: '', senha: '' });
  const [editando, setEditando] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [erro, setErro] = useState(null);
  const token = localStorage.getItem('admin_token');

  const carregarUsuarios = async () => {
    try {
      const res = await fetch('/api/admins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const msg = await parseApiError(res, 'Erro ao carregar administradores');
        console.error(msg);
        return;
      }
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar admins:', err);
    }
  };

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    try {
      const url = editando ? `/api/admins/${editando}` : '/api/admins';
      const method = editando ? 'PUT' : 'POST';
      const payload = { email: form.email };
      if (!editando || form.senha) payload.senha = form.senha;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await parseApiError(res, 'Erro ao salvar usuário');
        setErro(msg);
        return;
      }

      setShowModal(false);
      setEditando(null);
      setForm({ email: '', senha: '' });
      carregarUsuarios();
    } catch {
      setErro('Erro de conexão com o servidor');
    }
  };

  const handleEditar = (admin) => {
    setEditando(admin.id);
    setForm({ email: admin.email, senha: '' });
    setErro(null);
    setShowModal(true);
  };

  const handleRemover = async (id) => {
    if (!confirm('Deseja remover este administrador?')) return;
    try {
      const res = await fetch(`/api/admins/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const msg = await parseApiError(res, 'Erro ao remover usuário');
        alert(msg);
        return;
      }
      carregarUsuarios();
    } catch {
      alert('Erro de conexão com o servidor');
    }
  };

  const openNovo = () => {
    setEditando(null);
    setForm({ email: '', senha: '' });
    setErro(null);
    setShowModal(true);
  };

  return (
    <div className="rn-settings-panel">
      <div className="rn-settings-toolbar">
        <p className="rn-muted" style={{ margin: 0, fontSize: 12 }}>
          {usuarios.length} administrador(es) cadastrado(s)
        </p>
        <button type="button" className="rn-btn rn-btn--primary rn-btn--sm" onClick={openNovo}>
          <Plus size={14} />
          Novo admin
        </button>
      </div>

      <div className="rn-card rn-table-wrap">
        <table className="rn-table">
          <thead>
            <tr>
              <th style={{ width: 64 }}>ID</th>
              <th>Email</th>
              <th>Criado</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((a) => (
              <tr key={a.id}>
                <td className="rn-muted">{a.id}</td>
                <td>
                  <p style={{ fontWeight: 600, margin: 0 }}>{a.email}</p>
                </td>
                <td className="rn-muted">{new Date(a.created_at).toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="rn-btn rn-btn--secondary rn-btn--sm"
                      onClick={() => handleEditar(a)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="rn-btn rn-btn--danger rn-btn--sm"
                      onClick={() => handleRemover(a.id)}
                    >
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={4} className="rn-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                  Nenhum administrador cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editando ? 'Editar admin' : 'Criar admin'}
      >
        <form onSubmit={handleSubmit}>
          {erro && <div className="rn-alert rn-alert--danger" style={{ marginBottom: 12 }}>{erro}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="rn-field">
              <label className="rn-label">Email</label>
              <input
                type="email"
                required
                className="rn-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="rn-field">
              <label className="rn-label">
                Senha
                {editando && (
                  <span className="rn-muted" style={{ fontWeight: 400, marginLeft: 6 }}>
                    (deixe em branco para manter)
                  </span>
                )}
              </label>
              <input
                type="password"
                className="rn-input"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                required={!editando}
              />
            </div>
          </div>
          <div className="rn-form-actions">
            <button type="button" className="rn-btn rn-btn--secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="rn-btn rn-btn--primary">
              Salvar
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
