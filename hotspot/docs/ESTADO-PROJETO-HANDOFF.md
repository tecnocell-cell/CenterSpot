# CenterSpot — Estado do projeto e handoff

Documento de continuidade para retomar o trabalho.  
**Última atualização:** 23/05/2026  
**Repositório:** https://github.com/tecnocell-cell/CenterSpot  
**Branch principal:** `main`  
**Produção (doc):** `glpi.forumtelecom.com.br` → `/var/www/hotspot`

---

## 1. Resumo executivo

| Área | Status |
|------|--------|
| Multi-tenant + auth | Funcional (com correções recentes) |
| Fase 2 — hardening, auditoria, backups, health | **Código no GitHub** — exige deploy + migrations em produção |
| Branding / tema azul CenterSpot | **Código no GitHub** — exige `npm run build` + limpar cache/tema legado |
| Diagnóstico Super Admin (`/super/system`) | **Funciona em produção** (após deploys recentes) |
| Fase 3 — Mercado Pago Split (marketplace) | **PAUSADA** — não implementar até novo GO |
| Checklist de testes funcionais | Documentado em `CHECKLIST-TESTES-FUNCIONAIS.md` |
| Homologação completa ponta a ponta | **Pendente** (usar checklist) |

**Regra importante:** `git push` **não** atualiza produção sozinho. Sempre: `git pull` no servidor → build frontend → `pm2 restart` backend → rodar migrations pendentes.

---

## 2. O que já foi feito (por tema)

### 2.1 Git e documentação

| Commit | Descrição |
|--------|-----------|
| `368867c` | Checklist operacional de 20 testes (`docs/CHECKLIST-TESTES-FUNCIONAIS.md`) |
| `f95a4c9` | Fase 2: auditoria, healthcheck, rate limit, branding, scripts backup, tema CenterSpot |
| `fe93e6a` | Registro rota `GET /api/system/health` |
| `fedfd8a` | Healthcheck estável (não derruba com 500); auth JWT alinhado |
| `67a6a29` | UX Super Admin: remove link “Diagnóstico” da sidebar |
| `184d98f` | Remove tabela duplicada na tela de diagnóstico (só cards) |

Arquivos **nunca** commitados (correto): `.env`, `.env.local`, `reports/`, `node_modules/`, `dist/`, uploads runtime, certificados, tokens.

### 2.2 Fase 2 — Backend

**Novos / alterados:**

| Componente | Caminho | Função |
|------------|---------|--------|
| Config central | `backend/src/config/app.js` | JWT, DB, URLs Evolution/WireGuard, rate limits, health thresholds |
| Auditoria | `backend/src/utils/audit.js` + migration `016_audit_logs.js` | Grava em `audit_logs` (sem tela de listagem ainda) |
| Logger | `backend/src/utils/logger.js` | Logs estruturados |
| Rate limit | `backend/src/middleware/rateLimit.js` | Login, auth, pagamentos, webhooks, WhatsApp |
| Request IP | `backend/src/middleware/requestIp.js` | IP para auditoria |
| Tenant assert | `backend/src/utils/tenantAssert.js` | Validação empresa_id |
| Upload security | `backend/src/utils/uploadSecurity.js` | Validação de uploads |
| Healthcheck | `backend/src/controllers/systemHealthController.js` | Checks isolados, sempre HTTP 200 para super_admin |
| Rotas system | `backend/src/routes/systemRoutes.js` | `GET /health` com auth + super_admin |
| Branding API | `backend/src/controllers/brandingController.js` + migration `018` | Logo/favicon por empresa |
| Soft delete admins | migration `017_admins_soft_delete.js` | Contas desativadas |
| Scripts ops | `backend/scripts/backup.sh`, `restore.sh`, cron example | Backup/restore manual |
| Smoke MP marketplace | `backend/scripts/mp-marketplace-smoke-test.js` | **Só homologação Fase 3** — NO-GO sem credenciais |

**`server.js` — rotas super admin relevantes:**

```text
GET  /api/system/health          → systemRoutes (super_admin)
GET  /api/system-backup          → backups (super_admin)
GET  /api/system-update          → atualizações (super_admin)
GET  /api/empresas               → tenants (super_admin)
GET  /api/grupos-permissao       → permissões (super_admin / owner)
GET  /api/public/branding/:slug  → branding público (login)
```

