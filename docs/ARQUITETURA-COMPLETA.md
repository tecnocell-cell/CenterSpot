# CenterSpot (Hotspot-WhatsApp) — Documentação Técnica Completa

**Produto:** CenterSpot · **Marca plataforma:** OmniCenter · **Desenvolvido por:** Center Tech  
**Data do levantamento:** 2026-05-22  
**Escopo:** Análise read-only do código instalado em `Hotspot-WhatsApp/` — sem alterações de arquitetura.

---

## Sumário

1. [Estrutura geral](#1-estrutura-geral)
2. [Backend](#2-backend)
3. [Frontend](#3-frontend)
4. [Multi-tenant](#4-multi-tenant)
5. [Banco de dados](#5-banco-de-dados)
6. [RADIUS](#6-radius)
7. [MikroTik](#7-mikrotik)
8. [Portais hotspot](#8-portais-hotspot)
9. [Pagamentos](#9-pagamentos)
10. [WhatsApp](#10-whatsapp)
11. [Segurança](#11-segurança)
12. [Infraestrutura](#12-infraestrutura)
13. [Fluxo completo do sistema](#13-fluxo-completo-do-sistema)
14. [Relatório final — riscos e recomendações](#14-relatório-final--riscos-e-recomendações)

---

## 1. Estrutura geral

### 1.1 Visão de alto nível

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Cliente WiFi / Navegador                        │
└───────────────┬───────────────────────────────┬───────────────────────────┘
                │ HTTPS (portal, pagamento)      │ UDP 1812/1813 (RADIUS)
                ▼                               ▼
┌───────────────────────┐              ┌────────────────────┐
│  Nginx (produção)     │              │  FreeRADIUS 3.0    │
│  → frontend/dist      │              │  → MySQL rad*      │
│  → proxy /api → :3001 │              └─────────▲─────────┘
└───────────┬───────────┘                        │
            │                                      │
            ▼                                      │
┌───────────────────────┐     RouterOS API       │
│  Node.js Express 5    │◄────WireGuard VPN──────┤ MikroTik RB
│  PM2 hotspot-api      │                        │
└───────────┬───────────┘                        │
            │                                      │
            ▼                                      │
┌───────────────────────┐              ┌─────────┴──────────┐
│  MySQL 8 (hotspot)    │              │  Docker (opcional)   │
│  app + RADIUS tables  │              │  Evolution API :8080 │
└───────────────────────┘              │  wg-easy WireGuard   │
                                       └──────────────────────┘
```

### 1.2 Pastas na raiz do repositório

| Caminho | Finalidade |
|---------|------------|
| `install.sh` | Instalador produção Linux (VPS ou atrás de Traefik): Nginx, MySQL, FreeRADIUS, Docker, PM2, SSL |
| `hotspot.zip` | Pacote da aplicação (extraído para `/var/www/hotspot` em produção) |
| `freeradius.zip` | Configuração FreeRADIUS 3.0 customizada |
| `start-local.ps1` | Script dev Windows (MySQL local + backend + frontend) |
| `mysql-data/` | Datadir MySQL local (dev Windows) |
| `docs/` | Documentação (este arquivo) |

### 1.3 Backend (`hotspot/backend/`)

| Pasta/arquivo | Finalidade |
|---------------|------------|
| `server.js` | **Entrypoint** Express: monta rotas, captive portal HTML, emergency |
| `db.js` | Pool `mysql2` compartilhado |
| `.env` | Variáveis: `PORT`, `DB_*`, `JWT_SECRET`, `SYSTEM_DOMAIN`, Evolution, WireGuard |
| `src/routes/` | Rotas REST organizadas por domínio (~32 routers) |
| `src/controllers/` | Lógica de negócio |
| `src/middleware/` | `auth`, `tenant`, `authorize`, `checkPermissao` |
| `src/models/` | Modelos Sequelize parciais (`Admin`, `Plan`, etc.) |
| `src/utils/` | `hotspotSetup.js`, `mikrotikClient.js` |
| `src/services/` | `whatsappNotify.js` — notificações pós-liberação |
| `src/jobs/` | `syncConnectionLogs.js`, `verificaExpiracoes.js` |
| `migrations/` | Migrations incrementais `001`–`015` (Node scripts) |
| `jobs/estrutura.sql` | Dump completo do schema + seeds |
| `uploads/campanhas/` | Mídia de campanhas pré-portal |
| `certificados/` | Certificados EFI PIX (.pem) |
| `routes/admin.js` | Login legado `/api/admin/login` (duplicata) |

### 1.4 Frontend (`hotspot/frontend/`)

| Pasta | Finalidade |
|-------|------------|
| `src/App.jsx` | Roteamento React Router 7 |
| `src/pages/admin/` | Painel administrativo por empresa (`/admin/:slug/...`) |
| `src/pages/super/` | Super admin (OTA, backups, empresas globais) |
| `src/pages/public/` | Captive portal, pagamento, LGPD, leads, campanhas |
| `src/components/admin/` | Layout, configs MP/EFI, ThemeEditor |
| `src/contexts/` | `AuthContext`, `ThemeContext` |
| `src/theme/` | CSS CenterOS + `themeConfig.js` |
| `public/` | Logos SVG (`logo-centerspot.svg`, `logo-omnicenter.svg`) |
| `dist/` | Build Vite (servido pelo Nginx em produção) |

### 1.5 Infra (`hotspot/infra/wireguard/`)

| Arquivo | Finalidade |
|---------|------------|
| `docker-compose.yml` | Container `wg-easy` — painel VPN + peers MikroTik |

### 1.6 Integrações externas

| Integração | Onde |
|------------|------|
| **FreeRADIUS** | `/etc/freeradius/3.0` — auth hotspot via MySQL |
| **Evolution API** | Docker `atendai/evolution-api` — WhatsApp |
| **Mercado Pago** | API + webhooks |
| **EFI (Gerencianet)** | PIX com certificado |
| **MikroTik RouterOS** | `node-routeros` — API 8728 |
| **WireGuard** | `wg-easy` — VPN para RB alcançar servidor |
| **OTA Updates** | `UPDATE_SERVER_URL` → servidor master Forum/Center |

---

## 2. Backend

### 2.1 Stack

| Item | Tecnologia |
|------|------------|
| Runtime | Node.js 20+ |
| Framework | **Express 5.1** |
| Banco | **MySQL 8** via `mysql2` (pool) |
| ORM | Sequelize 6 (**uso parcial** — maioria SQL puro) |
| Auth | **JWT** (`jsonwebtoken`) + `bcryptjs` |
| Upload | `multer` |
| HTTP client | `axios` |

### 2.2 Entrypoint e inicialização

**Arquivo:** `backend/server.js`

1. Carrega `dotenv`
2. Registra handler `uncaughtException` para erros RouterOS `!empty`
3. Importa middlewares e ~30 routers
4. `app.use(cors())`, `app.use(express.json())`
5. Monta rotas **públicas** primeiro (login, pagamentos, LGPD, portal, hotspot HTML)
6. Monta rotas **protegidas** com `auth` → `tenant` → `checkPermissao(modulo)`
7. Rotas **super_admin** com `authorize` interno nos routers
8. `app.listen(process.env.PORT || 3001)`

### 2.3 Middlewares

| Middleware | Arquivo | Função |
|------------|---------|--------|
| `auth` | `src/middleware/auth.js` | Valida JWT no header `Authorization: Bearer` ou `?token=` |
| `tenant` | `src/middleware/tenant.js` | Define `req.empresa_id` a partir do JWT; super_admin usa `x-empresa-id` |
| `authorize(...roles)` | `src/middleware/authorize.js` | Restringe por `role` (`super_admin`, `owner`, etc.) |
| `checkPermissao(modulo)` | `src/middleware/checkPermissao.js` | RBAC por módulo (`ver/criar/editar/excluir`) |

### 2.4 Autenticação e JWT

**Login principal:** `POST /api/auth/login` → `authController.login`

Fluxo:

1. Busca admin por email (`Admin.findByEmail`)
2. `bcrypt.compare` na senha
3. Lista empresas via `Admin.getEmpresas` (`admin_empresas` + role)
4. Gera JWT (expiração **1 dia**) com payload:
   - `id`, `email`, `role`
   - `empresa_id`, `empresa_slug`, `empresa_nome` (tenant ativo)
5. Retorna `permissoes` consolidadas (super_admin = tudo liberado)

**Troca de empresa:** `POST /api/auth/switch-empresa` (requer `auth`) — novo JWT com outro `empresa_id`.

**Login legado:** `POST /api/admin/login` — mesmo conceito via `routes/admin.js`.

**Acesso temporário portal:** `POST /api/auth/temp` — token curto para fluxos captive.

### 2.5 Sistema de permissões

- Tabelas: `grupos_permissao`, `grupo_permissoes`, `admin_grupos`
- Módulos definidos em `grupoPermissaoController.MODULOS` (dashboard, mikrotiks, portais, radius, etc.)
- Frontend filtra menu via `hasPermission(modulo, 'ver')` no `AuthContext`
- Backend aplica `checkPermissao` no mount das rotas em `server.js`

**Roles:**

| Role | Escopo |
|------|--------|
| `super_admin` | Todas empresas, rotas `/api/empresas`, OTA, backups |
| `owner` / `manager` / `operator` | Vinculados via `admin_empresas` |

### 2.6 Mapa de rotas (resumo por prefixo)

> ~145 endpoints ativos. Detalhamento completo na seção anexa abaixo.

| Prefixo | Auth | Finalidade |
|---------|------|------------|
| `/api/auth` | Misto | Login, switch empresa, temp |
| `/api/admin` | Público | Login legado |
| `/api/planos` | auth+tenant+planos | CRUD planos |
| `/api/mikrotiks` | auth+tenant+mikrotiks | CRUD + deploy hotspot na RB |
| `/api/radius` | auth+tenant | Usuários e sessões RADIUS |
| `/api/portais` | auth+tenant+portais | CRUD portais captive |
| `/api/campanhas` | auth+tenant+portais | Campanhas pré-portal |
| `/api/pagamentos` | Público + auth | PIX/cartão, webhooks, liberação |
| `/api/lgpd` | Público + auth | Login/cadastro LGPD |
| `/api/leads` | auth+tenant+leads | CRM leads |
| `/api/whatsapp` | auth+tenant+config | Evolution API proxy |
| `/api/wireguard` | auth+tenant+vpn | Peers VPN |
| `/api/empresas` | super_admin | CRUD tenants |
| `/api/dashboard` | auth+tenant | KPIs |
| `/api/compliance` | auth+tenant | Marco Civil / connection_logs |
| `/api/system-*` | super_admin | Backup e OTA |
| `/api/hotspot-login/:id` | Público | HTML para MikroTik fetch |
| `/hotspot/redirect/:id` | Público | Portal captive |
| `/api/login-portal/auth` | Público | Auth WiFi no portal |

### 2.7 Anexo — Rotas detalhadas (principais)

#### Públicas críticas

| Método | Endpoint | Controller / handler | Função |
|--------|----------|----------------------|--------|
| POST | `/api/auth/login` | authController.login | Login painel |
| POST | `/api/pagamentos/gerar` | pagamentoController | Gera cobrança PIX/cartão |
| POST | `/api/pagamentos/notificacao` | pagamentoController | Webhook MP |
| POST | `/api/pagamentos/pix-trial` | pagamentoController | Libera trial PIX |
| POST | `/api/login-portal/auth` | loginPortalController | Autentica usuário no portal WiFi |
| POST | `/api/lgpd/login` | lgpdController | Portal LGPD |
| GET | `/hotspot/redirect/:mikrotikId` | inline server.js | Renderiza portal |
| GET | `/api/hotspot-login/:mikrotikId` | inline server.js | login.html para RB |

#### Protegidas (exemplo MikroTik)

| Método | Endpoint | Middleware | Função |
|--------|----------|------------|--------|
| POST | `/api/mikrotiks/` | auth, tenant, mikrotiks | Cadastra RB + NAS |
| POST | `/api/mikrotiks/:id/enviar-hotspot` | idem | `hotspotSetup.js` via API |
| POST | `/api/mikrotiks/:id/enviar-login` | idem | Push login.html |

---

## 3. Frontend

### 3.1 Stack

| Item | Tecnologia |
|------|------------|
| Framework | **React 19** |
| Build | **Vite 7** |
| CSS | Tailwind 3 + tema CenterOS (`theme.css`) |
| Roteamento | **React Router 7** |
| Forms | React Hook Form + Zod |
| Ícones | Lucide React |
| HTTP | `fetch` nativo (sem axios centralizado) |

### 3.2 Roteamento (`App.jsx`)

#### Público

| Rota | Página | Função |
|------|--------|--------|
| `/` | Login | Login CenterSpot |
| `/planos-cliente` | PlanosCliente | Planos no captive |
| `/pagamento/:id` | Pagamento | Checkout PIX |
| `/lgpd`, `/cadastro` | LgpdAuto, CadastroLGPD | Fluxo LGPD |
| `/lead`, `/lead-passivo` | CadastroLead, CadastroLeadPassivo | Captura leads |
| `/login-hotspot` | LoginHotspot | Login voucher/senha |
| `/campanha/:portalId` | CampanhaPlayer | Mídia pré-portal |
| `/registro` | Registro | Registro empresa pública |

#### Admin (`/admin/:empresaSlug/...`)

| Rota | Página |
|------|--------|
| `.../` | Dashboard |
| `.../mikrotiks` | Mikrotiks |
| `.../vpn` | Wireguard |
| `.../portais`, `.../portais/:id/editor` | Portais + editor |
| `.../planos` | Planos |
| `.../radius` | UsuariosRadius |
| `.../sessoes`, `.../sessoeslog` | Sessões / logs |
| `.../lgpd`, `.../leads` | LGPD / Leads |
| `.../pagamentos` | Pagamentos |
| `.../whatsapp` | WhatsApp (Evolution) |
| `.../campanhas` | Campanhas |
| `.../configuracoes` | Config + aparência |
| `.../usuarios`, `.../grupos-permissao` | Admins / permissões |
| `.../empresas` | Empresas (se super_admin no tenant) |
| `.../compliance` | Marco Civil |

#### Super admin (`/super/...`)

| Rota | Página |
|------|--------|
| `/super` | SuperDashboard |
| `/super/empresas` | Empresas globais |
| `/super/backups` | Backups |
| `/super/atualizar` | OTA apply |
| `/super/publicar-atualizacao` | Publicar update |

### 3.3 Layout e menu

- **`AdminLayout.jsx`**: sidebar com menu filtrado por `permissoes`; switch de empresa; aviso WhatsApp desconectado; footer **OmniCenter** + Center Tech
- **`AuthContext`**: token em `localStorage.admin_token`; empresas e permissões cacheadas

### 3.4 Fluxo de login (frontend)

1. `Login.jsx` → `POST /api/auth/login`
2. `login(token, user, empresas, permissoes)` no contexto
3. Redirect `navigate(/admin/${slug})`
4. `RotaPrivada` bloqueia rotas sem user
5. Vite proxy dev: `/api` → `localhost:3001`

### 3.5 Chamadas API

Padrão repetido nas páginas:

```javascript
const token = localStorage.getItem('admin_token');
fetch('/api/...', { headers: { Authorization: `Bearer ${token}` } });
```

Super admin trocando contexto pode enviar `x-empresa-id` (via switch empresa no layout).

---

## 4. Multi-tenant

### 4.1 É multi-tenant?

**Sim.** Modelo **shared database, shared schema** com coluna **`empresa_id`** na maioria das tabelas de negócio.

**Não há:**

- Banco separado por tenant
- Subdomínio automático por empresa (usa **slug na URL** do admin: `/admin/:empresaSlug`)
- Domínio próprio por tenant (configurável manualmente via `SYSTEM_DOMAIN` único por instalação)

### 4.2 Identificação do tenant

| Camada | Mecanismo |
|--------|-----------|
| API admin | JWT `empresa_id` + middleware `tenant` → `req.empresa_id` |
| Super admin | Header `x-empresa-id` ou query `empresa_id` |
| Portal público | Query `empresa_id`, `empresa` (slug), derivado do `mikrotikId` |
| RADIUS | `radius_users.empresa_id` + `nas.empresa_id` |
| Isolamento | Queries devem filtrar `WHERE empresa_id = ?` |

### 4.3 Entidades por empresa

| Entidade | Vínculo |
|----------|---------|
| Admins | `admins.empresa_id` + N:N `admin_empresas` |
| MikroTiks | `mikrotiks.empresa_id` |
| Planos | `planos.empresa_id` |
| Portais | `portais.empresa_id` |
| Pagamentos | `pagamentos.empresa_id` |
| Leads / LGPD | `empresa_id` |
| NAS RADIUS | `nas.empresa_id` |
| Config MP/EFI/WhatsApp | `empresa_configs` JSON por tipo |
| Campanhas | `campanhas.empresa_id` |

### 4.4 Criação de empresa

- Super admin: `POST /api/empresas`
- Público: `POST /api/registro`
- Seed: empresa `default` (id=1) no `estrutura.sql`

---

## 5. Banco de dados

### 5.1 Engine e conexão

- **MySQL 8**, charset `utf8mb4`
- Usuário app: `hotspotuser` (instalação)
- Pool: `backend/db.js`

### 5.2 Tabelas principais (37 no dump)

#### Multi-tenant e auth

| Tabela | Finalidade |
|--------|------------|
| `empresas` | Tenant raiz |
| `admins` | Usuários painel |
| `admin_empresas` | N:N admin ↔ empresa + role |
| `grupos_permissao` | Grupos RBAC |
| `grupo_permissoes` | Permissões por módulo |
| `admin_grupos` | Admin ↔ grupo |
| `empresa_configs` | JSON: mercadopago, efi, whatsapp |

#### Rede e hotspot

| Tabela | Finalidade |
|--------|------------|
| `mikrotiks` | Roteadores (IP, credenciais API, `vpn_ip`, `portal_id`) |
| `nas` | Cliente RADIUS (secret, nasname) |
| `planos` | Planos (preço, duração, velocidade, pool) |
| `portais` | Definição captive (HTML, template, campanha) |
| `portal_templates` | Templates reutilizáveis |
| `campanhas` / `campanha_itens` | Mídia pré-portal |

#### RADIUS (padrão FreeRADIUS)

| Tabela | Finalidade |
|--------|------------|
| `radcheck` | Credenciais (password) |
| `radreply` | Atributos reply (rate limit, timeout) |
| `radusergroup` | Usuário ↔ grupo |
| `radacct` | Accounting sessões |
| `radpostauth` | Log auth |
| `radgroupcheck` / `radgroupreply` | Grupos |
| `radius_users` | **Ponte app** username ↔ empresa, plano, nas |

#### Pagamentos e clientes

| Tabela | Finalidade |
|--------|------------|
| `pagamentos` | Transações PIX/cartão, status, MAC, CPF |
| `leads` | Leads marketing |
| `lgpd_logins_backup` | Registros LGPD |

#### Compliance e logs

| Tabela | Finalidade |
|--------|------------|
| `connection_logs` | Marco Civil (sync de radacct) |
| `connection_logs_sync` | Cursor de sincronização |
| `whatsapp_logs` | Auditoria mensagens |

#### Sistema (OTA / backup)

| Tabela | Finalidade |
|--------|------------|
| `updates`, `update_files`, `update_migrations` | Pacotes OTA |
| `system_backups`, `applied_updates`, `schema_snapshots` | Backup e schema |

### 5.3 Tabelas críticas

| Criticidade | Tabelas |
|-------------|---------|
| **Alta** | `empresas`, `admins`, `mikrotiks`, `nas`, `radcheck`, `radacct`, `planos`, `portais`, `pagamentos` |
| **Média** | `radius_users`, `empresa_configs`, `connection_logs` |
| **Auxiliar** | `portal_templates`, `whatsapp_logs`, `updates` |

### 5.4 Migrations

Scripts Node em `backend/migrations/001`–`015` — executados no install e manualmente. Complementam o dump `estrutura.sql`.

---

## 6. RADIUS

### 6.1 Arquitetura

- **FreeRADIUS 3.0** lê/escreve no **mesmo MySQL** da aplicação
- Módulo `sql` habilitado em `/etc/freeradius/3.0/mods-enabled/sql`
- NAS dinâmicos da tabela `nas` (`read_clients = yes`)
- CoA na porta **3799** (disconnect / change authorization)

### 6.2 Integração com a app

| Ação | Onde |
|------|------|
| Criar usuário | `radiusController` → INSERT `radcheck`, `radreply`, `radius_users` |
| Vincular plano | Atualiza `radreply` (Mikrotik-Rate-Limit, Session-Timeout) |
| Pagamento aprovado | `pagamentoController` libera no RADIUS |
| LGPD / Lead / Portal login | Controllers chamam criação RADIUS |

### 6.3 Fluxo cliente → portal → RADIUS → MikroTik

```
1. Cliente associa WiFi na RB
2. RB redireciona → /api/hotspot-login/:mikrotikId (HTML com $(mac),$(ip))
3. HTML redireciona → /hotspot/redirect/:mikrotikId?mac=...&empresa_id=...
4. Portal (LGPD / planos / lead / login) coleta dados
5. Backend cria/atualiza radcheck + radreply (username geralmente MAC ou CPF)
6. Cliente submete login hotspot na RB
7. RB envia Access-Request UDP → FreeRADIUS:1812
8. FreeRADIUS consulta radcheck/radreply no MySQL
9. Access-Accept → RB libera sessão
10. Accounting → radacct → sync → connection_logs
```

### 6.4 Expiração e bloqueio

- Atributos `Session-Timeout`, `Max-All-Session`, `Expiration` em `radreply` / módulos `expiration`, `sqlcounter`
- Job `verificaExpiracoes.js` — verifica planos expirados
- Pagamento pendente = sem entrada válida em `radcheck` ou atributo de bloqueio

---

## 7. MikroTik

### 7.1 Conexão backend → RB

| Método | Uso |
|--------|-----|
| **RouterOS API** | `node-routeros` — porta **8728** (configurável em `mikrotiks.porta`) |
| **WireGuard VPN** | RB como peer; IP `10.8.0.x`; RADIUS aponta para `10.8.0.1` (servidor) |
| **RADIUS** | RB → servidor:1812 (não passa pelo backend Node) |

### 7.2 Configuração automática

**Arquivo:** `src/utils/hotspotSetup.js`

Etapas via API:

1. IP na interface WAN/LAN hotspot
2. Pool DHCP
3. DHCP server/network
4. Hotspot profile (`use-radius=yes`)
5. Hotspot server
6. Cliente RADIUS (`address=10.8.0.1` ou configurável)
7. Walled garden (`SYSTEM_DOMAIN`, domínios MP)
8. NAT masquerade
9. Download `login.html` / `status.html` via `/tool/fetch`

Endpoints admin: `POST /api/mikrotiks/:id/enviar-hotspot`, `enviar-login`, `enviar-status`

### 7.3 Cadastro RB

`POST /api/mikrotiks` também insere registro em `nas` (FreeRADIUS client) com `secret`.

### 7.4 CoA / Disconnect

- `radius incoming accept` na RB (porta 3799)
- Permite derrubar sessão remotamente (implementação parcial via RADIUS CoA no FreeRADIUS)

### 7.5 Arquivos relacionados

| Arquivo | Função |
|---------|--------|
| `mikrotikRoutes.js` | Rotas CRUD + deploy |
| `mikrotikController.js` / `mikrotikAPIController.js` | Lógica |
| `mikrotikClient.js` | Wrapper API |
| `hotspotSetup.js` | Setup completo |
| `wireguardController.js` | Peers VPN |

---

## 8. Portais hotspot

### 8.1 Tipos de portal (`portais.tipo`)

| Tipo | Fluxo |
|------|-------|
| `lgpd` | Consentimento LGPD |
| `planos` | Escolha de plano + pagamento |
| `lead` | Captura lead ativo |
| `lead-passivo` | Captura passiva |
| `login` | Voucher / usuário-senha |

### 8.2 Templates

- Tabela `portal_templates` (HTML/CSS base)
- `portais.html_content`, `custom_css`, cores, logo
- Editor visual em `PortalEditor.jsx`

### 8.3 Publicação

1. Admin configura portal vinculado a `mikrotik_id` / `portal_id`
2. `dns-name` no hotspot profile = `SYSTEM_DOMAIN`
3. Walled garden libera domínio
4. Cliente acessa `/hotspot/redirect/:mikrotikId`
5. Opcional: campanha ativa (`campanha_ativa_id`) antes do portal

### 8.4 Campanhas pré-portal

- Vídeo/imagem em `/uploads/campanhas/`
- `CampanhaPlayer.jsx` → tracking de views

---

## 9. Pagamentos

### 9.1 Provedores

| Provedor | Config | Webhook |
|----------|--------|---------|
| **Mercado Pago** | `empresa_configs` tipo `mercadopago` | `POST /api/pagamentos/notificacao` |
| **EFI PIX** | `empresa_configs` tipo `efi` + `.pem` | Rotas em `efiRoutes` |

### 9.2 Fluxo PIX (resumido)

1. Portal chama `POST /api/pagamentos/gerar`
2. QR Code retornado ao cliente
3. Webhook confirma pagamento
4. Backend atualiza `pagamentos.status = aprovado`
5. Cria/libera usuário RADIUS (MAC vinculado)
6. Opcional: WhatsApp `notificarLiberacao`

### 9.3 Trial PIX

- `POST /api/pagamentos/pix-trial` — liberação temporária por CPF (migration 013)

### 9.4 Walled garden Mercado Pago

- `mp-security.js` servido localmente + proxy `/api/pagamentos/mp-device-session/...` para device fingerprint no captive

---

## 10. WhatsApp

### 10.1 Stack real

| Componente | Tecnologia |
|------------|------------|
| API | **Evolution API** (Docker), não WPPConnect em runtime |
| Dependência legada | `@wppconnect-team/wppconnect` no package.json (possível código morto) |
| Config | `empresa_configs` tipo `whatsapp` **ou** `.env` global |

### 10.2 Multi-tenant Evolution

- Instância por empresa: `empresa_${empresaId}` (padrão)
- Evita vazamento da instância global `hotspot` entre tenants (`whatsappController.getEvolutionConfig`)

### 10.3 Funcionalidades

| Recurso | Endpoint / serviço |
|---------|-------------------|
| QR Code / status | `/api/whatsapp/instance/*` |
| Envio manual | `POST /api/whatsapp/send` |
| Pós-liberação hotspot | `services/whatsappNotify.js` |
| Template por portal | `portais.whatsapp_template` |
| Teste | `POST /api/portais/:id/whatsapp-teste` |

---

## 11. Segurança

### 11.1 Pontos positivos

- Senhas admin com **bcrypt**
- JWT com expiração 1d
- Middleware `tenant` força `empresa_id` nas rotas protegidas
- RBAC granular por módulo
- Evolution API: instância isolada por empresa (corrigido no controller)
- Prepared statements via `mysql2` na maioria dos controllers

### 11.2 Riscos e problemas críticos

| Severidade | Item |
|------------|------|
| **Alta** | Endpoints `/api/emergency/*` **sem autenticação** — backup/restore |
| **Alta** | Muitos endpoints de pagamento/LGPD **públicos** — dependem de validação interna fraca |
| **Alta** | RADIUS secrets em `nas` — comprometimento do DB expõe todas RBs |
| **Média** | JWT em `localStorage` — vulnerável a XSS |
| **Média** | `super_admin` pode operar em qualquer `empresa_id` — correto por design, mas perigoso se credencial vazar |
| **Média** | Credenciais MikroTik (`mikrotiks.senha`) armazenadas no MySQL |
| **Média** | SQL injection: risco baixo se prepared statements consistentes; auditar queries dinâmicas |
| **Baixa** | Credencial seed em `estrutura.sql` — trocar após install em produção |
| **Baixa** | Rotas duplicadas login `/api/admin` e `/api/auth` |

### 11.3 Isolamento tenant

- **Aplicação:** depende de `req.empresa_id` em **cada** query — erro humano = vazamento
- **RADIUS:** `radius_users.empresa_id` separa; radcheck global por username — username deve ser único ou namespaced
- **Evolution:** isolamento por `instance_name` por empresa

---

## 12. Infraestrutura

### 12.1 Produção (install.sh)

| Componente | Detalhe |
|------------|---------|
| SO | Ubuntu/Debian Linux |
| Node | 20.x via NodeSource |
| Process manager | **PM2** (`hotspot-api`) |
| Web | **Nginx** → `frontend/dist` + proxy `/api` → :3001 |
| SSL | **Certbot** (modo VPS) |
| MySQL | 8.x, banco `hotspot` |
| FreeRADIUS | systemd `freeradius` |
| Docker | Evolution API + PostgreSQL; wg-easy |
| Firewall | UFW: 80, 443, 1812/1813, 3799, WireGuard UDP |

### 12.2 Desenvolvimento local (Windows)

| Componente | Detalhe |
|------------|---------|
| MySQL | Datadir local `mysql-data/` |
| Backend | `node server.js` :3001 |
| Frontend | `npm run dev` :5173 (proxy Vite) |
| FreeRADIUS | Não instalado por padrão no dev Windows |
| Docker | Opcional |

### 12.3 Variáveis `.env` principais

```env
PORT=3001
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET
SYSTEM_DOMAIN          # Domínio captive/MikroTik
EVOLUTION_API_URL      # http://localhost:8080
EVOLUTION_API_KEY
EVOLUTION_INSTANCE
WG_HOST, WG_PASS, WG_PANEL_PORT
UPDATE_SERVER_URL      # OTA master server
```

### 12.4 Portas

| Porta | Serviço |
|-------|---------|
| 3001 | Backend Node |
| 5173 | Vite dev |
| 80/443 | Nginx |
| 3306 | MySQL |
| 1812/1813 | RADIUS auth/acct |
| 3799 | RADIUS CoA |
| 8080 | Evolution API |
| 51820/51821 | WireGuard / painel wg-easy |
| 8728 | RouterOS API |

### 12.5 Build frontend

```bash
cd frontend && npm run build  # → dist/
```

Nginx serve `dist/` com cache agressivo em `/assets/`, sem cache em `index.html`.

---

## 13. Fluxo completo do sistema

### 13.1 Onboarding operador

```
1. Super admin cria empresa (POST /api/empresas)
2. Vincula admins (admin_empresas)
3. Admin configura Mercado Pago / EFI / WhatsApp em empresa_configs
4. Admin cadastra MikroTik → cria NAS no RADIUS
5. Admin configura WireGuard peer para RB
6. Admin cria planos e portal
7. Admin executa "enviar hotspot" na RB (API + hotspotSetup)
8. RB aponta RADIUS para IP VPN do servidor (10.8.0.1)
```

### 13.2 Jornada do cliente WiFi

```
1. Conecta WiFi
2. Captive → login.html → portal redirect
3. Aceita LGPD / escolhe plano / paga PIX
4. Backend grava pagamento + radcheck
5. RADIUS autentica
6. Navegação liberada (walled garden + full access)
7. radacct registra uso
8. connection_logs sync (Marco Civil)
9. Sessão expira por timeout ou saldo do plano
```

---

## 14. Relatório final — riscos e recomendações

### 14.1 Arquitetura em uma frase

**CenterSpot** é um **SaaS multi-tenant** de hotspot WiFi que unifica painel React, API Node.js, MySQL (app + FreeRADIUS), integração MikroTik (API + VPN), pagamentos PIX, Evolution API (WhatsApp) e conformidade LGPD/Marco Civil — instalável como stack self-hosted monolítica.

### 14.2 Dependências críticas

| Dependência | Impacto se falhar |
|-------------|-------------------|
| MySQL | Sistema inteiro + RADIUS |
| FreeRADIUS | Nenhum login WiFi |
| `SYSTEM_DOMAIN` / DNS | Portal captive inacessível |
| WireGuard (se usado) | RB não alcança RADIUS no IP esperado |
| Evolution API | WhatsApp e notificações param |
| Nginx/PM2 | Painel e API offline |

### 14.3 Inconsistências encontradas

| Item | Detalhe |
|------|---------|
| Nome produto | Código mistura SpotControl / CenterSpot / Forum Telecom |
| WPPConnect no package.json | Evolution é o runtime real |
| `plans` vs `planos` | Tabela legada `plans` possivelmente obsoleta |
| `lgpd_logins` vs `lgpd_logins_backup` | Migration 001 referencia nome antigo |
| `adminRoutes.js` | Não montado; duplicata de limpeza |
| Portal HTML em server.js | Estilos antigos (azul escuro), não CenterOS |
| Dev Windows | Sem FreeRADIUS/Docker = WiFi real não testável localmente |

### 14.4 Melhorias recomendadas (prioridade)

| P | Melhoria |
|---|----------|
| P0 | Proteger `/api/emergency/*` com auth forte ou remover em produção |
| P0 | Documentar e testar isolamento `empresa_id` em todos os controllers (audit automatizado) |
| P1 | Unificar branding CenterSpot / OmniCenter / Center Tech no código |
| P1 | Migrar credenciais MikroTik para vault ou criptografia em repouso |
| P1 | HttpOnly cookie para JWT (mitigar XSS) |
| P2 | Completar migração visual portais públicos para tema CenterOS |
| P2 | Remover dependência WPPConnect se não usada |
| P2 | CI: rodar migrations + testes de integração RADIUS |
| P3 | Separar README operacional (VPS vs local vs Cloudflare tunnel) |

### 14.5 Continuidade do desenvolvimento

Para evoluir com segurança:

1. Tratar `empresa_id` como **invariante** em toda query nova
2. Testar fluxo completo em ambiente Linux com FreeRADIUS + RB real ou CHR
3. Não alterar schema RADIUS sem validar `freeradius -XC`
4. Feature flags para pagamento/WhatsApp por tenant em `empresa_configs`
5. Manter este documento atualizado a cada migration `016+`

---

## Apêndice A — Credenciais seed (dev)

| Campo | Valor |
|-------|-------|
| URL painel | `http://localhost:5173` |
| Email | `giandersonfjs@gmail.com` |
| Senha | Definida no seed/install (`estrutura.sql` / `user.js`) |
| Empresa | `default` (id=1) |

---

## Apêndice B — Branding (atualizado nesta sessão)

| Local | Conteúdo |
|-------|----------|
| Login | Logo `logo-centerspot.svg`, título **CenterSpot** |
| Sidebar footer | Logo `logo-omnicenter.svg`, texto **CenterSpot · Hotspot & WhatsApp**, **Desenvolvido por Center Tech** |
| Título browser | CenterSpot — Hotspot WiFi |

---

---

## 15. Fase 2 — Hardening, observabilidade e operação

### 15.1 Backup automático

| Item | Caminho / detalhe |
|------|-------------------|
| Script backup | `hotspot/backend/scripts/backup.sh` |
| Script restore | `hotspot/backend/scripts/restore.sh` |
| Cron exemplo | `hotspot/backend/scripts/cron-centerspot-backup.example` (03:00 diário) |
| Estrutura | `$PROJECT_ROOT/backups/{mysql,uploads,env}/` + `run-<timestamp>/` |
| Retenção | 7 dumps diários; cópia semanal aos domingos (4 semanas) |
| Log | `/var/log/centerspot-backup.log` |

Conteúdo: MySQL (`mysqldump` + gzip), `.env`, `uploads/`, logos (`frontend/*/uploads/logos`), `certificados/`, trechos de config.

### 15.2 Auditoria (`audit_logs`)

| Migration | `016_audit_logs.js` |
|-----------|---------------------|
| Helper | `backend/src/utils/audit.js` |
| Campos | `empresa_id`, `admin_id`, `acao`, `entidade`, `entidade_id`, `payload_json`, `ip`, `created_at` |

Eventos registrados (amostra): login, CRUD admin/empresa/plano, RADIUS, limpeza avançada, pagamento manual, config WhatsApp.

Flag: `AUDIT_ENABLED=0` desliga gravação.

### 15.3 Healthcheck

| Endpoint | `GET /api/system/health` (JWT + `super_admin`) |
| Frontend | `/super/system` |
| Verifica | MySQL, PM2, FreeRADIUS, Nginx, Evolution API, WireGuard, disco, memória, uptime |

Estados agregados: `online` | `warning` | `offline`.

### 15.4 Soft delete de admins

| Migration | `017_admins_soft_delete.js` |
|-----------|----------------------------|
| Colunas | `admins.deleted_at`, `admins.active` |
| Login | Bloqueado se `active=0` ou `deleted_at` preenchido |
| Exclusão API | `DELETE /api/admins/:id` → desativa (não remove linha) |
| Listagens | Ignoram `deleted_at IS NULL` automaticamente no model |

### 15.5 Rate limit e Helmet

| Pacote | Uso |
|--------|-----|
| `helmet` | Headers de segurança (`HELMET_ENABLED=0` desliga) |
| `express-rate-limit` | Login 5/15min; faixas para auth, pagamentos, webhooks, WhatsApp |

Config central: `backend/src/config/app.js`.

### 15.6 Logs estruturados

`backend/src/utils/logger.js` — formato `timestamp LEVEL [contexto] mensagem`.

### 15.7 WhatsApp status simplificado

| Endpoint novo | `GET /api/whatsapp/status` |
| Legado (mantido) | `GET /api/whatsapp/instance/status` |
| Resposta | `conectado`, `desconectado`, `qr_pendente`, `instancia_inexistente` |

Frontend: polling automático em `AdminLayout` e página WhatsApp.

### 15.8 Multi-tenant

Helper `backend/src/utils/tenantAssert.js` — `requireEmpresaId()` em mutações sensíveis (planos, limpeza, admins).

Super admin continua com bypass via ausência de `x-empresa-id` onde aplicável.

### 15.9 PM2 (produção típica)

```bash
pm2 start server.js --name hotspot-backend --cwd /var/www/hotspot/backend
pm2 save
```

Healthcheck lê `pm2 jlist` para processos com nome contendo `hotspot` ou `backend`.

---

*Documento atualizado com Fase 2 (hardening). Ver migrations 016–017 e scripts em `backend/scripts/`.*
