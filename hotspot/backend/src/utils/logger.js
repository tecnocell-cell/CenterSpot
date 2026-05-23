const appConfig = require('../config/app');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const minLevel = LEVELS[process.env.LOG_LEVEL || (appConfig.isProd ? 'info' : 'debug')] ?? 2;

function formatLine(level, context, message, meta) {
  const ts = new Date().toISOString();
  const ctx = context ? `[${context}]` : '';
  const base = `${ts} ${level.toUpperCase()} ${ctx} ${message}`.trim();
  if (meta !== undefined && meta !== null) {
    const extra = typeof meta === 'object' ? JSON.stringify(meta) : String(meta);
    return `${base} ${extra}`;
  }
  return base;
}

function log(level, context, message, meta) {
  if ((LEVELS[level] ?? 2) > minLevel) return;
  const line = formatLine(level, context, message, meta);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  error: (ctx, msg, meta) => log('error', ctx, msg, meta),
  warn: (ctx, msg, meta) => log('warn', ctx, msg, meta),
  info: (ctx, msg, meta) => log('info', ctx, msg, meta),
  debug: (ctx, msg, meta) => log('debug', ctx, msg, meta),
};
