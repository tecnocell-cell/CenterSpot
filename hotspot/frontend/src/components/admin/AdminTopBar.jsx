import React, { useMemo } from 'react';
import { LogOut, Menu } from 'lucide-react';

function formatDate() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function AdminTopBar({
  pageTitle,
  user,
  empresas,
  switchingEmpresa,
  onSwitchEmpresa,
  onLogout,
  onOpenMenu,
}) {
  const userInitial = (user?.nome || user?.email || 'A').charAt(0).toUpperCase();
  const displayName = user?.nome || user?.email || 'Usuário';

  const empresaLabel = useMemo(() => {
    if (empresas.length > 1) return null;
    return user?.empresa_nome || 'Empresa';
  }, [empresas.length, user?.empresa_nome]);

  return (
    <header className="rn-admin-header">
      <div className="rn-admin-header__left">
        <button
          type="button"
          className="rn-admin-header__menu-btn"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
        <h1 className="rn-admin-header__title">{pageTitle}</h1>
      </div>

      <div className="rn-admin-header__right">
        <span className="rn-admin-header__date">{formatDate()}</span>

        <div className="rn-admin-header__user">
          <div className="rn-admin-header__avatar">{userInitial}</div>
          <div className="rn-admin-header__user-text">
            <span className="rn-admin-header__user-name">{displayName}</span>
            {empresas.length > 1 ? (
              <select
                className="rn-admin-header__empresa-select"
                value={user?.empresa_id || ''}
                disabled={switchingEmpresa}
                onChange={(e) => onSwitchEmpresa(parseInt(e.target.value, 10))}
                aria-label="Trocar empresa"
              >
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nome}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rn-admin-header__empresa">{empresaLabel}</span>
            )}
          </div>
          {user?.role && <span className="rn-admin-header__role">{user.role}</span>}
        </div>

        <button
          type="button"
          className="rn-admin-header__logout"
          onClick={onLogout}
          title="Sair"
          aria-label="Sair"
        >
          <LogOut size={18} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
