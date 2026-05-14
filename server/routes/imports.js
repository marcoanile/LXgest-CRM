const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { parse } = require('csv-parse/sync');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { audit } = require('../utils/audit');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
router.use(requireAuth);

function normalize(row) {
  const get = (...keys) => keys.map(k => row[k]).find(v => v !== undefined && v !== null && String(v).trim() !== '');
  return {
    name: get('name','nome','Nome','Cliente','cliente') || null,
    email: get('email','Email','E-mail','e-mail') || null,
    phone: get('phone','telefone','Telefone','telemovel','Telemóvel','WhatsApp') || null,
    company: get('company','empresa','Empresa','companhia') || null,
    source: 'import',
    status: 'lead'
  };
}

router.post('/contacts', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ficheiro em falta.' });
  const ext = req.file.originalname.split('.').pop().toLowerCase();
  let rawRows = [];
  if (['xlsx','xls'].includes(ext)) {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  } else if (ext === 'csv') {
    rawRows = parse(req.file.buffer.toString('utf8'), { columns: true, skip_empty_lines: true, trim: true });
  } else return res.status(400).json({ error: 'Formato inválido. Use XLSX, XLS ou CSV.' });

  const rows = rawRows.map(normalize).filter(r => r.name || r.email || r.phone);
  let inserted = 0, duplicates = 0;
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const r of rows) {
      const exists = r.email ? await client.query('select id from contacts where lower(email)=lower($1) limit 1', [r.email]) : { rowCount: 0 };
      if (exists.rowCount) { duplicates++; continue; }
      await client.query(
        `insert into contacts (name,email,phone,company,source,status,owner_id) values ($1,$2,$3,$4,$5,$6,$7)`,
        [r.name, r.email, r.phone, r.company, r.source, r.status, req.user.id]
      );
      inserted++;
    }
    await client.query('commit');
  } catch (err) { await client.query('rollback'); throw err; } finally { client.release(); }
  await audit(req.user.id, 'import', 'contacts', null, { file: req.file.originalname, total: rows.length, inserted, duplicates });
  res.json({ total: rows.length, inserted, duplicates, preview: rows.slice(0, 10) });
});
module.exports = router;
