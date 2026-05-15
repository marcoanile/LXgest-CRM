const express = require('express');
const router = express.Router();
const { pool } = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const ALLOWED_KEYS = [
  'ANTHROPIC_API_KEY','RESEND_API_KEY','EMAIL_FROM',
  'WHATSAPP_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_VERIFY_TOKEN',
  'META_ACCESS_TOKEN','META_PAGE_ID',
  'LINKEDIN_ACCESS_TOKEN','LINKEDIN_ORGANIZATION_URN',
  'APOLLO_API_KEY','GOOGLE_PLACES_API_KEY','HUNTER_API_KEY'
];

async function getSettingVal(key) {
  if (process.env[key]) return process.env[key];
  try {
    const { rows } = await pool.query('SELECT value FROM settings WHERE key=$1', [key]);
    return rows[0]?.value || null;
  } catch { return null; }
}

router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const has = async (k) => !!(await getSettingVal(k));
    res.json({ status: {
      claude:       await has('ANTHROPIC_API_KEY'),
      email:        (await has('RESEND_API_KEY')) && (await has('EMAIL_FROM')),
      whatsapp:     (await has('WHATSAPP_TOKEN')) && (await has('WHATSAPP_PHONE_NUMBER_ID')),
      facebook:     (await has('META_ACCESS_TOKEN')) && (await has('META_PAGE_ID')),
      linkedin:     await has('LINKEDIN_ACCESS_TOKEN'),
      prospecting:  (await has('APOLLO_API_KEY')) || (await has('GOOGLE_PLACES_API_KEY')),
    }});
  } catch(err) { next(err); }
});

router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT key FROM settings WHERE is_secret=true');
    const configured = rows.map(r => r.key);
    const envConfigured = ALLOWED_KEYS.filter(k => process.env[k]);
    const allConfigured = [...new Set([...configured, ...envConfigured])];
    res.json({ configured: allConfigured });
  } catch(err) { next(err); }
});

router.put('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const updates = Object.entries(req.body).filter(([k, v]) => ALLOWED_KEYS.includes(k) && v && v.trim());
    for (const [key, value] of updates) {
      await pool.query(
        `INSERT INTO settings (key, value, is_secret) VALUES ($1, $2, true)
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=now()`,
        [key, value.trim()]
      );
      process.env[key] = value.trim();
    }
    res.json({ ok: true, updated: updates.map(([k]) => k) });
  } catch(err) { next(err); }
});

module.exports = router;
module.exports.getSettingVal = getSettingVal;
