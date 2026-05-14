const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireEnv } = require('../utils/env');
const router = express.Router();

router.post('/send', requireAuth, async (req, res, next) => {
  try {
    requireEnv(['RESEND_API_KEY', 'EMAIL_FROM']);
    const { to, subject, html, text } = req.body;
    if (!to || !subject || (!html && !text)) return res.status(400).json({ error: 'Campos obrigatórios: to, subject e html/text.' });
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html, text })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: 'Erro ao enviar email', detail: data });
    res.json({ ok: true, provider: 'resend', data });
  } catch (err) { next(err); }
});

module.exports = router;
