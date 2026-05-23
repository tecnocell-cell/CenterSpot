const jwt = require('jsonwebtoken')
const appConfig = require('../config/app')

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization
  // Fallback: aceitar token via query param (ex: preview de portal em nova aba)
  const token = authHeader
    ? authHeader.split(' ')[1]
    : req.query.token || null;

  if (!token) return res.status(401).json({ error: 'Token não fornecido' })

  try {
    const decoded = jwt.verify(token, appConfig.jwt.secret)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido' })
  }
}
