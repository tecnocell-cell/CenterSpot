# Checklist de testes funcionais — CenterSpot

Documento operacional para homologação manual da plataforma CenterSpot (Hotspot-WhatsApp).  
Baseado no código atual do repositório. **Não cobre Fase 3 Mercado Pago Split** (pausada).

| Campo | Valor |
|-------|-------|
| Versão do documento | 1.0 |
| Escopo | 20 fluxos principais do painel e integrações |
| Público | QA, suporte, implantação |

---

## Ambiente de teste

Preencha antes de iniciar a bateria de testes.

| Item | Valor |
|------|-------|
| Data do ciclo | |
| Responsável | |
| URL base (frontend) | |
| URL base (API) | |
| Versão / branch Git | |
| Banco MySQL (host / schema) | |
| Super admin de teste (email) | |
| Empresa tenant de teste (nome / slug) | |

### Serviços e dependências

| Serviço | Necessário para | Status |
|---------|-----------------|--------|
| MySQL + migrations (incl. **016** `audit_logs`) | Todos | [ ] Online |
| Backend Node (`server.js` / PM2) | Todos | [ ] Online |
| Frontend (build ou Vite dev) | Todos | [ ] Online |
| FreeRADIUS | Itens 12–13 | [ ] Online / [ ] N/A |
| MikroTik (API RouterOS) | Itens 6–7, 13–14 | [ ] Online / [ ] N/A |
| Mercado Pago **TEST** | Item 14 | [ ] Configurado / [ ] N/A |
| Evolution API (WhatsApp) | Item 15 | [ ] Online / [ ] N/A |
| API WireGuard | Item 16 | [ ] Online / [ ] N/A |
| Webhook MP acessível (`/api/pagamentos/notificacao`) | Item 14 | [ ] OK / [ ] N/A |

### Observações gerais

- Login exige **captcha** (soma aritmética) no cliente antes de chamar a API.
- Após login, super admin vai para `/admin/{slug}`; painel global: **`/super`**.
- Auditoria (**item 20**) não possui tela no frontend — validar via MySQL.
- Lista de pagamentos no admin: `/admin/{slug}/pagamentos` (URL direta; fora do menu lateral).

### Mapa de rotas públicas (captive)

| Fluxo | URL |
|-------|-----|
| Entrada captive | `GET /hotspot/redirect/:mikrotikId` |
| Login hotspot (API) | `GET /api/hotspot-login/:mikrotikId` |
| Status hotspot | `GET /api/hotspot-status/:mikrotikId` |
| Planos | `/planos-cliente` + `GET /api/planos-publicos` |
| Pagamento | `/pagamento/:id` |
| Campanha | `/campanha/:portalId` |
| LGPD | `/cadastro`, `/lgpd` |

---

## Registro do ciclo

| Métrica | Valor |
|---------|-------|
| Testes executados | / 20 |
| Aprovados | |
| Reprovados | |
| Bloqueados | |
| Não aplicáveis (N/A) | |

---

## Ordem de execução recomendada

`1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → (14–16 integrações) → 17 → 18 → 19 → 20`

---

## 1. Login super admin

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/` — Login |
| **API** | `POST /api/auth/login` (legado: `POST /api/admin/login`) |
| **MySQL** | `admins`, `admin_empresas`, `empresas` |

**Pré-requisitos:** usuário com `role = super_admin` ativo e senha conhecida.

**Passos:**

1. Abrir `/`.
2. Resolver o captcha (soma).
3. Informar email e senha do super admin.
4. Clicar em entrar.

**Resultado esperado:** HTTP 200; JWT em `admin_token`; `user.role === 'super_admin'`; lista de empresas; permissões totais nos módulos.

**Como validar:** DevTools → Application → `admin_token`; redirecionamento para `/admin/{slug}`; item **Empresas** no menu (somente super).

**Erros comuns:** captcha incorreto; 401 email/senha; 403 conta desativada ou sem vínculo com empresa ativa; rate limit em `/api/auth/login`.

### Evidências

| Tipo | Referência |
|------|------------|
| Print da tela | |
| Request/response (status) | |
| Observações | |

---

## 2. Criar nova empresa (tenant)

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/super/empresas` |
| **API** | `GET /api/empresas`, `POST /api/empresas`, `PUT /api/empresas/:id`, `DELETE /api/empresas/:id` |
| **MySQL** | `empresas` (+ `audit_logs` se migration 016) |

