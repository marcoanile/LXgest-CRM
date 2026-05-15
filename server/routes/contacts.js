const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { audit } = require('../utils/audit');
const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit || 100), 500);
    const params = [];
    let where = '';
    if (q) { params.push(`%${q}%`); where = `where name ilike $1 or email ilike $1 or company ilike $1 or phone ilike $1`; }
    params.push(limit);
    const { rows } = await pool.query(`select * from contacts ${where} order by created_at desc limit $${params.length}`, params);
    res.json({ contacts: rows });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, company, source = 'manual', status = 'lead', tags = [] } = req.body;
    if (!name && !email && !phone) return res.status(400).json({ error: 'Indique pelo menos nome, email ou telefone.' });
    const { rows } = await pool.query(
      `insert into contacts (name,email,phone,company,source,status,tags,owner_id) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
      [name, email || null, phone || null, company || null, source, status, tags, req.user.id]
    );
    await audit(req.user.id, 'create', 'contact', rows[0].id, { email, company });
    res.status(201).json({ contact: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const fields = ['name', 'email', 'phone', 'company', 'source', 'status', 'tags', 'consent_email', 'consent_whatsapp', 'consent_sms'];
    const sets = [], values = [];
    for (const f of fields) if (Object.prototype.hasOwnProperty.call(req.body, f)) { values.push(req.body[f]); sets.push(`${f}=$${values.length}`); }
    if (!sets.length) return res.status(400).json({ error: 'Nada para atualizar.' });
    values.push(req.params.id);
    const { rows } = await pool.query(`update contacts set ${sets.join(', ')}, updated_at=now() where id=$${values.length} returning *`, values);
    if (!rows[0]) return res.status(404).json({ error: 'Contacto não encontrado.' });
    await audit(req.user.id, 'update', 'contact', req.params.id, { fields: Object.keys(req.body) });
    res.json({ contact: rows[0] });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('delete from contacts where id=$1', [req.params.id]);
    await audit(req.user.id, 'delete', 'contact', req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
