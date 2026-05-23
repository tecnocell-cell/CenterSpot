module.exports = (...allowedRoles) => {
  const roles = allowedRoles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Permissão insuficiente',
        message: `Requer uma das roles: ${roles.join(', ')}. Sua role: ${req.user.role || 'desconhecida'}`,
      });
    }
    next();
  };
};
