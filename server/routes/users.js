const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { audit } = require('../utils/audit');
const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const { rows } = await pool.query('select id,name,email,role,active,is_master,created_at from users order by created_at asc');
  res.json({ users: rows });
});

router.post('/', async (req, res) => {
  const { name, email, role = 'Comercial', password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      `insert into users (name,email,role,password_hash,active,is_master) values ($1,$2,$3,$4,true,false)
       returning id,name,email,role,active,is_master,created_at`,
      [name, String(email).toLowerCase(), role, passwordHash]
    );
    await audit(req.user.id, 'create', 'user', rows[0].id, { email: rows[0].email, role });
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Já existe um utilizador com este email.' });
    throw err;
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, active, password } = req.body;
  const current = await pool.query('select * from users where id=$1', [id]);
  if (!current.rows[0]) return res.status(404).json({ error: 'Utilizador não encontrado.' });
  if (current.rows[0].is_master && active === false) return res.status(400).json({ error: 'Não pode desativar o utilizador master.' });
  const passwordHash = password ? await bcrypt.hash(password, 12) : current.rows[0].password_hash;
  const { rows } = await pool.query(
    `update users set name=coalesce($1,name), role=coalesce($2,role), active=coalesce($3,active), password_hash=$4, updated_at=now()
     where id=$5 returning id,name,email,role,active,is_master,created_at`,
    [name || null, role || null, typeof active === 'boolean' ? active : null, passwordHash, id]
  );
  await audit(req.user.id, 'update', 'user', id, { fields: Object.keys(req.body) });
  res.json({ user: rows[0] });
});

router.delete('/:id', async (req, res) => {
  const { rows } = await pool.query('select * from users where id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Utilizador não encontrado.' });
  if (rows[0].is_master) return res.status(400).json({ error: 'Não pode apagar o utilizador master.' });
  await pool.query('delete from users where id=$1', [req.params.id]);
  await audit(req.user.id, 'delete', 'user', req.params.id, { email: rows[0].email });
  res.json({ ok: true });
});

module.exports = router;
