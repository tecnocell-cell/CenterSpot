import { Navigate, useParams } from "react-router-dom";

/** Redireciona para Configurações → aba Usuários */
export default function Usuarios() {
  const { empresaSlug } = useParams();
  return <Navigate to={`/admin/${empresaSlug}/configuracoes?tab=usuarios`} replace />;
}
