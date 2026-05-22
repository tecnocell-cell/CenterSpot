import React from 'react';

export default function SectionGeralPanel({ intro, sections, onIrPara }) {
  return (
    <div className="rn-config-geral">
      <div className="rn-card" style={{ padding: '1.25rem 1.5rem' }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--muted-foreground)' }}>
          {intro}
        </p>
      </div>
      <div className="rn-config-geral__grid">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              className="rn-config-geral__card"
              onClick={() => onIrPara(s.id)}
            >
              <span className="rn-config-geral__icon">
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <span className="rn-config-geral__title">{s.title}</span>
              <span className="rn-config-geral__desc">{s.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
