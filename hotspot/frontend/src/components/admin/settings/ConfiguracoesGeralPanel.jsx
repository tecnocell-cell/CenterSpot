import React from 'react';
import { Palette, Users, Shield, Trash2, CreditCard } from 'lucide-react';

const SECOES = [
  {
    id: 'aparencia',
    icon: Palette,
    title: 'Aparência',
    desc: 'Cores do painel, temas rápidos e pré-visualização no padrão CenterOS.',
  },
  {
    id: 'usuarios',
    icon: Users,
    title: 'Usuários',
    desc: 'Administradores com acesso ao painel desta empresa.',
  },
  {
    id: 'permissoes',
    icon: Shield,
    title: 'Permissões',
    desc: 'Grupos de permissão e vínculo de admins aos papéis.',
    superOnly: true,
  },
  {
    id: 'limpeza',
    icon: Trash2,
    title: 'Limpeza avançada',
    desc: 'Ações irreversíveis de limpeza de dados (RADIUS, pagamentos, LGPD).',
  },
  {
    id: 'mercado',
    icon: CreditCard,
    title: 'Mercado Pago',
    desc: 'Credenciais e teste de conexão com o Mercado Pago.',
  },
];

export default function ConfiguracoesGeralPanel({ onIrPara, isSuperAdmin, canUsuarios, canPermissoes, canConfig }) {
  const visiveis = SECOES.filter((s) => {
    if (s.id === 'permissoes') return isSuperAdmin && canPermissoes;
    if (s.id === 'usuarios') return canUsuarios;
    if (s.id === 'aparencia' || s.id === 'limpeza' || s.id === 'mercado') return canConfig;
    return true;
  });

  return (
    <div className="rn-config-geral">
      <div className="rn-card" style={{ padding: '1.25rem 1.5rem' }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--muted-foreground)' }}>
          Centralize aqui as opções da empresa: visual do painel, usuários, permissões, integrações e
          ferramentas avançadas. Use as abas acima ou os atalhos abaixo.
        </p>
      </div>

      <div className="rn-config-geral__grid">
        {visiveis.map((s) => {
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