**Correção crítica aplicada:** `auth.js` passou a usar `appConfig.jwt.secret` (igual ao login). Antes usava só `process.env.JWT_SECRET` e podia invalidar tokens → 403 no diagnóstico.

### 2.3 Fase 2 — Frontend

| Componente | Caminho | Função |
|------------|---------|--------|
| Tema CenterSpot | `frontend/src/theme/themeConfig.js` | Padrão azul; storage `hotspot_theme_centerspot_v2` |
| Branding | `BrandingContext.jsx`, `BrandingPanel.jsx`, `brandingApi.js` | Logo/favicon |
| Super Admin layout | `SuperAdminLayout.jsx` + `SuperAdminNav` | Abas no topo (não na sidebar) |
| Diagnóstico | `pages/super/SystemHealth.jsx` | Chama `GET /api/system/health`, cards por serviço |
| Login | `pages/admin/Login.jsx` | Captcha (soma), logo via branding |
| Logos estáticos | `public/logo-centerspot.png`, `faveicon.png` | Fallback quando sem logo custom |

**Navegação Super Admin (correta — só abas no topo):**

| Aba | Rota |
|-----|------|
| Visão geral | `/super` |
| Empresas | `/super/empresas` |
| Atualizar sistema | `/super/atualizar` |
| Backups | `/super/backups` |
| Diagnóstico | `/super/system` |
| Publicar atualização | `/super/publicar-atualizacao` |

**Sidebar tenant:** apenas link **“Painel Super Admin”** → `/super` (sem item “Diagnóstico” duplicado).

### 2.4 UI / branding (sessões anteriores + Fase 2)

- Tema padrão **azul** CenterSpot (não verde).
- Login: card branco, logo colorida, captcha matemático.
- Sidebar: logo branca (filtro CSS); nome da empresa ao lado foi testado e **removido**.
- Migration `018_empresa_branding.js`: `empresas.logo_url`, `favicon_url`, `empresa_configs` branding.

**Por que ainda pode aparecer verde em algum ambiente:**

1. Tema salvo em `empresa_configs` (`config_type = aparencia`) com paleta verde legada.
2. `localStorage` chave `hotspot_theme_centerspot_v2` com valores antigos.
3. Frontend em produção sem rebuild (`dist` antigo).

**Como resetar após deploy:**

1. Configurações → Aparência → preset **CenterSpot** → Salvar.
2. Ou limpar `localStorage.hotspot_theme_centerspot_v2` + hard refresh.
3. Conferir `https://DOMINIO/logo-centerspot.png` (deve retornar 200 após build).

### 2.5 Fase 3 — Mercado Pago Split

**Status: PAUSADA** (decisão do usuário).

- MP **legado** (Checkout API / `POST /v1/payments`) continua como está — **não alterar** `pagamentoController` para split sem GO.
- Homologação sandbox marketplace: **NO-GO** (sem `.env.local` / credenciais `MP_*`).
- Artefatos existentes: `scripts/mp-marketplace-smoke-test.js`, `README-mp-smoke-test.md`, relatórios em `backend/reports/` (gitignored).

---

## 3. O que funciona hoje (validado ou com alto grau de confiança)

### 3.1 Produção (feedback do usuário)

- Rota `/super/system` carrega.
- API de health responde após deploy/restart (cards: mysql, pm2, freeradius, nginx, evolution, wireguard, disk, memory, uptime).
- Layout Super Admin com abas no topo.
- Sidebar sem duplicar “Diagnóstico”.

### 3.2 Local (testes do agente)

- `GET /api/system/health` com JWT `super_admin` → **200** + JSON com 9 checks.
- Sem token → **401** (não 404).
- Processo antigo na porta 3001 sem código novo → **404** `Cannot GET /api/system/health` (prova necessidade de restart).

### 3.3 Funcionalidades core (pré-existentes + Fase 2)

Assumidas funcionais se migrations e serviços estiverem ok — **confirmar com checklist**:

