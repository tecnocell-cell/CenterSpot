const { execSync } = require('child_process');
const os = require('os');
const axios = require('axios');
const db = require('../../db');
const appConfig = require('../config/app');
const logger = require('../utils/logger');

const IS_WIN = process.platform === 'win32';

const CHECK_ORDER = [
  'mysql',
  'pm2',
  'freeradius',
  'nginx',
  'evolution_api',
  'wireguard',
  'disk',
  'memory',
  'uptime',
];

function statusItem(name, state, detail = null, meta = {}) {
  return { name, state, detail, ...meta };
}

function runSafe(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.catch((err) => {
        logger.warn('health', `Check ${name} falhou`, err.message);
        return statusItem(name, 'offline', err.message || String(err));
      });
    }
    return Promise.resolve(result);
  } catch (err) {
    logger.warn('health', `Check ${name} falhou`, err.message);
    return Promise.resolve(statusItem(name, 'offline', err.message || String(err)));
  }
}

async function checkMysql() {
  await db.execute('SELECT 1');
  return statusItem('mysql', 'online');
}

function checkPm2() {
  if (IS_WIN) {
    return statusItem('pm2', 'warning', 'PM2 não verificado no Windows');
  }
  let out;
  try {
    out = execSync('pm2 jlist', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    return statusItem('pm2', 'warning', 'PM2 indisponível ou não instalado', {
      error: err.message,
    });
  }

  let list = [];
  try {
    list = JSON.parse(out || '[]');
  } catch {
    return statusItem('pm2', 'warning', 'Resposta PM2 inválida');
  }

  const hotspot = list.filter(
    (p) => p.name && (p.name.includes('hotspot') || p.name.includes('backend'))
  );
  const online = hotspot.filter((p) => p.pm2_env?.status === 'online').length;

  if (hotspot.length === 0) {
    return statusItem('pm2', 'warning', 'Nenhum processo hotspot no PM2', {
      processes: list.length,
    });
  }
  if (online < hotspot.length) {
    return statusItem('pm2', 'warning', `${online}/${hotspot.length} processos online`, {
      processes: hotspot.map((p) => ({ name: p.name, status: p.pm2_env?.status })),
    });
  }
  return statusItem('pm2', 'online', `${online} processo(s)`, {
    processes: hotspot.map((p) => p.name),
  });
}

function checkService(name, systemctlUnit) {
  if (IS_WIN) {
    return statusItem(name, 'warning', 'Verificação de serviço omitida no Windows');
  }
  try {
    execSync(`systemctl is-active --quiet ${systemctlUnit}`, {
      timeout: 3000,
      stdio: 'pipe',
    });
    return statusItem(name, 'online');
  } catch {
    try {
      execSync(`service ${systemctlUnit} status`, { timeout: 3000, stdio: 'pipe' });
      return statusItem(name, 'online');
    } catch {
      return statusItem(name, 'offline', `${systemctlUnit} inativo ou não encontrado`);
    }
  }
}

async function checkEvolution() {
  const url = appConfig.evolution?.apiUrl || appConfig.urls?.evolutionApi || '';
  if (!url) {
    return statusItem('evolution_api', 'warning', 'EVOLUTION_API_URL não configurada');
  }
  try {
    const res = await axios.get(`${String(url).replace(/\/$/, '')}/`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    if (res.status >= 200 && res.status < 500) {
      return statusItem('evolution_api', 'online', url);
    }
    return statusItem('evolution_api', 'warning', `HTTP ${res.status}`, { url });
  } catch (err) {
    return statusItem('evolution_api', 'offline', err.message || 'Indisponível', { url });
  }
}

async function checkWireguard() {
  const url = appConfig.urls?.wireguardApi || '';
  if (!url) {
    return statusItem('wireguard', 'warning', 'WG_EASY_URL não configurada');
  }
  try {
    const res = await axios.get(url, { timeout: 5000, validateStatus: () => true });
    if (res.status >= 200 && res.status < 500) {
      return statusItem('wireguard', 'online', url);
    }
    return statusItem('wireguard', 'warning', `HTTP ${res.status}`, { url });
  } catch (err) {
    return statusItem('wireguard', 'offline', err.message || 'API indisponível', { url });
  }
}

function checkDisk() {
  if (IS_WIN) {
    return statusItem('disk', 'warning', 'Verificação de disco omitida no Windows');
  }
  try {
    const out = execSync("df -P / | tail -1 | awk '{print $5}'", {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    const pct = parseInt(String(out).replace('%', ''), 10);
    if (!Number.isFinite(pct)) {
      return statusItem('disk', 'warning', 'Não foi possível ler uso do disco');
    }
    if (pct >= appConfig.health.diskCriticalPercent) {
      return statusItem('disk', 'offline', `${pct}% usado`);
    }
    if (pct >= appConfig.health.diskWarningPercent) {
      return statusItem('disk', 'warning', `${pct}% usado`);
    }
    return statusItem('disk', 'online', `${pct}% usado`);
  } catch (err) {
    return statusItem('disk', 'warning', err.message || 'Falha ao verificar disco');
  }
}

function checkMemory() {
  const total = os.totalmem();
  const free = os.freemem();
  const usedPct = Math.round(((total - free) / total) * 100);
  if (usedPct >= appConfig.health.memoryWarningPercent) {
    return statusItem('memory', 'warning', `${usedPct}% em uso`, {
      free_mb: Math.round(free / 1024 / 1024),
      total_mb: Math.round(total / 1024 / 1024),
    });
  }
  return statusItem('memory', 'online', `${usedPct}% em uso`, {
    free_mb: Math.round(free / 1024 / 1024),
    total_mb: Math.round(total / 1024 / 1024),
  });
}

function checkUptime() {
  const sec = Math.floor(os.uptime());
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return statusItem('uptime', 'online', `${h}h ${m}m`, { seconds: sec });
}

function aggregateState(checks) {
  if (checks.some((c) => c.state === 'offline')) return 'offline';
  if (checks.some((c) => c.state === 'warning')) return 'warning';
  return 'online';
}

function orderChecks(checks) {
  const byName = Object.fromEntries(checks.map((c) => [c.name, c]));
  return CHECK_ORDER.map((name) => byName[name]).filter(Boolean);
}

exports.getHealth = async (req, res) => {
  const results = await Promise.all([
    runSafe('mysql', checkMysql),
    runSafe('pm2', () => checkPm2()),
    runSafe('freeradius', () => checkService('freeradius', 'freeradius')),
    runSafe('nginx', () => checkService('nginx', 'nginx')),
    runSafe('evolution_api', checkEvolution),
    runSafe('wireguard', checkWireguard),
    runSafe('disk', () => checkDisk()),
    runSafe('memory', () => checkMemory()),
    runSafe('uptime', () => checkUptime()),
  ]);

  const checks = orderChecks(results);
  const overall = aggregateState(checks);

  res.status(200).json({
    status: overall,
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    checks,
  });
};
