const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const axios = require('axios');
const db = require('../../db');
const appConfig = require('../config/app');
const logger = require('../utils/logger');

function statusItem(name, state, detail = null, meta = {}) {
  return { name, state, detail, ...meta };
}

async function checkMysql() {
  try {
    await db.execute('SELECT 1');
    return statusItem('mysql', 'online');
  } catch (err) {
    return statusItem('mysql', 'offline', err.message);
  }
}

function checkPm2() {
  try {
    const out = execSync('pm2 jlist 2>/dev/null || pm2 jlist', {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const list = JSON.parse(out || '[]');
    const hotspot = list.filter(
      (p) => p.name && (p.name.includes('hotspot') || p.name.includes('backend'))
    );
    const online = hotspot.filter((p) => p.pm2_env?.status === 'online').length;
    if (hotspot.length === 0) {
      return statusItem('pm2', 'warning', 'Nenhum processo hotspot no PM2', { processes: list.length });
    }
    if (online < hotspot.length) {
      return statusItem('pm2', 'warning', `${online}/${hotspot.length} processos online`, {
        processes: hotspot.map((p) => ({ name: p.name, status: p.pm2_env?.status })),
      });
    }
    return statusItem('pm2', 'online', `${online} processo(s)`, {
      processes: hotspot.map((p) => p.name),
    });
  } catch (err) {
    return statusItem('pm2', 'warning', 'PM2 indisponível ou não instalado', { error: err.message });
  }
}

function checkService(name, systemctlUnit) {
  try {
    execSync(`systemctl is-active --quiet ${systemctlUnit}`, { timeout: 3000 });
    return statusItem(name, 'online');
  } catch {
    try {
      execSync(`service ${systemctlUnit} status`, { timeout: 3000, stdio: 'pipe' });
      return statusItem(name, 'online');
    } catch (err) {
      return statusItem(name, 'offline', `${systemctlUnit} inativo`);
    }
  }
}

async function checkEvolution() {
  const url = appConfig.evolution.apiUrl;
  try {
    await axios.get(`${url.replace(/\/$/, '')}/`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    return statusItem('evolution_api', 'online', url);
  } catch (err) {
    return statusItem('evolution_api', 'offline', err.message, { url });
  }
}

async function checkWireguard() {
  const url = appConfig.urls.wireguardApi;
  try {
    await axios.get(url, { timeout: 5000, validateStatus: () => true });
    return statusItem('wireguard', 'online', url);
  } catch (err) {
    return statusItem('wireguard', 'warning', 'API wg-easy indisponível', { error: err.message });
  }
}

function checkDisk() {
  try {
    if (process.platform === 'win32') {
      return statusItem('disk', 'online', 'Verificação de disco omitida no Windows');
    }
    const out = execSync("df -P / | tail -1 | awk '{print $5}'", { encoding: 'utf8' }).trim();
    const pct = parseInt(out.replace('%', ''), 10);
    if (pct >= appConfig.health.diskCriticalPercent) {
      return statusItem('disk', 'offline', `${pct}% usado`);
    }
    if (pct >= appConfig.health.diskWarningPercent) {
      return statusItem('disk', 'warning', `${pct}% usado`);
    }
    return statusItem('disk', 'online', `${pct}% usado`);
  } catch (err) {
    return statusItem('disk', 'warning', err.message);
  }
}

function checkMemory() {
  const total = os.totalmem();
  const free = os.freemem();
  const usedPct = Math.round(((total - free) / total) * 100);
  if (usedPct >= appConfig.health.memoryWarningPercent) {
    return statusItem('memory', 'warning', `${usedPct}% em uso`);
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

exports.getHealth = async (req, res) => {
  try {
    const checks = await Promise.all([
      checkMysql(),
      Promise.resolve(checkPm2()),
      Promise.resolve(checkService('freeradius', 'freeradius')),
      Promise.resolve(checkService('nginx', 'nginx')),
      checkEvolution(),
      checkWireguard(),
      Promise.resolve(checkDisk()),
      Promise.resolve(checkMemory()),
      Promise.resolve(checkUptime()),
    ]);

    const overall = aggregateState(checks);

    res.json({
      status: overall,
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      checks,
    });
  } catch (err) {
    logger.error('health', 'Erro no healthcheck', err.message);
    res.status(500).json({ status: 'offline', error: 'Erro ao executar diagnóstico' });
  }
};