- Login admin + captcha
- Multi-tenant (`switch-empresa`, JWT com `empresa_id`)
- CRUD empresas (super_admin)
- MikroTik, planos, portais, campanhas
- RADIUS (usuários, sessões)
- Mercado Pago legado (config + fluxo público pagamento)
- WhatsApp / Evolution (depende de API externa)
- WireGuard (depende de wg-easy)
- Backups super admin (`/api/system-backup`)
- Auditoria grava em MySQL (sem UI)

---

## 4. O que ainda falta / incrementar

### 4.1 Deploy e operações (prioridade alta)

Produção precisa estar alinhada ao `main` mais recente (`184d98f` ou posterior).

```bash
# No servidor (/var/www/hotspot ou equivalente)
cd /var/www/hotspot
git pull origin main

# Migrations (rodar se ainda não rodaram)
cd hotspot/backend
node migrations/016_audit_logs.js
node migrations/017_admins_soft_delete.js
node migrations/018_empresa_branding.js

# Backend
npm ci
pm2 restart <nome-processo-backend>   # ex.: hotspot-backend

# Frontend
cd ../frontend
npm ci
npm run build
# Publicar dist/ conforme Nginx (geralmente servir frontend/dist)
```

**Validação pós-deploy:**

```bash
# Deve retornar 401 (não 404)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/api/system/health

# Com token super_admin (gerar via login ou script)
curl -s -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:3001/api/system/health | head -c 400
```

### 4.2 Homologação funcional (prioridade alta)

Usar **`hotspot/docs/CHECKLIST-TESTES-FUNCIONAIS.md`** — 20 itens na ordem sugerida.

Preencher por ciclo:

- Ambiente de teste (URL, branch, responsável)
- Evidências por item
- Tabela de problemas (P-001…)

Itens que costumam falhar sem config externa:

| Item | Dependência |
|------|-------------|
| 7 — RouterOS | MikroTik acessível (VPN?) |
| 13 — Sessão RADIUS | FreeRADIUS + NAS |
| 14 — MP legado | Credenciais TEST + webhook público |
| 15 — WhatsApp | Evolution API online |
| 16 — WireGuard | wg-easy / `WG_EASY_URL` |
| 18 — Backups | `mysqldump`, disco em `/var/www/hotspot/backups` |

### 4.3 Branding / aparência (prioridade média)

- [ ] Confirmar build frontend em produção com `logo-centerspot.png`
- [ ] Resetar tema verde legado por empresa (Aparência → CenterSpot → Salvar)
- [ ] Testar upload logo/favicon em Configurações → Aparência (`BrandingPanel`)
- [ ] Validar login público com branding `default`

### 4.4 Auditoria (prioridade média)

- [ ] Migration 016 aplicada em produção
- [ ] Validar inserts: `SELECT * FROM audit_logs ORDER BY id DESC LIMIT 20`
- [ ] **Futuro:** tela ou API `GET /api/audit-logs` para super_admin (não existe hoje)

### 4.5 Melhorias de produto (prioridade baixa / backlog)

| Item | Descrição |
|------|-----------|
| Tela de auditoria | Listagem filtrada por empresa/data/ação |
| Menu pagamentos no sidebar | Rota existe `/admin/:slug/pagamentos` mas não está no menu |
| ThemeContext linha 78 | Se `remote` for verde legado, não regravar no localStorage (bug menor já mitigado parcialmente) |
| Homologação MP Split Fase 3 | Só após credenciais sandbox + GO explícito |
| Testes automatizados health | Script CI que chama `/api/system/health` |
| Documentar processo OTA | `/super/atualizar` + `system-update` |

---

## 5. Mapa técnico rápido (para o agente amanhã)

### 5.1 Diagnóstico — ponta a ponta

```
Frontend: /super/system
  → SystemHealth.jsx
  → fetch('/api/system/health', { Authorization: Bearer <token> })

Backend:
  server.js: app.use("/api/system", systemRoutes)
  systemRoutes.js: router.use(auth, authorize('super_admin')); router.get('/health', getHealth)
  systemHealthController.js: 9 checks, sempre res.status(200)
```

**Erros comuns:**

