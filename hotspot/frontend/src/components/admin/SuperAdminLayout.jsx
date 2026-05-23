import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from './AdminLayout';
import AdminPageHeader from './AdminPageHeader';

const SUPER_NAV = [
  { to: '/super', label: 'Visão geral', end: true },
  { to: '/super/empresas', label: 'Empresas' },
  { to: '/super/atualizar', label: 'Atualizar sistema' },
  { to: '/super/backups', label: 'Backups' },
  { to: '/super/system', label: 'Diagnóstico' },
  { to: '/super/publicar-atualizacao', label: 'Publicar atualização' },
];

export function SuperAdminNav() {
  const { pathname } = useLocation();

  return (
    <nav className="rn-tabs rn-super-tabs" aria-label="Navegação super admin">
      {SUPER_NAV.map((item) => {
        const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link key={item.to} to={item.to} className={`rn-tab ${active ? 'active' : ''}`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function SuperAdminLayout({ title, subtitle, actions, children, maxWidth }) {
  const { isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate(`/admin/${user?.empresa_slug || 'default'}`, { replace: true });
    }
  }, [isSuperAdmin, user?.empresa_slug, navigate]);

  if (!isSuperAdmin) return null;

  return (
    <AdminLayout>
      <div className="rn-page-stack" style={maxWidth ? { maxWidth } : undefined}>
        <SuperAdminNav />
        {(title || actions) && (
          <AdminPageHeader title={title} subtitle={subtitle}>
            {actions}
          </AdminPageHeader>
        )}
        {children}
      </div>
    </AdminLayout>
  );
}
