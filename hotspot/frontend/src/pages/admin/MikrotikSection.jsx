import React, { useMemo } from 'react';
import { Server, Shield } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import SectionGeralPanel from '../../components/admin/SectionGeralPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useSectionTabs } from '../../hooks/useSectionTabs';
import { MikrotiksPanel } from './Mikrotiks';
import { WireguardPanel } from './Wireguard';

const ALL_TABS = [
  { id: 'geral', label: 'Geral' },
  { id: 'mikrotiks', label: 'Cadastro', perm: 'mikrotiks' },
  { id: 'vpn', label: 'VPN WireGuard', perm: 'vpn' },
];

export default function MikrotikSection() {
  const { isSuperAdmin, hasPermission } = useAuth();
  const { tabs, aba, setAba } = useSectionTabs(ALL_TABS, { isSuperAdmin, hasPermission });

  const secoesGeral = useMemo(() => {
    const list = [];
    if (isSuperAdmin || hasPermission('mikrotiks', 'ver')) {
      list.push({
        id: 'mikrotiks',
        icon: Server,
        title: 'Cadastro Mikrotik',
        desc: 'Equipamentos, hotspot, login e status dos roteadores.',
      });
    }
    if (isSuperAdmin || hasPermission('vpn', 'ver')) {
      list.push({
        id: 'vpn',
        icon: Shield,
        title: 'VPN WireGuard',
        desc: 'Peers, scripts e configuração da VPN com o servidor.',
      });
    }
    return list;
  }, [isSuperAdmin, hasPermission]);

  return (
    <AdminLayout>
      <div className="rn-page-stack">
        <AdminPageHeader
          title="Mikrotik"
          subtitle="Cadastro de equipamentos e túnel VPN WireGuard."
        />

        <div className="rn-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rn-tab ${aba === t.id ? 'active' : ''}`}
              onClick={() => setAba(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {aba === 'geral' && (
          <SectionGeralPanel
            intro="Gerencie roteadores Mikrotik e a VPN que conecta cada equipamento ao servidor RADIUS."
            sections={secoesGeral}
            onIrPara={setAba}
          />
        )}
        {aba === 'mikrotiks' && <MikrotiksPanel embedded />}
        {aba === 'vpn' && <WireguardPanel embedded />}
      </div>
    </AdminLayout>
  );
}
