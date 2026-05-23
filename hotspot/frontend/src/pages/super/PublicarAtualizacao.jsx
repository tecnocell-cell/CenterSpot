import SuperAdminLayout from '../../components/admin/SuperAdminLayout';

export default function PublicarAtualizacao() {
  return (
    <SuperAdminLayout
      title="Publicar atualização"
      subtitle="Envio de pacotes de atualização para os servidores dos clientes."
      maxWidth="42rem"
    >
      <div className="rn-card" style={{ padding: '2rem 1.75rem', textAlign: 'center' }}>
        <p style={{ fontWeight: 600, margin: '0 0 0.5rem' }}>Em breve</p>
        <p className="rn-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
          Esta área será usada para publicar novas versões do sistema. Por enquanto, use o fluxo de
          atualização em &quot;Atualizar sistema&quot; no painel do cliente.
        </p>
      </div>
    </SuperAdminLayout>
  );
}
