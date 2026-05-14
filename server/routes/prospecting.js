const express = require('express');
const { pool } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { missingEnv, requireEnv } = require('../utils/env');
const router = express.Router();

function cleanDomain(url) {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

async function googlePlacesSearch({ sector, location = 'Portugal', limit = 10 }) {
  requireEnv(['GOOGLE_PLACES_API_KEY']);
  const q = encodeURIComponent(`${sector} em ${location}`);
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${key}&language=pt-PT`;
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok || data.status === 'REQUEST_DENIED') throw new Error(data.error_message || 'Erro Google Places');
  const results = (data.results || []).slice(0, Number(limit));
  const detailed = [];
  for (const place of results) {
    const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,international_phone_number,website,formatted_address,business_status,rating,user_ratings_total&key=${key}&language=pt-PT`;
    const detailRes = await fetch(detailUrl);
    const detail = await detailRes.json();
    const p = detail.result || place;
    detailed.push({
      provider: 'google_places',
      name: p.name || place.name,
      company: p.name || place.name,
      phone: p.international_phone_number || p.formatted_phone_number || null,
      website: p.website || null,
      domain: cleanDomain(p.website),
      address: p.formatted_address || place.formatted_address || null,
      rating: p.rating || null,
      score: Math.min(98, Math.round(((p.rating || 3.5) / 5) * 65 + ((p.user_ratings_total || 0) > 20 ? 20 : 5))),
      raw: p
    });
  }
  return detailed;
}

async function apolloSearch({ sector, location = 'Portugal', limit = 10 }) {
  requireEnv(['APOLLO_API_KEY']);
  const r = await fetch('https://api.apollo.io/v1/mixed_companies/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': process.env.APOLLO_API_KEY },
    body: JSON.stringify({ q_keywords: sector, organization_locations: [location], page: 1, per_page: Number(limit) })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_message || data.message || 'Erro Apollo');
  return (data.organizations || []).slice(0, Number(limit)).map(o => ({
    provider: 'apollo', name: o.name, company: o.name, phone: o.phone || null, website: o.website_url || null,
    domain: o.primary_domain || cleanDomain(o.website_url), address: [o.city, o.country].filter(Boolean).join(', '),
    industry: o.industry, employees: o.estimated_num_employees, score: 80, raw: o
  }));
}

async function enrichWithHunter(lead) {
  if (missingEnv('HUNTER_API_KEY') || !lead.domain) return lead;
  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(lead.domain)}&api_key=${process.env.HUNTER_API_KEY}&limit=5`;
  const r = await fetch(url);
  const data = await r.json();
  if (!r.ok) return lead;
  const emails = (data.data?.emails || []).map(e => ({ email: e.value, type: e.type, confidence: e.confidence, first_name: e.first_name, last_name: e.last_name, position: e.position }));
  return { ...lead, emails, email: emails[0]?.email || null };
}

router.post('/search', requireAuth, async (req, res, next) => {
  try {
    const { sector, location = 'Portugal', limit = 10, provider = 'auto', enrich = true, save = false } = req.body;
    if (!sector) return res.status(400).json({ error: 'Indique o ramo/setor a pesquisar.' });
    let leads = [];
    if (provider === 'apollo' || (provider === 'auto' && !missingEnv('APOLLO_API_KEY'))) leads = await apolloSearch({ sector, location, limit });
    else leads = await googlePlacesSearch({ sector, location, limit });
    if (enrich) leads = await Promise.all(leads.map(enrichWithHunter));
    let saved = 0;
    if (save) {
      for (const lead of leads) {
        await pool.query(
          `insert into contacts(name,email,phone,company,source,status,tags,owner_id)
           values($1,$2,$3,$4,'prospecting','lead',$5,$6)
           on conflict do nothing`,
          [lead.name, lead.email, lead.phone, lead.company, [sector, lead.provider].filter(Boolean), req.user.id]
        );
        saved++;
      }
    }
    res.json({ ok: true, count: leads.length, saved, leads });
  } catch (err) { next(err); }
});

module.exports = router;
