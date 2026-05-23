/**
 * Configuração centralizada — preferir importar daqui em vez de process.env espalhado.
 */
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const projectRoot = process.env.PROJECT_ROOT || '/var/www/hotspot';

module.exports = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
  },

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'hotspotuser',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'hotspot',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  paths: {
    rootDir,
    projectRoot,
    backendDir: rootDir,
    backupsDir: process.env.BACKUPS_DIR || path.join(projectRoot, 'backups'),
    uploadsDir: path.join(rootDir, 'uploads'),
    certificadosDir: path.join(rootDir, 'certificados'),
    envFile: path.join(rootDir, '.env'),
    backupLog: process.env.BACKUP_LOG_PATH || '/var/log/centerspot-backup.log',
  },

  urls: {
    systemDomain: process.env.SYSTEM_DOMAIN || '',
    evolutionApi: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    updateServer: process.env.UPDATE_SERVER_URL || '',
    wireguardApi: process.env.WG_EASY_URL || 'http://localhost:51821',
  },

  evolution: {
    apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instance: process.env.EVOLUTION_INSTANCE || 'hotspot',
    timeoutMs: parseInt(process.env.EVOLUTION_TIMEOUT_MS || '8000', 10),
  },

  rateLimit: {
    login: {
      windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || String(15 * 60 * 1000), 10),
      max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5', 10),
    },
    auth: { windowMs: 15 * 60 * 1000, max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '100', 10) },
    payments: { windowMs: 60 * 1000, max: parseInt(process.env.RATE_LIMIT_PAYMENTS_MAX || '60', 10) },
    webhooks: { windowMs: 60 * 1000, max: parseInt(process.env.RATE_LIMIT_WEBHOOKS_MAX || '120', 10) },
    whatsapp: { windowMs: 60 * 1000, max: parseInt(process.env.RATE_LIMIT_WHATSAPP_MAX || '80', 10) },
  },

  upload: {
    maxImageBytes: parseInt(process.env.UPLOAD_MAX_IMAGE_BYTES || String(10 * 1024 * 1024), 10),
    maxVideoBytes: parseInt(process.env.UPLOAD_MAX_VIDEO_BYTES || String(50 * 1024 * 1024), 10),
    maxLogoBytes: parseInt(process.env.UPLOAD_MAX_LOGO_BYTES || String(2 * 1024 * 1024), 10),
  },

  health: {
    diskWarningPercent: parseInt(process.env.HEALTH_DISK_WARN_PERCENT || '85', 10),
    diskCriticalPercent: parseInt(process.env.HEALTH_DISK_CRIT_PERCENT || '95', 10),
    memoryWarningPercent: parseInt(process.env.HEALTH_MEM_WARN_PERCENT || '90', 10),
  },

  flags: {
    helmetEnabled: process.env.HELMET_ENABLED !== '0',
    auditEnabled: process.env.AUDIT_ENABLED !== '0',
  },
};
