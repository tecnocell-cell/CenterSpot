/** Normaliza IP do cliente para auditoria e logs */
module.exports = function requestIp(req, res, next) {
  const forwarded = req.headers['x-forwarded-for'];
  req.auditIp =
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
    req.ip ||
    req.socket?.remoteAddress ||
    null;
  next();
};