**Pré-requisitos:** login como super admin (item 1).

**Passos:**

1. Acessar `/super` → **Gerenciar empresas** ou `/super/empresas`.
2. Clicar em **Nova empresa**.
3. Preencher nome, CNPJ, email, telefone.
4. Salvar.

**Resultado esperado:** empresa criada com `slug` único, `ativo = 1`, visível na listagem.

**Como validar:** `SELECT * FROM empresas WHERE slug = '...'`; linha na UI; opcional: `audit_logs` com create em `entidade = empresa`.

**Erros comuns:** 403 sem super_admin; slug duplicado; impossível excluir empresa `default`.

### Evidências

| Tipo | Referência |
|------|------------|
| ID da empresa criada | |
| Slug | |
| Print / SQL | |

---

## 3. Acessar empresa

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/super` (botão **Acessar**) ou seletor de empresa no header em `/admin/:slug/*` |
| **API** | `POST /api/auth/switch-empresa` — `{ empresa_id }`; aux.: `GET /api/auth/me/empresas`, `GET /api/empresas/by-slug/:slug` |
| **MySQL** | `empresas`, `admin_empresas` |

**Pré-requisitos:** empresa criada (item 2); super logado.

**Passos:**

1. Em `/super`, clicar **Acessar** na linha da tenant **ou**
2. No header do painel admin, selecionar outra empresa no `<select>`.

**Resultado esperado:** novo JWT com `empresa_id`, `empresa_slug`, `empresa_nome` corretos; URL `/admin/{slug}/`.

**Como validar:** payload do JWT; chamadas `/api/*` filtram pela tenant ativa; dashboard reflete dados da empresa.

**Erros comuns:** 403 operador sem vínculo; super acessa qualquer `empresa_id`.

### Evidências

| Tipo | Referência |
|------|------------|
| `empresa_slug` após switch | |
| Print do header / URL | |

---

## 4. Criar usuário admin / operator da empresa

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/admin/:empresaSlug/configuracoes?tab=usuarios` (alt.: `/admin/:empresaSlug/usuarios`) |
| **API** | `GET/POST /api/admins`, `PUT/DELETE /api/admins/:id` |
| **MySQL** | `admins`, `admin_empresas` |

**Pré-requisitos:** tenant ativa no contexto; permissão módulo `usuarios` (super tem tudo).

**Passos:**

1. Configurações → aba **Usuários**.
2. Criar usuário: email, nome, senha, papel (`operator`, `manager`, `owner`).
3. Salvar.
4. (Opcional) logout e login com o novo usuário.

**Resultado esperado:** registro em `admins` + vínculo em `admin_empresas`.

**Como validar:** login do novo usuário abre painel da mesma tenant; `audit_logs` create `entidade = admin`.

**Erros comuns:** email duplicado (400); criar `super_admin` sem ser super; 403 sem permissão.

### Evidências

| Tipo | Referência |
|------|------------|
| Email do usuário criado | |
| Role | |
| Print / SQL | |

---

## 5. Configurar permissões

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/admin/:empresaSlug/configuracoes?tab=permissoes` (**somente super_admin**) |
| **API** | `GET/POST /api/grupos-permissao`, `PUT/DELETE /api/grupos-permissao/:id`, `GET /api/grupos-permissao/modulos`, `POST .../vincular-admin`, `GET .../admin/:adminId/permissoes` |
| **MySQL** | `grupos_permissao`, `grupo_permissoes`, `admin_grupos` |

**Pré-requisitos:** super admin; usuário operator criado (item 4).

**Módulos válidos:** `dashboard`, `mikrotiks`, `vpn`, `portais`, `planos`, `clientes`, `leads`, `radius`, `pagamentos`, `sessoes`, `sessoeslog`, `compliance`, `configuracoes`, `usuarios`.

**Passos:**

1. Criar grupo de permissão.
2. Marcar módulos desejados (ver / criar / editar / excluir).
3. Vincular o operator ao grupo.
4. Login como operator e verificar menus e APIs.

**Resultado esperado:** operator vê apenas módulos com `ver: true`; backend retorna 403 sem permissão.

**Como validar:** itens do menu lateral; tentativa de `POST /api/mikrotiks` sem permissão → 403.

**Erros comuns:** aba Permissões invisível para owner/operator; API de grupos exige `super_admin` ou `owner`.

### Evidências

| Tipo | Referência |
|------|------------|
| Nome do grupo | |
| Módulos testados | |
| Print menu operator vs super | |

---

## 6. Criar MikroTik

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/admin/:empresaSlug/mikrotik` → aba **Cadastro** |
| **API** | `POST/GET/PUT/DELETE /api/mikrotiks` |
| **MySQL** | `mikrotiks`, `nas` |

**Pré-requisitos:** permissão `mikrotiks`; IP único; opcional: portal já criado.

**Passos:**

1. Preencher nome, IP, usuário API, senha, porta, `end_hotspot`, portal vinculado.
2. Salvar.

**Resultado esperado:** registro em `mikrotiks` com `empresa_id`; NAS em `nas` com mesmo IP; FreeRADIUS reiniciado no servidor.

**Como validar:** `SELECT * FROM mikrotiks WHERE empresa_id = ?`; `SELECT * FROM nas WHERE nasname = ?`.

**Erros comuns:** IP duplicado (400); 500 MySQL/RADIUS; 403 sem permissão.

### Evidências

| Tipo | Referência |
|------|------------|
| ID do MikroTik | |
| IP | |
| Print / SQL | |

---

## 7. Testar conexão RouterOS

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/admin/:empresaSlug/mikrotik` → **Testar conexão** |
| **API** | `POST /api/mikrotiks/:id/testar` |
| **MySQL** | leitura em `mikrotiks` |

**Pré-requisitos:** MikroTik cadastrado (item 6); API RouterOS habilitada; rede/VPN até o equipamento.

**Passos:** clicar em testar conexão no equipamento salvo.

**Resultado esperado:** resposta 200 com dados da identidade RouterOS.

**Como validar:** mensagem de sucesso na UI; aba Network no DevTools.

**Erros comuns:** timeout/firewall; credenciais API erradas; porta fechada; 500 interno.

**Extras (provisionamento):** `POST /api/mikrotiks/:id/info`, `/:id/enviar-hotspot`, `/:id/enviar-login`, `/:id/enviar-status`.

### Evidências

| Tipo | Referência |
|------|------------|
| Resposta JSON (trecho) | |
| Versão RouterOS | |

---

## 8. Criar plano

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/admin/:empresaSlug/planos` |
| **API** | `GET/POST /api/planos`, `PUT/DELETE /api/planos/:id`, `POST /api/planos/:id/enviar` |
| **MySQL** | `planos` |

**Pré-requisitos:** permissão `planos`; MikroTik se usar **Enviar ao MikroTik**.

**Passos:** criar plano (nome, velocidades, duração, preço, `shared_users`, mikrotik) e salvar.

**Resultado esperado:** plano listado na tenant; auditoria opcional em `audit_logs`.

**Como validar:** `SELECT * FROM planos WHERE empresa_id = ?`; plano aparece em portal tipo `planos`.

**Erros comuns:** 403; falha ao enviar ao MikroTik se API inacessível.

### Evidências

| Tipo | Referência |
|------|------------|
| ID do plano | |
| Nome / preço | |

---

## 9. Criar portal hotspot

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/admin/:empresaSlug/portais` → editor `/portais/:portalId/editor` |
| **API** | `GET/POST/PUT/DELETE /api/portais`, `GET .../preview`, `POST .../logo`, `PUT .../campanha` |
| **MySQL** | `portais`, `portal_templates` |

**Pré-requisitos:** permissão `portais`; planos se tipo `planos`; MikroTik com `portal_id`.

**Tipos de portal:** `lgpd`, `planos`, `lead`, `lead_passivo`, `custom`.

**Passos:**

1. Criar portal (tipo, slug, `url_redirect`, conteúdo).
2. Vincular planos/campanha conforme o tipo.
3. Associar portal no cadastro do MikroTik.
4. Testar `GET /hotspot/redirect/:mikrotikId?mac=...&ip=...`.

**Resultado esperado:** redirect captive correto para URL interna ou externa.

**Como validar:** `SELECT * FROM portais WHERE id = ?`; browser no fluxo captive.

**Erros comuns:** portal sem redirect; MikroTik sem `portal_id`; 400 “Portal sem configuração de redirect”.

### Evidências

| Tipo | Referência |
|------|------------|
| ID / slug do portal | |
| URL de redirect testada | |

---

## 10. Configurar LGPD

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela admin** | Editor portal tipo **LGPD**; listagem `/admin/:slug/clientes` → **Cadastro LGPD** |
| **Telas públicas** | `/cadastro`, `/lgpd` + redirect captive |
| **API** | Admin: `GET /api/lgpd`; público: `POST /api/lgpd/cadastro`, `POST /api/lgpd/login` |
| **MySQL** | `leads`, `lgpd_logins_backup`, `portais` |

**Pré-requisitos:** portal `tipo = lgpd`; MikroTik apontando para esse portal.

**Passos:**

1. Configurar textos/campos no editor LGPD.
2. Testar cadastro no captive (celular/Wi‑Fi).
3. Conferir listagem em Clientes → LGPD.

**Resultado esperado:** consentimento/cadastro gravado; login LGPD funcional.

**Como validar:** novo registro em `leads`; listagem admin atualizada.

**Erros comuns:** portal errado no MikroTik; duplicidade CPF/MAC; sem permissão `clientes`.

### Evidências

| Tipo | Referência |
|------|------------|
| MAC / identificador testado | |
| ID em `leads` | |

---

## 11. Configurar campanhas

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela admin** | `/admin/:empresaSlug/campanhas` → `/campanhas/:id` |
| **Tela pública** | `/campanha/:portalId` |
| **API admin** | CRUD `/api/campanhas`, itens, reorder |
| **API pública** | `/api/public/campanha/...` |
| **MySQL** | `campanhas`, `campanha_itens`, `portais` |

**Pré-requisitos:** portal com campanha vinculada; redirect captive para campanha.

**Passos:**

1. Criar campanha e fazer upload de mídias.
2. Vincular ao portal.
3. Abrir fluxo captive → player.

**Resultado esperado:** mídias exibidas na ordem configurada.

**Como validar:** arquivos em `/uploads/campanhas`; reprodução no browser; `audit_logs` em create/update.

**Erros comuns:** portal sem campanha; limite de upload; permissão `portais`.

### Evidências

| Tipo | Referência |
|------|------------|
| ID campanha | |
| Print do player | |

---

## 12. Criar usuário RADIUS

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/admin/:empresaSlug/radius` → **Usuários** |
| **API** | `POST /api/radius/criar-usuario`, `POST /api/radius/vincular-plano`, `GET /api/radius/usuarios`, `DELETE /api/radius/usuarios/:username` |
| **MySQL** | `radius_users`, `radcheck`, `radreply`, `radusergroup`, `planos` |

**Pré-requisitos:** permissão `radius`; plano criado (item 8).

**Passos:**

1. Criar username e senha.
2. Vincular plano.
3. Confirmar na listagem.

**Resultado esperado:** entradas FreeRADIUS consistentes; `radius_users.empresa_id` correto.

**Como validar:** `SELECT * FROM radcheck WHERE username = ?`; `audit_logs` create `radius_user`.

**Erros comuns:** username em outra empresa; plano não vinculado.

### Evidências

| Tipo | Referência |
|------|------------|
| Username | |
| Plano vinculado | |

---

## 13. Testar sessão RADIUS

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/admin/:slug/radius` → **Sessões ativas**, **Log Radius**, **Marco Civil** |
| **API** | `GET /api/radius/sessoes`, `GET /api/radius-logs/...`, `GET /api/compliance/...` |
| **MySQL** | `radacct`, `radpostauth`, `connection_logs`, `connection_logs_sync` |

**Pré-requisitos:** usuário RADIUS (item 12); NAS/MikroTik → FreeRADIUS; cliente Wi‑Fi autenticando.

**Passos:**

1. Conectar dispositivo com credenciais do usuário.
2. Atualizar **Sessões ativas**.
3. Desconectar e conferir accounting.

**Resultado esperado:** sessão ativa no painel; registro em `radacct` após uso.

**Como validar:** `SELECT * FROM radacct WHERE username = ? ORDER BY acctstarttime DESC LIMIT 5`.

**Erros comuns:** secret NAS errado; accounting desligado no MikroTik; filtro `empresa_id` incorreto.

### Evidências

| Tipo | Referência |
|------|------------|
| `acctsessionid` / horário | |
| Print sessões ativas | |

---

## 14. Testar pagamento Mercado Pago (legado)

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela config** | `/admin/:slug/configuracoes?tab=mercado` |
| **Telas públicas** | `/planos-cliente` → `/pagamento/:id` |
| **Tela lista** | `/admin/:slug/pagamentos` |
| **API config** | `GET/POST /api/empresa-config/mercadopago`, `POST .../mercadopago/testar` |
| **API legado** | `GET/POST /api/config-mercadopago`, `GET .../testar-conexao` → `config_mercadopago` |
| **API pagamento** | `POST /api/pagamentos/gerar`, `gerar-cartao`, `GET /status`, `POST /notificacao`, `GET /mp-public-key` |
| **MySQL** | `empresa_configs`, `config_mercadopago`, `pagamentos`, `planos`, `portais`, `mikrotiks` |

**Pré-requisitos:** credenciais **MP TEST**; portal tipo `planos`; plano com preço; webhook `{ORIGEM}/api/pagamentos/notificacao` acessível.

**Passos:**

1. Salvar credenciais MP e **Testar conexão**.
2. Simular captive → escolher plano → pagar (PIX ou cartão teste).
3. Aguardar webhook ou polling de status.
4. Conferir em `/admin/:slug/pagamentos`.

**Resultado esperado:** `pagamentos.status` aprovado; liberação de acesso conforme regra do sistema.

**Como validar:** linha em `pagamentos`; UI admin; usuário liberado no Wi‑Fi.

**Erros comuns:** token só em `empresa_configs` mas pagamento lê `config_mercadopago`; webhook inacessível em dev; cartão teste recusado; rate limit.

> **Fora de escopo:** Fase 3 Mercado Pago Split (`application_fee`, OAuth marketplace).

### Evidências

| Tipo | Referência |
|------|------------|
| ID pagamento (`pagamentos.id`) | |
| Status MP | |
| Print comprovante / painel | |

---

## 15. Testar WhatsApp / Evolution

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/admin/:slug/whatsapp` |
| **API** | `GET/POST /api/whatsapp/config`, `GET /status`, `POST /instance/create`, `GET /instance/qrcode`, `POST /send`, `GET /logs` |
| **MySQL** | `empresa_configs` (`whatsapp`), `whatsapp_logs` |

**Pré-requisitos:** Evolution API online; permissão `configuracoes`.

**Passos:**

1. Salvar URL e API key.
2. Criar instância e escanear QR.
3. Aguardar conexão (`state = open`).
4. Enviar mensagem de teste.

**Resultado esperado:** status conectado; mensagem entregue; log em `whatsapp_logs`.

**Como validar:** `GET /api/whatsapp/status`; banner de desconectado some no layout admin.

**Erros comuns:** Evolution offline; rate limit; instância duplicada.

### Evidências

| Tipo | Referência |
|------|------------|
| Nome da instância | |
| Print QR / mensagem recebida | |

---

## 16. Testar WireGuard

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/admin/:slug/mikrotik` → **VPN WireGuard** (alt.: `/admin/:slug/vpn`) |
| **API** | `GET /status`, `GET/PUT /settings`, `POST /clients`, `DELETE /clients/:id`, `GET /clients/:id/config` |
| **MySQL** | `empresa_vpn_peers` |

**Pré-requisitos:** permissão `vpn`; API/serviço WireGuard no servidor.

**Passos:**

1. Verificar status VPN.
2. Criar peer/cliente.
3. Baixar configuração e aplicar no MikroTik remoto.
4. Repetir teste de conexão RouterOS (item 7).

**Resultado esperado:** túnel ativo; API do MikroTik alcançável via VPN.

**Como validar:** `SELECT * FROM empresa_vpn_peers WHERE empresa_id = ?`; health WireGuard em `/super/system`.

**Erros comuns:** API WireGuard fora; UDP bloqueado; peer duplicado.

### Evidências

| Tipo | Referência |
|------|------------|
| ID do peer | |
| Print status VPN | |

---

## 17. Testar dashboard

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela tenant** | `/admin/:slug/` |
| **Tela super** | `/super` |
| **API** | `GET /api/dashboard` (tenant); `GET /api/empresas` (super) |
| **MySQL** | agregações em `pagamentos`, `radius_users`, `mikrotiks`, `radacct` |

**Pré-requisitos:** dados de teste na tenant (pagamentos, usuários, mikrotiks).

**Passos:** abrir dashboard após cadastros; comparar KPIs com SQL.

**Resultado esperado:** totais de pagamentos (geral e 24h), usuários RADIUS, mikrotiks, sessões por equipamento.

**Como validar:** `SELECT COUNT(*) ... WHERE empresa_id = ?` para cada métrica.

**Erros comuns:** 403 sem `dashboard`; JWT com empresa errada; tenant vazia (zeros).

### Evidências

| Tipo | Referência |
|------|------------|
| Print KPIs | |
| Valores SQL comparados | |

---

## 18. Testar backups

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/super/backups` |
| **API** | `GET/POST /api/system-backup`, `POST /restore/:id`, `DELETE /:id` |
| **MySQL** | `system_backups` |
| **Arquivos** | `/var/www/hotspot/backups` (produção) |

**Pré-requisitos:** `super_admin`; `mysqldump` e espaço em disco.

**Passos:**

1. Clicar em **Criar backup**.
2. Verificar registro na listagem.
3. *(Opcional, só em sandbox)* testar restore — **não em produção ativa**.

**Resultado esperado:** `db_exists` / `files_exists` true na listagem.

**Como validar:** `SELECT * FROM system_backups ORDER BY criado_em DESC`; arquivos no servidor.

**Erros comuns:** 403; paths inexistentes em dev local; restore destrutivo.

### Evidências

| Tipo | Referência |
|------|------------|
| ID backup | |
| Caminhos dos arquivos | |

---

## 19. Testar healthcheck

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | `/super/system` |
| **API** | `GET /api/system/health` |

**Pré-requisitos:** super admin logado.

**Passos:** abrir diagnóstico; aguardar refresh (30s) ou clicar em atualizar.

**Resultado esperado:** status de `mysql`, `pm2`, `freeradius`, `nginx`, `evolution_api`, `wireguard` e status geral.

**Como validar:** pills verdes/amarelas/vermelhas na UI; parar um serviço e observar mudança.

**Erros comuns:** 403 sem super_admin; PM2 ausente em dev (warning); Evolution offline.

### Evidências

| Tipo | Referência |
|------|------------|
| Print diagnóstico | |
| JSON health (trecho) | |

---

## 20. Testar auditoria

- [ ] Teste executado
- [ ] Aprovado
- [ ] Reprovado

| Campo | Detalhe |
|-------|---------|
| **Tela** | *Não há tela dedicada* |
| **API** | *Sem endpoint de listagem* — gravação em `src/utils/audit.js` |
| **MySQL** | `audit_logs` (migration **016**) |

**Pré-requisitos:** migration 016 aplicada.

**Passos:**

1. Executar ações auditáveis (login, CRUD empresa/plano/portal/mikrotik/admin/campanha/radius, config WhatsApp, pagamento manual, limpeza).
2. Consultar SQL abaixo.

**Query sugerida:**

```sql
SELECT id, empresa_id, admin_id, acao, entidade, entidade_id, ip, created_at
FROM audit_logs
ORDER BY id DESC
LIMIT 50;
```

**Ações registradas (amostra):** `login`; create/update/delete em `empresa`, `admin`, `plano`, `portal`, `mikrotik`, `campanha`, `radius_user`; `branding_*`; `config_whatsapp`; `pagamento_manual`; `limpeza_*`.

**Resultado esperado:** linhas com `admin_id`, `empresa_id`, `ip` e `payload_json` coerentes.

**Como validar:** nova linha após cada ação administrativa.

**Erros comuns:** tabela ausente (auditoria silenciosa no log do backend).

### Evidências

| Tipo | Referência |
|------|------------|
| IDs `audit_logs` coletados | |
| Ações testadas | |

---

## Problemas encontrados

Registrar cada falha durante o ciclo. Um problema pode referenciar vários itens do checklist.

### Template por problema

| Campo | Conteúdo |
|-------|----------|
| **ID** | P-001 |
| **Item(ns) do checklist** | ex.: 7, 13 |
| **Severidade** | Crítica / Alta / Média / Baixa |
| **Descrição** | |
| **Passos para reproduzir** | |
| **Esperado vs obtido** | |
| **Evidência** | print, log, SQL |
| **Ambiente** | URL, branch, data |
| **Status** | Aberto / Em análise / Corrigido / Won't fix |

---

### Registro de problemas

| ID | Item | Severidade | Descrição resumida | Status |
|----|------|------------|-------------------|--------|
| P-001 | | | | Aberto |
| P-002 | | | | Aberto |
| P-003 | | | | Aberto |

---

## Histórico do documento

| Versão | Data | Autor | Alteração |
|--------|------|-------|-----------|
| 1.0 | | | Versão inicial — 20 testes funcionais CenterSpot |
