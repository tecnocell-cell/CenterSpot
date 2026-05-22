const SECTION_TABS = {
  configuracoes: {
    geral: 'Geral',
    aparencia: 'Aparência',
    usuarios: 'Usuários',
    permissoes: 'Permissões',
    limpeza: 'Limpeza avançada',
    mercado: 'Mercado Pago',
  },
  mikrotik: {
    geral: 'Geral',
    mikrotiks: 'Cadastro',
    vpn: 'VPN WireGuard',
  },
  clientes: {
    geral: 'Geral',
    lgpd: 'Cadastro LGPD',
    leads: 'Leads',
  },
  radius: {
    geral: 'Geral',
    usuarios: 'Usuários',
    sessoes: 'Sessões ativas',
    log: 'Log Radius',
    compliance: 'Marco Civil',
  },
};

const SECTION_ROOT = {
  configuracoes: 'Configurações',
  mikrotik: 'Mikrotik',
  clientes: 'Clientes',
  radius: 'Radius',
};

const PATH_TITLES = [
  { match: (p) => p.endsWith('/empresas'), title: 'Empresas' },
  { match: (p) => p.includes('/portais/') && p.includes('/editor'), title: 'Editor visual' },
  { match: (p) => p.endsWith('/portais'), title: 'Portais Captive' },
  { match: (p) => p.includes('/campanhas/'), title: 'Editor de campanha' },
  { match: (p) => p.endsWith('/campanhas'), title: 'Campanhas' },
  { match: (p) => p.endsWith('/planos'), title: 'Planos' },
  { match: (p) => p.endsWith('/pagamentos'), title: 'Pagamentos' },
  { match: (p) => p.endsWith('/whatsapp'), title: 'WhatsApp' },
  { match: (p) => p.endsWith('/configuracoes'), section: 'configuracoes' },
  { match: (p) => p.endsWith('/mikrotik') || p.endsWith('/mikrotiks') || p.endsWith('/vpn'), section: 'mikrotik' },
  { match: (p) => p.endsWith('/clientes') || p.endsWith('/lgpd') || p.endsWith('/leads'), section: 'clientes' },
  {
    match: (p) =>
      p.endsWith('/radius') ||
      p.endsWith('/sessoes') ||
      p.endsWith('/sessoeslog') ||
      p.endsWith('/compliance'),
    section: 'radius',
  },
];

export function resolveAdminPageTitle(pathname, search, basePath) {
  if (pathname === '/super' || pathname.startsWith('/super/')) return 'Super Admin';
  if (pathname === basePath || pathname === `${basePath}/`) return 'Dashboard';

  for (const rule of PATH_TITLES) {
    if (!rule.match(pathname)) continue;
    if (rule.title) return rule.title;
    if (rule.section) {
      const tab = new URLSearchParams(search).get('tab') || 'geral';
      const tabLabel = SECTION_TABS[rule.section]?.[tab];
      const root = SECTION_ROOT[rule.section];
      if (tab && tab !== 'geral' && tabLabel) return `${root} · ${tabLabel}`;
      return root;
    }
  }

  return 'CenterSpot';
}
