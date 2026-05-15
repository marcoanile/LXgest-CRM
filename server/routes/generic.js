const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { audit } = require('../utils/audit');
const router = express.Router();
router.use(requireAuth);

const allowed = {
  tasks: ['title', 'description', 'status', 'priority', 'due_date', 'assigned_to'],
  opportunities: ['title', 'company', 'value', 'stage', 'probability', 'assigned_to', 'contact_id'],
  campaigns: ['name', 'type', 'status', 'budget', 'starts_at', 'ends_at', 'metrics'],
  segments: ['name', 'description', 'filters'],
  automations: ['name', 'description', 'trigger_type', 'action_type', 'active', 'config']
};

router.get('/:resource', async (req, res, next) => {
  try {
    const table = req.params.resource;
    if (!allowed[table]) return res.status(404).json({ error: 'Recurso não suportado.' });
    const { rows } = await pool.query(`select * from ${table} order by created_at desc limit 200`);
    res.json({ [table]: rows });
  } catch (err) { next(err); }
});

router.post('/:resource', async (req, res, next) => {
  try {
    const table = req.params.resource;
    const fields = allowed[table];
    if (!fields) return res.status(404).json({ error: 'Recurso não suportado.' });
    const keys = fields.filter(f => Object.prototype.hasOwnProperty.call(req.body, f));
    if (!keys.length) return res.status(400).json({ error: 'Sem dados válidos.' });
    const values = keys.map(k => req.body[k]);
    const cols = keys.join(',');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(`insert into ${table} (${cols}) values (${placeholders}) returning *`, values);
    await audit(req.user.id, 'create', table, rows[0].id, { keys });
    res.status(201).json({ item: rows[0] });
  } catch (err) { next(err); }
});

router.patch('/:resource/:id', async (req, res, next) => {
  try {
    const table = req.params.resource;
    const fields = allowed[table];
    if (!fields) return res.status(404).json({ error: 'Recurso não suportado.' });
    const keys = fields.filter(f => Object.prototype.hasOwnProperty.call(req.body, f));
    if (!keys.length) return res.status(400).json({ error: 'Sem dados válidos.' });
    const values = keys.map(k => req.body[k]);
    const sets = keys.map((k, i) => `${k}=$${i + 1}`).join(',');
    values.push(req.params.id);
    const { rows } = await pool.query(`update ${table} set ${sets}, updated_at=now() where id=$${values.length} returning *`, values);
    if (!rows[0]) return res.status(404).json({ error: 'Registo não encontrado.' });
    await audit(req.user.id, 'update', table, req.params.id, { keys });
    res.json({ item: rows[0] });
  } catch (err) { next(err); }
});

router.delete('/:resource/:id', async (req, res, next) => {
  try {
    const table = req.params.resource;
    if (!allowed[table]) return res.status(404).json({ error: 'Recurso não suportado.' });
    await pool.query(`delete from ${table} where id=$1`, [req.params.id]);
    await audit(req.user.id, 'delete', table, req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
