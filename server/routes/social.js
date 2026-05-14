const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireEnv } = require('../utils/env');
const router = express.Router();

router.post('/facebook/post', requireAuth, async (req, res, next) => {
  try {
    requireEnv(['META_ACCESS_TOKEN', 'META_PAGE_ID']);
    const { message, link } = req.body;
    if (!message) return res.status(400).json({ error: 'Campo obrigatório: message.' });
    const body = new URLSearchParams({ message, access_token: process.env.META_ACCESS_TOKEN });
    if (link) body.set('link', link);
    const r = await fetch(`https://graph.facebook.com/v20.0/${process.env.META_PAGE_ID}/feed`, { method: 'POST', body });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: 'Erro Meta/Facebook', detail: data });
    res.json({ ok: true, data });
  } catch (err) { next(err); }
});

router.post('/linkedin/post', requireAuth, async (req, res, next) => {
  try {
    requireEnv(['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_ORGANIZATION_URN']);
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Campo obrigatório: text.' });
    const payload = {
      author: process.env.LINKEDIN_ORGANIZATION_URN,
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' } },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    };
    const r = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify(payload)
    });
    const data = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: 'Erro LinkedIn', detail: data });
    res.json({ ok: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