| Sintoma | Causa provável |
|---------|----------------|
| `Cannot GET /api/system/health` | Backend antigo sem restart |
| `403: Token inválido` | JWT_SECRET divergente (corrigido no código; redeploy necessário) |
| `403: Permissão insuficiente` | Usuário não é `super_admin` |
| Cards vazios / erro genérico | Ver Network → status HTTP e body JSON |
| Tema verde / sem logo | `dist` antigo ou tema salvo no banco/localStorage |

### 5.2 Mercado Pago — dual config (atenção)

| Onde | Uso |
|------|-----|
| `empresa_configs` tipo `mercadopago` | UI `ConfiguracaoMercadoPago.jsx` |
| `config_mercadopago` | Rota `/api/config-mercadopago` (legado) |

Ao testar pagamentos, confirmar **qual fonte** o `pagamentoController` lê para a empresa de teste.

### 5.3 Migrations pendentes em produção

| Arquivo | Tabela / efeito |
|---------|-----------------|
| `016_audit_logs.js` | `audit_logs` |
| `017_admins_soft_delete.js` | soft delete em `admins` |
| `018_empresa_branding.js` | branding empresa |

Sem `016`, auditoria falha silenciosamente (log warn no backend).

---

## 6. Estrutura de pastas relevante

```text
Hotspot-WhatsApp/
├── docs/
│   └── ARQUITETURA-COMPLETA.md
├── install.sh
├── start-local.ps1
└── hotspot/
    ├── docs/
    │   ├── CHECKLIST-TESTES-FUNCIONAIS.md   ← testes manuais
    │   └── ESTADO-PROJETO-HANDOFF.md         ← este arquivo
    ├── backend/
    │   ├── server.js
    │   ├── migrations/ 016, 017, 018
    │   └── src/
    │       ├── config/app.js
    │       ├── controllers/systemHealthController.js
    │       ├── routes/systemRoutes.js
    │       └── utils/audit.js
    └── frontend/
        ├── src/pages/super/SystemHealth.jsx
        ├── src/components/admin/SuperAdminLayout.jsx
        └── public/logo-centerspot.png
```

---

## 7. Plano sugerido para amanhã

### Manhã — estabilizar produção

1. `git pull` + migrations 016–018 + `pm2 restart` + `npm run build` frontend.
2. Validar curl `/api/system/health` (401/200).
3. Abrir `/super/system` — só cards, sem tabela duplicada.
4. Resetar tema CenterSpot em uma empresa de teste.

### Tarde — homologação

5. Executar checklist itens 1–10 (admin + portal + LGPD).
6. Executar itens 11–16 se infra disponível (RADIUS, MP TEST, WhatsApp, VPN).
7. Registrar problemas na seção P-xxx do checklist.
8. Item 20 — auditoria via SQL.

### Não fazer (até novo pedido)

- Implementar Fase 3 MP Split / `application_fee`
- Alterar `pagamentoController` para marketplace
- Commitar `.env`, reports, tokens

---

## 8. Comandos úteis (dev local Windows)

```powershell
# Backend
cd hotspot\backend
npm start                    # porta 3001 (ver .env PORT)

# Frontend
cd hotspot\frontend
npm run dev                  # porta 5173, proxy /api → 3001

# Token de teste (com .env carregado)
node -e "require('dotenv').config(); const j=require('jsonwebtoken'); console.log(j.sign({id:1,role:'super_admin',email:'t@test.com'}, process.env.JWT_SECRET,{expiresIn:'1h'}))"
```

---

## 9. Contatos de contexto da conversa

- Usuário pausou **Fase 3 Mercado Pago Split**; legado MP é prioridade baixa mas deve continuar funcionando.
- Push GitHub ≠ deploy automático — sempre explicar passo de servidor.
- CT130 / produção: diagnóstico passou a funcionar; duplicação cards+tabela corrigida em `184d98f`.
- Ambiente local às vezes ficou com processo Node antigo na 3001 (404 na rota nova).

---

## 10. Histórico deste documento

| Versão | Data | Notas |
|--------|------|-------|
| 1.0 | 23/05/2026 | Handoff fim do dia — Fase 2, health, UX super admin, checklist |

---

*Para retomar: ler este arquivo + `CHECKLIST-TESTES-FUNCIONAIS.md` + últimos commits em `git log -15 --oneline`.*
