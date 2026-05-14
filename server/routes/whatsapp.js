const express = require('express');
const OpenAI = require('openai');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { requireEnv, missingEnv } = require('../utils/env');
const router = express.Router();

async function sendWhatsAppText(to, body) {
  requireEnv(['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']);
  const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: false, body } })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function aiReply(message) {
  if (missingEnv('OPENAI_API_KEY')) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: 'És o assistente comercial da LXGest em Portugal. Responde de forma curta, profissional e comercial.' },
      { role: 'user', content: message }
    ]
  });
  return completion.choices?.[0]?.message?.content || null;
}

router.post('/send', requireAuth, async (req, res, next) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'Campos obrigatórios: to e message.' });
    const data = await sendWhatsAppText(to, message);
    await pool.query('insert into whatsapp_messages(direction, phone, message, provider_payload) values($1,$2,$3,$4)', ['out', to, message, data]);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
});

router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

router.post('/webhook', async (req, res, next) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (msg?.type === 'text') {
      const from = msg.from;
      const text = msg.text.body;
      await pool.query('insert into whatsapp_messages(direction, phone, message, provider_payload) values($1,$2,$3,$4)', ['in', from, text, req.body]);
      if (process.env.WHATSAPP_BOT_ENABLED === 'true') {
        const reply = await aiReply(text);
        if (reply) {
          await sendWhatsAppText(from, reply);
          await pool.query('insert into whatsapp_messages(direction, phone, message, provider_payload) values($1,$2,$3,$4)', ['out', from, reply, { auto: true }]);
        }
      }
    }
    res.sendStatus(200);
  } catch (err) { next(err); }
});

module.exports = router;
