import React from 'react';

export default function AdminPageHeader({ title, subtitle, children }) {
  return (
    <header className="rn-page-header">
      <div>
        <h1 className="rn-page-title">{title}</h1>
        {subtitle && <p className="rn-page-sub">{subtitle}</p>}
      </div>
      {children && <div className="rn-page-header__actions">{children}</div>}
    </header>
  );
}
