const express = require('express');
const { integrationStatus } = require('../utils/env');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/status', requireAuth, (_req, res) => {
  res.json({ ok: true, integrations: integrationStatus() });
});

module.exports = router;
