# Smoke test — Mercado Pago Marketplace (sandbox)

Valida OAuth do seller, `application_fee` em PIX/cartão, `GET /v1/payments/{id}` e erro **2059** com token manual.

## Segurança

- Credenciais **somente** em `backend/.env.local` ou variáveis de ambiente.
- `.env.local` e `backend/reports/` estão no `.gitignore`.
- Relatório JSON **mascara** tokens; não commitar relatórios.

## Preparação no painel MP

1. Criar aplicação **Marketplace** + **Checkout API** em [Suas integrações](https://www.mercadopago.com.br/developers/panel/app).
2. Configurar **Redirect URL** (pode ser `http://localhost:9999/callback` só para o teste).
3. Criar **usuário de teste vendedor** e autorizar OAuth.
4. Usar credenciais **TEST** (`TEST-...`) no `.env.local`.

## Uso

```bash
cd hotspot/backend
cp scripts/mp-marketplace-smoke-test.env.example .env.local
# Edite .env.local

npm run mp:smoke
# ou: node scripts/mp-marketplace-smoke-test.js
```

### Obter token do seller

**Opção A — rápida:** após OAuth no painel, cole `MP_SELLER_ACCESS_TOKEN` no `.env.local`.

**Opção B — fluxo completo:**

1. Preencha `MP_MARKETPLACE_CLIENT_ID`, `MP_MARKETPLACE_CLIENT_SECRET`, `MP_OAUTH_REDIRECT_URI`.
2. Rode o script; ele imprime a URL de autorização.
3. Autorize com a conta **vendedor** de teste.
4. Copie `code` da URL de retorno para `MP_OAUTH_CODE` e rode de novo.

### Teste erro 2059

Preencha `MP_MANUAL_ACCESS_TOKEN` com um access token **manual** (não OAuth) da mesma conta ou de teste. O script espera rejeição ao usar `application_fee`.

## Relatório

- Console: resumo pass/fail/skip.
- Arquivo: `backend/reports/mp-marketplace-smoke-YYYY-MM-DDTHH-MM-SS.json`

## Variáveis principais

| Variável | Descrição |
|----------|-----------|
| `MP_MARKETPLACE_CLIENT_ID` | Client ID da app integradora |
| `MP_MARKETPLACE_CLIENT_SECRET` | Client secret da app |
| `MP_OAUTH_REDIRECT_URI` | Igual ao cadastrado no painel |
| `MP_SELLER_ACCESS_TOKEN` | Token OAuth do vendedor (seller) |
| `MP_MANUAL_ACCESS_TOKEN` | Token manual para teste 2059 |
| `MP_SELLER_PUBLIC_KEY` | Public key do seller (cartão) |
| `MP_TEST_AMOUNT` | Valor em R$ (padrão 10) |
| `MP_APPLICATION_FEE` | Comissão em R$ (padrão 1) |

Documentação: [Split marketplace](https://www.mercadopago.com.br/developers/en/docs/split-payments/integration-configuration/integrate-marketplace) · [Create payment](https://www.mercadopago.com.mx/developers/en/reference/online-payments/checkout-api-payments/create-payment/post)
