const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { requireAuth } = require('../middleware/auth');
const { audit } = require('../utils/audit');

const router = express.Router();
router.use(requireAuth);

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error('ANTHROPIC_API_KEY não configurada no Render. Adicione a chave Anthropic nas variáveis de ambiente.');
    err.status = 503;
    throw err;
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const SYSTEM_PROMPTS = {
  assistant: `És o assistente IA oficial da LXGest, um CRM e Marketing Hub para empresas em Portugal. Responde em português europeu, com tom profissional, direto e comercial. Ajuda com CRM, vendas, marketing digital, newsletters, WhatsApp, prospeção, automações, tarefas, calendário, segmentação e relatórios. Não inventes dados reais; quando necessário, assume que estás a trabalhar com dados de demonstração.`,
  email: `És especialista em email marketing B2B em Portugal. Cria assuntos, newsletters e sequências comerciais com tom profissional, claro e orientado a conversão. Respeita RGPD e evita promessas exageradas.`,
  whatsapp: `És especialista em mensagens WhatsApp Business para vendas B2B em Portugal. Escreve mensagens curtas, naturais, educadas e com CTA simples.`,
  prospecting: `És analista comercial B2B. Ajuda a qualificar leads, criar scoring, priorizar oportunidades e preparar abordagens comerciais para empresas em Portugal.`,
  automation: `És arquiteto de automações CRM. Cria workflows claros com trigger, condição, ação, canal, responsável, atraso e métrica de sucesso.`
};

function buildMessages(messages = [], message) {
  const history = messages
    .filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string')
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 5000) }));
  return [...history, { role: 'user', content: message.slice(0, 8000) }];
}

router.post('/chat', async (req, res) => {
  try {
    const { message, mode = 'assistant', context = {}, messages = [] } = req.body;
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Mensagem em falta.' });

    const client = getClient();
    const model = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
    const system = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.assistant;
    const fullSystem = system + `\n\nContexto: ${JSON.stringify({ user: req.user, context }).slice(0, 2000)}`;

    const response = await client.messages.create({
      model,
      max_tokens: 1200,
      system: fullSystem,
      messages: buildMessages(messages, message)
    });

    const text = response.content?.[0]?.text || 'Não consegui gerar resposta neste momento.';
    await audit(req.user.id, 'ai_chat', 'ai', null, { mode, model });
    res.json({ answer: text, model, mode });
  } catch (err) {
    console.error('AI error', err);
    res.status(err.status || 500).json({ error: err.message || 'Erro no módulo IA.' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { type = 'email', prompt, audience, goal, tone = 'profissional' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt em falta.' });
    const client = getClient();
    const model = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';
    const system = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.assistant;
    const userMsg = `Tipo: ${type}\nPúblico: ${audience || 'B2B Portugal'}\nObjetivo: ${goal || 'conversão comercial'}\nTom: ${tone}\nPedido: ${prompt}`;

    const response = await client.messages.create({
      model,
      max_tokens: 1400,
      system,
      messages: [{ role: 'user', content: userMsg }]
    });
    const content = response.content?.[0]?.text || '';
    await audit(req.user.id, 'ai_generate', 'ai', null, { type, model });
    res.json({ content, model, type });
  } catch (err) {
    console.error('AI generate error', err);
    res.status(err.status || 500).json({ error: err.message || 'Erro ao gerar conteúdo.' });
  }
});

module.exports = router;
