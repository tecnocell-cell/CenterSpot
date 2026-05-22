import { Navigate, useParams } from "react-router-dom";

/** Redireciona para Configurações → aba Permissões */
export default function GruposPermissao() {
  const { empresaSlug } = useParams();
  return <Navigate to={`/admin/${empresaSlug}/configuracoes?tab=permissoes`} replace />;
}
