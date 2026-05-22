import React, { useMemo } from 'react';
import { Users, Activity, FileText, Scale } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import SectionGeralPanel from '../../components/admin/SectionGeralPanel';
import { useAuth } from '../../contexts/AuthContext';
import { useSectionTabs } from '../../hooks/useSectionTabs';
import { UsuariosRadiusPanel } from './UsuariosRadius';
import { SessoesPanel } from './Sessoes';
import { SessoesLogPanel } from './SessoesLog';
import { CompliancePanel } from './Compliance';

const ALL_TABS = [
  { id: 'geral', label: 'Geral' },
  { id: 'usuarios', label: 'Usuários', perm: 'radius' },
  { id: 'sessoes', label: 'Sessões ativas', perm: 'sessoes' },
  { id: 'log', label: 'Log Radius', perm: 'sessoeslog' },
  { id: 'compliance', label: 'Marco Civil', perm: 'compliance' },
];

export default function RadiusSection() {
  const { isSuperAdmin, hasPermission } = useAuth();
  const { tabs, aba, setAba } = useSectionTabs(ALL_TABS, { isSuperAdmin, hasPermission });

  const secoesGeral = useMemo(() => {
    const list = [];
    if (isSuperAdmin || hasPermission('radius', 'ver')) {
      list.push({
        id: 'usuarios',
        icon: Users,
        title: 'Usuários RADIUS',
        desc: 'Contas de acesso WiFi vinculadas aos planos.',
      });
    }
    if (isSuperAdmin || hasPermission('sessoes', 'ver')) {
      list.push({
        id: 'sessoes',
        icon: Activity,
        title: 'Sessões ativas',
        desc: 'Conexões em tempo real nos Mikrotiks.',
      });
    }
    if (isSuperAdmin || hasPermission('sessoeslog', 'ver')) {
      list.push({
        id: 'log',
        icon: FileText,
        title: 'Log Radius',
        desc: 'Histórico de autenticações e eventos.',
      });
    }
    if (isSuperAdmin || hasPermission('compliance', 'ver')) {
      list.push({
        id: 'compliance',
        icon: Scale,
        title: 'Marco Civil',
        desc: 'Relatórios e registros de compliance.',
      });
    }
    return list;
  }, [isSuperAdmin, hasPermission]);

  return (
    <AdminLayout>
      <div className="rn-page-stack">
        <AdminPageHeader
          title="Radius"
          subtitle="Usuários, sessões, logs e Marco Civil."
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
            intro="Autenticação RADIUS: usuários, monitoramento de sessões e obrigações legais."
            sections={secoesGeral}
            onIrPara={setAba}
          />
        )}
        {aba === 'usuarios' && <UsuariosRadiusPanel embedded />}
        {aba === 'sessoes' && <SessoesPanel embedded />}
        {aba === 'log' && <SessoesLogPanel embedded />}
        {aba === 'compliance' && <CompliancePanel embedded />}
      </div>
    </AdminLayout>
  );
}
