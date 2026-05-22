import React from 'react';
import AdminLayout from './AdminLayout';

/** Envolve conteúdo com layout admin ou só o painel (modo aba). */
export default function PageShell({ embedded, children }) {
  if (embedded) {
    return <div className="rn-settings-panel">{children}</div>;
  }
  return (
    <AdminLayout>
      <div className="rn-page-stack">{children}</div>
    </AdminLayout>
  );
}
