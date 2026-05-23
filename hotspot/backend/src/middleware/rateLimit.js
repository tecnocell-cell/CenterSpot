const rateLimit = require('express-rate-limit');
const appConfig = require('../config/app');

function createLimiter({ windowMs, max, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: message || { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
    handler: (req, res, _next, options) => {
      res.status(options.statusCode).json(options.message);
    },
  });
}

const loginLimiter = createLimiter({
  windowMs: appConfig.rateLimit.login.windowMs,
  max: appConfig.rateLimit.login.max,
  skipSuccessfulRequests: true,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

const authLimiter = createLimiter({
  windowMs: appConfig.rateLimit.auth.windowMs,
  max: appConfig.rateLimit.auth.max,
});

const paymentsLimiter = createLimiter({
  windowMs: appConfig.rateLimit.payments.windowMs,
  max: appConfig.rateLimit.payments.max,
});

const webhooksLimiter = createLimiter({
  windowMs: appConfig.rateLimit.webhooks.windowMs,
  max: appConfig.rateLimit.webhooks.max,
});

const whatsappLimiter = createLimiter({
  windowMs: appConfig.rateLimit.whatsapp.windowMs,
  max: appConfig.rateLimit.whatsapp.max,
});

module.exports = {
  loginLimiter,
  authLimiter,
  paymentsLimiter,
  webhooksLimiter,
  whatsappLimiter,
};
