const jwt = require('jsonwebtoken');

function signUser(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token em falta.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !['Administrador Master', 'Administrador', 'Admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Sem permissão.' });
  }
  next();
}

module.exports = { signUser, requireAuth, requireAdmin };
