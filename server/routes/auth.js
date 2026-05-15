const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');
const { signUser, requireAuth } = require('../middleware/auth');
const { audit } = require('../utils/audit');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    const { rows } = await pool.query('select * from users where lower(email)=lower($1) limit 1', [email]);
    const user = rows[0];
    if (!user || !user.active) return res.status(401).json({ error: 'Credenciais inválidas.' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' });
    const token = signUser(user);
    await audit(user.id, 'login', 'user', user.id, { email });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, is_master: user.is_master } });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query('select id,name,email,role,active,is_master,created_at from users where id=$1', [req.user.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Utilizador não encontrado.' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
