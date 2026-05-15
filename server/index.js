require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'LXGest CRM API', version: '2.0.0', ts: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/import', require('./routes/imports'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/prospecting', require('./routes/prospecting'));
app.use('/api/email', require('./routes/email'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/social', require('./routes/social'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api', require('./routes/generic'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Erro interno do servidor.', detail: process.env.NODE_ENV === 'production' ? undefined : err.message, missing: err.missing });
});

app.listen(PORT, () => console.log(`LXGest CRM running on port ${PORT}`));
