#!/usr/bin/env node
/**
 * Smoke test — Mercado Pago Marketplace (SANDBOX)
 *
 * Valida OAuth do seller, application_fee em PIX/cartão, GET payment e erro 2059 com token manual.
 *
 * Credenciais: somente backend/.env.local ou variáveis de ambiente.
 * Não grava tokens em arquivos versionados (relatório mascara valores).
 *
 * Uso:
 *   cd hotspot/backend
 *   cp scripts/mp-marketplace-smoke-test.env.example .env.local
 *   # preencha .env.local
 *   node scripts/mp-marketplace-smoke-test.js
 *
 * OAuth (se não tiver MP_SELLER_ACCESS_TOKEN):
 *   O script imprime a URL de autorização. Após autorizar, cole MP_OAUTH_CODE no .env.local e rode de novo.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const BACKEND_ROOT = path.join(__dirname, '..');
const ENV_LOCAL = path.join(BACKEND_ROOT, '.env.local');

// .env.local tem prioridade; .env só preenche chaves ausentes
require('dotenv').config({ path: ENV_LOCAL });
require('dotenv').config({ path: path.join(BACKEND_ROOT, '.env') });

const MP_API = (process.env.MP_API_BASE || 'https://api.mercadopago.com').replace(/\/$/, '');
const MP_AUTH = 'https://auth.mercadopago.com.br';

const report = {
  startedAt: new Date().toISOString(),
  mode: 'sandbox',
  environment: {},
  tests: [],
  summary: { passed: 0, failed: 0, skipped: 0, warnings: 0 },
  payments: { pixId: null, cardId: null },
};

function maskSecret(value, visible = 6) {
  if (!value || typeof value !== 'string') return '(vazio)';
  if (value.length <= visible + 2) return '***';
  return `${value.slice(0, visible)}…${value.slice(-4)}`;
}

function envBool(name, defaultFalse = false) {
  const v = (process.env[name] || '').trim().toLowerCase();
  if (!v) return defaultFalse;
  return v === '1' || v === 'true' || v === 'yes';
}

function parseAmount(name, fallback) {
  const n = parseFloat(process.env[name] || String(fallback), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function recordTest(id, title, status, message, details = null) {
  report.tests.push({
    id,
    title,
    status,
    message,
    at: new Date().toISOString(),
    details: details || undefined,
  });
  if (status === 'pass') report.summary.passed += 1;
  else if (status === 'fail') report.summary.failed += 1;
  else if (status === 'skip') report.summary.skipped += 1;
  else if (status === 'warn') report.summary.warnings += 1;
}

function mpErrorSummary(err) {
  const data = err.response?.data;
  if (!data) return err.message;
  const causes = Array.isArray(data.cause) ? data.cause : [];
  const codes = causes.map((c) => c.code).filter(Boolean);
  const msgs = causes.map((c) => c.description || c.message).filter(Boolean);
  return {
    httpStatus: err.response?.status,
    message: data.message || err.message,
    error: data.error,
    causeCodes: codes,
    causeMessages: msgs,
    raw: data,
  };
}

function hasErrorCode(errSummary, code) {
  if (!errSummary?.causeCodes) return false;
  return errSummary.causeCodes.includes(code) || errSummary.causeCodes.includes(String(code));
}

async function exchangeOAuthToken({ clientId, clientSecret, redirectUri, code, refreshToken }) {
  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);

  if (refreshToken) {
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
  } else {
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', redirectUri);
  }

  const { data } = await axios.post(`${MP_API}/oauth/token`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    timeout: 20000,
  });
  return data;
}

function buildAuthorizeUrl(clientId, redirectUri) {
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    platform_id: 'mp',
    state,
    redirect_uri: redirectUri,
  });
  return `${MP_AUTH}/authorization?${params.toString()}`;
}

async function getUsersMe(accessToken) {
  const { data } = await axios.get(`${MP_API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 15000,
  });
  return data;
}

async function createCardToken(publicKey, card) {
  const url = `${MP_API}/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`;
  const { data } = await axios.post(
    url,
    {
      card_number: card.number,
      security_code: card.cvv,
      expiration_month: card.expMonth,
      expiration_year: card.expYear,
      cardholder: {
        name: card.holderName,
        identification: { type: 'CPF', number: card.cpf },
      },
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 20000 }
  );
  return data;
}

async function createPayment(accessToken, body, idempotencyKey) {
  const { data, status } = await axios.post(`${MP_API}/v1/payments`, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey || crypto.randomUUID(),
    },
    timeout: 45000,
    validateStatus: () => true,
  });
  return { data, status };
}

async function getPayment(accessToken, paymentId) {
  const { data, status } = await axios.get(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeout: 20000,
    validateStatus: () => true,
  });
  return { data, status };
}

async function resolveSellerToken() {
  const clientId = process.env.MP_MARKETPLACE_CLIENT_ID?.trim();
  const clientSecret = process.env.MP_MARKETPLACE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.MP_OAUTH_REDIRECT_URI?.trim();
  const directToken = process.env.MP_SELLER_ACCESS_TOKEN?.trim();
  const oauthCode = process.env.MP_OAUTH_CODE?.trim();
  const refreshToken = process.env.MP_OAUTH_REFRESH_TOKEN?.trim();

  if (directToken) {
    return { token: directToken, source: 'MP_SELLER_ACCESS_TOKEN' };
  }

  if (!clientId || !clientSecret) {
    throw new Error('Defina MP_SELLER_ACCESS_TOKEN ou MP_MARKETPLACE_CLIENT_ID + MP_MARKETPLACE_CLIENT_SECRET');
  }

  if (refreshToken) {
    if (!redirectUri) throw new Error('MP_OAUTH_REDIRECT_URI obrigatório com refresh_token');
    const data = await exchangeOAuthToken({ clientId, clientSecret, redirectUri, refreshToken });
    return {
      token: data.access_token,
      source: 'oauth_refresh',
      publicKey: data.public_key,
      userId: data.user_id,
      liveMode: data.live_mode,
      expiresIn: data.expires_in,
    };
  }

  if (oauthCode) {
    if (!redirectUri) throw new Error('MP_OAUTH_REDIRECT_URI obrigatório com MP_OAUTH_CODE');
    const data = await exchangeOAuthToken({ clientId, clientSecret, redirectUri, code: oauthCode });
    return {
      token: data.access_token,
      source: 'oauth_code',
      publicKey: data.public_key,
      userId: data.user_id,
      liveMode: data.live_mode,
      expiresIn: data.expires_in,
    };
  }

  if (redirectUri) {
    const url = buildAuthorizeUrl(clientId, redirectUri);
    return { needsAuth: true, authorizeUrl: url };
  }

  throw new Error('Sem token seller: use MP_SELLER_ACCESS_TOKEN, MP_OAUTH_CODE ou MP_OAUTH_REFRESH_TOKEN');
}

async function testManualToken2059(manualToken, amount, applicationFee, payerEmail) {
  if (envBool('MP_SKIP_MANUAL_2059')) {
    recordTest('manual_2059', 'Token manual + application_fee (erro 2059)', 'skip', 'MP_SKIP_MANUAL_2059=1');
    return;
  }
  if (!manualToken) {
    recordTest('manual_2059', 'Token manual + application_fee (erro 2059)', 'skip', 'MP_MANUAL_ACCESS_TOKEN não definido');
    return;
  }

  const body = {
    transaction_amount: amount,
    application_fee: applicationFee,
    description: 'CenterSpot smoke — manual token (esperado 2059)',
    payment_method_id: 'pix',
    payer: { email: payerEmail },
    external_reference: `smoke_manual_${Date.now()}`,
  };

  try {
    const { data, status } = await createPayment(manualToken, body);
    if (status >= 400) {
      const codes = (data.cause || []).map((c) => c.code);
      const is2059 =
        codes.includes(2059) ||
        codes.includes('2059') ||
        JSON.stringify(data).toLowerCase().includes('application_fee') &&
          JSON.stringify(data).toLowerCase().includes('oauth');

      if (is2059) {
        recordTest('manual_2059', 'Token manual + application_fee (erro 2059)', 'pass', 'API rejeitou application_fee sem OAuth (esperado)', {
          httpStatus: status,
          causeCodes: codes,
          message: data.message,
        });
      } else {
        recordTest('manual_2059', 'Token manual + application_fee (erro 2059)', 'fail', 'Erro diferente do 2059 esperado', {
          httpStatus: status,
          response: data,
        });
      }
      return;
    }

    recordTest(
      'manual_2059',
      'Token manual + application_fee (erro 2059)',
      'warn',
      `Pagamento criado (id=${data.id}) — token manual aceitou application_fee; confirme se é conta marketplace/OAuth`,
      { paymentId: data.id, status: data.status }
    );
  } catch (err) {
    const summary = mpErrorSummary(err);
    if (hasErrorCode(summary, 2059) || String(summary.message || '').includes('application_fee')) {
      recordTest('manual_2059', 'Token manual + application_fee (erro 2059)', 'pass', 'Rejeição application_fee sem OAuth', summary);
    } else {
      recordTest('manual_2059', 'Token manual + application_fee (erro 2059)', 'fail', summary.message || 'Erro inesperado', summary);
    }
  }
}

async function testPixWithFee(sellerToken, amount, applicationFee, payerEmail) {
  if (envBool('MP_SKIP_PIX')) {
    recordTest('pix_fee', 'POST /v1/payments PIX + application_fee', 'skip', 'MP_SKIP_PIX=1');
    return null;
  }

  const body = {
    transaction_amount: amount,
    application_fee: applicationFee,
    description: 'CenterSpot smoke — PIX marketplace',
    payment_method_id: 'pix',
    payer: { email: payerEmail },
    external_reference: `smoke_pix_${Date.now()}`,
    metadata: {
      marketplace_mode: 'true',
      smoke_test: 'centerspot',
      saas_fee_amount: String(applicationFee),
    },
  };

  const { data, status } = await createPayment(sellerToken, body);
  if (status >= 400) {
    recordTest('pix_fee', 'POST /v1/payments PIX + application_fee', 'fail', data.message || `HTTP ${status}`, {
      httpStatus: status,
      cause: data.cause,
      error: data.error,
    });
    return null;
  }

  const feeInResponse = data.application_fee ?? data.fee_details;
  recordTest('pix_fee', 'POST /v1/payments PIX + application_fee', 'pass', `payment_id=${data.id} status=${data.status}`, {
    paymentId: data.id,
    status: data.status,
    application_fee_sent: applicationFee,
    application_fee_response: data.application_fee,
    hasQr: Boolean(data.point_of_interaction?.transaction_data?.qr_code),
  });

  if (applicationFee > 0 && data.application_fee == null) {
    recordTest('pix_fee_check', 'PIX — application_fee na resposta', 'warn', 'Campo application_fee ausente no POST; validar no GET', {});
  }

  report.payments.pixId = data.id;
  return data.id;
}

async function testCardWithFee(sellerToken, publicKey, amount, applicationFee, payerEmail, card) {
  if (envBool('MP_SKIP_CARD')) {
    recordTest('card_fee', 'POST /v1/payments cartão + application_fee', 'skip', 'MP_SKIP_CARD=1');
    return null;
  }

  if (!publicKey) {
    recordTest('card_fee', 'POST /v1/payments cartão + application_fee', 'skip', 'MP_SELLER_PUBLIC_KEY ausente (necessário para card_token)');
    return null;
  }

  let cardToken;
  try {
    const tokenData = await createCardToken(publicKey, card);
    cardToken = tokenData.id;
    if (!cardToken) throw new Error('card_token vazio');
    recordTest('card_token', 'POST /v1/card_tokens', 'pass', `token_id=${maskSecret(cardToken, 8)}`);
  } catch (err) {
    recordTest('card_token', 'POST /v1/card_tokens', 'fail', mpErrorSummary(err).message || err.message, mpErrorSummary(err));
    return null;
  }

  const body = {
    transaction_amount: amount,
    application_fee: applicationFee,
    token: cardToken,
    description: 'CenterSpot smoke — cartão marketplace',
    installments: 1,
    payment_method_id: 'master',
    payer: { email: payerEmail },
    external_reference: `smoke_card_${Date.now()}`,
    capture: true,
    binary_mode: false,
    metadata: { marketplace_mode: 'true', smoke_test: 'centerspot' },
  };

  const { data, status } = await createPayment(sellerToken, body);
  if (status >= 400) {
    recordTest('card_fee', 'POST /v1/payments cartão + application_fee', 'fail', data.message || `HTTP ${status}`, {
      httpStatus: status,
      cause: data.cause,
    });
    return null;
  }

  recordTest('card_fee', 'POST /v1/payments cartão + application_fee', 'pass', `payment_id=${data.id} status=${data.status}`, {
    paymentId: data.id,
    status: data.status,
    status_detail: data.status_detail,
    application_fee_sent: applicationFee,
    application_fee_response: data.application_fee,
  });

  report.payments.cardId = data.id;
  return data.id;
}

async function testGetPayment(sellerToken, paymentId, label) {
  if (!paymentId) {
    recordTest(`get_${label}`, `GET /v1/payments/{id} (${label})`, 'skip', 'Nenhum payment_id');
    return;
  }

  const { data, status } = await getPayment(sellerToken, paymentId);
  if (status >= 400) {
    recordTest(`get_${label}`, `GET /v1/payments/{id} (${label})`, 'fail', data.message || `HTTP ${status}`, { httpStatus: status });
    return;
  }

  recordTest(`get_${label}`, `GET /v1/payments/{id} (${label})`, 'pass', `status=${data.status}`, {
    id: data.id,
    status: data.status,
    transaction_amount: data.transaction_amount,
    application_fee: data.application_fee,
    fee_details: data.fee_details,
    net_received_amount: data.transaction_details?.net_received_amount,
    collector_id: data.collector_id,
  });
}

function printConsoleReport() {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log('  CenterSpot — MP Marketplace Smoke Test (SANDBOX)');
  console.log(line);
  console.log(`Início: ${report.startedAt}`);
  console.log(`API: ${MP_API}\n`);

  for (const t of report.tests) {
    const icon = { pass: '✓', fail: '✗', skip: '○', warn: '!' }[t.status] || '?';
    console.log(`  [${icon}] ${t.title}`);
    console.log(`      ${t.message}`);
  }

  console.log(`\n${line}`);
  console.log(
    `Resumo: ${report.summary.passed} ok | ${report.summary.failed} falha | ${report.summary.skipped} pulados | ${report.summary.warnings} avisos`
  );
  console.log(line);

  const failed = report.tests.filter((t) => t.status === 'fail');
  if (failed.length) {
    console.log('\nFalhas — ver relatório JSON para detalhes (sem tokens completos).\n');
    process.exitCode = 1;
  }
}

function writeReportFile() {
  const dir = path.resolve(BACKEND_ROOT, process.env.MP_REPORT_DIR || 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = path.join(dir, `mp-marketplace-smoke-${stamp}.json`);
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nRelatório salvo: ${file}`);
  console.log('(pasta reports/ está no .gitignore — não commitar)\n');
}

async function main() {
  const amount = parseAmount('MP_TEST_AMOUNT', 10);
  const applicationFee = parseAmount('MP_APPLICATION_FEE', 1);
  const payerEmail = (process.env.MP_TEST_PAYER_EMAIL || 'test_user@testuser.com').trim();

  if (applicationFee >= amount) {
    console.error('MP_APPLICATION_FEE deve ser menor que MP_TEST_AMOUNT');
    process.exit(1);
  }

  report.environment = {
    apiBase: MP_API,
    amount,
    applicationFee,
    payerEmail,
    clientId: maskSecret(process.env.MP_MARKETPLACE_CLIENT_ID),
    redirectUri: process.env.MP_OAUTH_REDIRECT_URI || '(não definido)',
    hasSellerToken: Boolean(process.env.MP_SELLER_ACCESS_TOKEN),
    hasOAuthCode: Boolean(process.env.MP_OAUTH_CODE),
    hasManualToken: Boolean(process.env.MP_MANUAL_ACCESS_TOKEN),
    hasPublicKey: Boolean(process.env.MP_SELLER_PUBLIC_KEY),
  };

  // ── 1. OAuth / seller token ──
  let seller;
  try {
    seller = await resolveSellerToken();
  } catch (err) {
    recordTest('oauth', 'Resolver token OAuth do seller', 'fail', err.message);
    printConsoleReport();
    writeReportFile();
    process.exit(1);
  }

  if (seller.needsAuth) {
    recordTest('oauth', 'Resolver token OAuth do seller', 'warn', 'Autorização necessária — URL abaixo');
    console.log('\n=== AUTORIZAÇÃO OAUTH (sandbox) ===\n');
    console.log('1. Abra no navegador (conta VENDEDOR de teste):\n');
    console.log(seller.authorizeUrl);
    console.log('\n2. Após autorizar, copie ?code=... da redirect_uri');
    console.log('3. Coloque em backend/.env.local: MP_OAUTH_CODE=...');
    console.log('4. Rode este script novamente.\n');
    printConsoleReport();
    writeReportFile();
    process.exit(2);
  }

  let sellerToken = seller.token;
  let publicKey = process.env.MP_SELLER_PUBLIC_KEY?.trim() || seller.publicKey;

  try {
    const me = await getUsersMe(sellerToken);
    const mode = me.live_mode === true ? 'PRODUÇÃO' : me.live_mode === false ? 'SANDBOX/TEST' : 'desconhecido';
    recordTest('oauth', 'Token seller (GET /users/me)', 'pass', `nickname=${me.nickname || me.id} modo=${mode}`, {
      id: me.id,
      nickname: me.nickname,
      live_mode: me.live_mode,
      tokenSource: seller.source,
    });
    if (me.live_mode === true) {
      recordTest('oauth_live', 'Ambiente do token', 'warn', 'Token parece PRODUÇÃO (live_mode=true). Use credenciais TEST para smoke.');
    }
  } catch (err) {
    recordTest('oauth', 'Token seller (GET /users/me)', 'fail', mpErrorSummary(err).message || err.message, mpErrorSummary(err));
    printConsoleReport();
    writeReportFile();
    process.exit(1);
  }

  // ── 5. Erro 2059 token manual ──
  await testManualToken2059(process.env.MP_MANUAL_ACCESS_TOKEN?.trim(), amount, applicationFee, payerEmail);

  // ── 2. PIX + fee ──
  const pixId = await testPixWithFee(sellerToken, amount, applicationFee, payerEmail);

  // ── 3. Cartão + fee ──
  const card = {
    number: (process.env.MP_TEST_CARD_NUMBER || '5031433215406351').replace(/\D/g, ''),
    cvv: (process.env.MP_TEST_CARD_CVV || '123').trim(),
    expMonth: parseInt(process.env.MP_TEST_CARD_EXP_MONTH || '11', 10),
    expYear: parseInt(process.env.MP_TEST_CARD_EXP_YEAR || '2030', 10),
    holderName: process.env.MP_TEST_CARDHOLDER_NAME || 'APRO',
    cpf: (process.env.MP_TEST_CARDHOLDER_CPF || '12345678909').replace(/\D/g, ''),
  };
  const cardId = await testCardWithFee(sellerToken, publicKey, amount, applicationFee, payerEmail, card);

  // ── 4. GET payments ──
  await testGetPayment(sellerToken, pixId, 'pix');
  await testGetPayment(sellerToken, cardId, 'card');

  report.sellerTokenSource = seller.source;
  report.recommendation =
    report.summary.failed === 0
      ? 'Sandbox OK para application_fee com token OAuth. Validar painel MP (app Marketplace) antes da Fase 3.'
      : 'Corrigir falhas antes de implementar Fase 3. Verifique app Marketplace, OAuth do seller e chaves TEST.';

  printConsoleReport();
  writeReportFile();
}

main().catch((err) => {
  console.error('\nErro fatal:', err.message);
  recordTest('fatal', 'Execução', 'fail', err.message);
  try {
    writeReportFile();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
