import React from 'react';

export default function AdminModal({ open, onClose, title, children, large = false, className = '' }) {
  if (!open) return null;

  const modalClassName = ['rn-modal', large && 'rn-modal--lg', className].filter(Boolean).join(' ');

  return (
    <div
      className="rn-modal-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className={modalClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rn-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rn-modal__header">
          <h2 id="rn-modal-title" className="rn-modal__title">
            {title}
          </h2>
          <button type="button" className="rn-btn rn-btn--ghost rn-btn--sm" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="rn-modal__body">{children}</div>
      </div>
    </div>
  );
}
