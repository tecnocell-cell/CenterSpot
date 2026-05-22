import React, { useMemo } from 'react';
import { Shield, Users } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import SectionGeralPanel from '../../components/admin/SectionGeralPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useSectionTabs } from '../../hooks/useSectionTabs';
import { LgpdCadastrosPanel } from './LgpdCadastros';
import { LeadsPanel } from './Leads';

const ALL_TABS = [
  { id: 'geral', label: 'Geral' },
  { id: 'lgpd', label: 'Cadastro LGPD', perm: 'clientes' },
  { id: 'leads', label: 'Leads', perm: 'leads' },
];

export default function ClientesSection() {
  const { isSuperAdmin, hasPermission } = useAuth();
  const { tabs, aba, setAba } = useSectionTabs(ALL_TABS, { isSuperAdmin, hasPermission });

  const secoesGeral = useMemo(() => {
    const list = [];
    if (isSuperAdmin || hasPermission('clientes', 'ver')) {
      list.push({
        id: 'lgpd',
        icon: Shield,
        title: 'Cadastro LGPD',
        desc: 'Consentimentos e registros de dados dos usuários do hotspot.',
      });
    }
    if (isSuperAdmin || hasPermission('leads', 'ver')) {
      list.push({
        id: 'leads',
        icon: Users,
        title: 'Leads',
        desc: 'Contatos capturados nos portais e funil de conversão.',
      });
    }
    return list;
  }, [isSuperAdmin, hasPermission]);

  return (
    <AdminLayout>
      <div className="rn-page-stack">
        <AdminPageHeader
          title="Clientes"
          subtitle="Cadastros LGPD e gestão de leads da empresa."
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
            intro="Centralize dados de clientes: conformidade LGPD e leads comerciais."
            sections={secoesGeral}
            onIrPara={setAba}
          />
        )}
        {aba === 'lgpd' && <LgpdCadastrosPanel embedded />}
        {aba === 'leads' && <LeadsPanel embedded />}
      </div>
    </AdminLayout>
  );
}
