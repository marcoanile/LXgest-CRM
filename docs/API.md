# LXGest API

Base URL: `/api`

Autenticação: header `Authorization: Bearer <token>`.

Exemplo login:

```bash
curl -X POST https://SEU-RENDER.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"marco.anile@lxgest.com","password":"Mec090716"}'
```

Exemplo criar contacto:

```bash
curl -X POST https://SEU-RENDER.onrender.com/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"Cliente Demo","email":"cliente@empresa.pt","company":"Empresa Demo","consent_email":true}'
```


## IA / GPT

Todos os endpoints exigem JWT Bearer.

### POST /api/ai/chat

Body:

```json
{
  "message": "Resumo dos leads em risco",
  "mode": "assistant",
  "context": {}
}
```

Resposta:

```json
{
  "answer": "...",
  "model": "gpt-4.1-mini",
  "mode": "assistant"
}
```

### POST /api/ai/generate

Body:

```json
{
  "type": "email",
  "prompt": "Criar newsletter para prospects B2B",
  "audience": "PMEs em Portugal",
  "goal": "marcar reunião",
  "tone": "profissional"
}
```


## Integrações reais

Todas as rotas abaixo exigem autenticação JWT, exceto o webhook WhatsApp.

### Status
`GET /api/integrations/status`

Mostra que integrações têm credenciais configuradas no Render.

### Prospecção automática
`POST /api/prospecting/search`

Body:
```json
{ "sector": "contabilidade", "location": "Lisboa, Portugal", "limit": 10, "provider": "auto", "enrich": true, "save": true }
```

Usa Apollo quando `APOLLO_API_KEY` existe. Caso contrário usa Google Places. Se `HUNTER_API_KEY` existir, tenta enriquecer com emails corporativos por domínio.

### Email real
`POST /api/email/send`

Body:
```json
{ "to": "cliente@empresa.pt", "subject": "Assunto", "html": "<h1>Mensagem</h1>" }
```

Usa Resend com `RESEND_API_KEY` e `EMAIL_FROM`.

### WhatsApp real
`POST /api/whatsapp/send`

Body:
```json
{ "to": "351912345678", "message": "Olá, mensagem enviada pela LXGest." }
```

Webhook Meta:
- GET/POST `/api/whatsapp/webhook`
- Use `WHATSAPP_VERIFY_TOKEN` na configuração da Meta.
- Para chatbot automático, defina `WHATSAPP_BOT_ENABLED=true` e `OPENAI_API_KEY`.

### Redes sociais
`POST /api/social/facebook/post`

Body:
```json
{ "message": "Publicação LXGest", "link": "https://lxgest.com" }
```

`POST /api/social/linkedin/post`

Body:
```json
{ "text": "Publicação LXGest no LinkedIn" }
```
