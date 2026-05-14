# LXGest CRM Platform — Full Stack MVP

Projeto pronto para GitHub + Render com:

- Frontend premium em `public/index.html`
- Backend Node.js/Express
- Base de dados PostgreSQL
- Autenticação JWT
- Passwords com bcrypt
- Login master
- CRUD de utilizadores
- CRUD de contactos
- Importação Excel/CSV para contactos
- Estrutura para tarefas, pipeline/oportunidades, campanhas, segmentos e automações
- Auditoria básica
- Integração GPT via OpenAI API no módulo Assistente IA
- Endpoints IA para chat, geração de campanhas, newsletters, WhatsApp e workflows
- `render.yaml` para deploy automático

## Login master

```txt
Email: marco.anile@lxgest.com
Senha: Mec090716
```

> Em produção, altere a senha no Render depois do primeiro deploy. A seed atualiza o utilizador master com a variável `MASTER_PASSWORD`.

## Deploy no Render

1. Crie um repositório no GitHub.
2. Envie todos os ficheiros deste projeto.
3. No Render, escolha **New > Blueprint**.
4. Ligue o repositório.
5. O Render vai ler o `render.yaml`, criar:
   - Web Service Node.js
   - PostgreSQL database
   - Variáveis necessárias
6. Aguarde o build.
7. Abra o URL gerado pelo Render.

## Deploy manual no Render

Caso não use Blueprint:

- Build Command:

```bash
npm install && npm run db:init && npm run db:seed
```

- Start Command:

```bash
npm start
```

- Environment Variables:

```txt
NODE_ENV=production
PORT=10000
DATABASE_URL=<connection string PostgreSQL>
JWT_SECRET=<uma chave longa e segura>
JWT_EXPIRES_IN=7d
MASTER_EMAIL=marco.anile@lxgest.com
MASTER_PASSWORD=Mec090716
MASTER_NAME=Marco Anile
CORS_ORIGIN=*
OPENAI_API_KEY=<sua chave da OpenAI API>
OPENAI_MODEL=gpt-4.1-mini
```

## Desenvolvimento local

```bash
cp .env.example .env
npm install
npm run db:init
npm run db:seed
npm run dev
```

Abra:

```txt
http://localhost:10000
```


## IA com GPT / OpenAI API

O módulo **Assistente IA** usa a OpenAI API pelo backend, nunca pelo frontend.

No Render, configure:

```txt
OPENAI_API_KEY=<a sua chave da OpenAI API>
OPENAI_MODEL=gpt-4.1-mini
```

A assinatura do ChatGPT ou do GitHub Copilot ajuda no uso pessoal/desenvolvimento, mas o SaaS publicado precisa de uma chave da **OpenAI API** para executar IA dentro da aplicação. A SDK oficial lê a variável `OPENAI_API_KEY` a partir do ambiente do servidor.

Endpoints incluídos:

- `POST /api/ai/chat` — assistente IA do CRM
- `POST /api/ai/generate` — geração de emails, WhatsApp, campanhas, prospeção e automações

Exemplo de pedido:

```json
{
  "message": "Cria uma campanha para empresas de contabilidade em Portugal",
  "mode": "email"
}
```

## API principal

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### Utilizadores

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Contactos

- `GET /api/contacts`
- `POST /api/contacts`
- `PATCH /api/contacts/:id`
- `DELETE /api/contacts/:id`

### Importação

- `POST /api/import/contacts`
- Campo multipart: `file`
- Suporta: `.xlsx`, `.xls`, `.csv`

### Recursos genéricos

- `GET /api/tasks`, `POST /api/tasks`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id`
- `GET /api/opportunities`, `POST /api/opportunities`, `PATCH /api/opportunities/:id`, `DELETE /api/opportunities/:id`
- `GET /api/campaigns`, `POST /api/campaigns`, `PATCH /api/campaigns/:id`, `DELETE /api/campaigns/:id`
- `GET /api/segments`, `POST /api/segments`, `PATCH /api/segments/:id`, `DELETE /api/segments/:id`
- `GET /api/automations`, `POST /api/automations`, `PATCH /api/automations/:id`, `DELETE /api/automations/:id`

## Estado das integrações externas

O projeto já tem estrutura para backend/base real e GPT via OpenAI API. As integrações abaixo ainda precisam de credenciais e implementação específica:

- WhatsApp Business Cloud API
- Meta/Facebook/Instagram Graph API
- LinkedIn API
- TikTok API
- SMTP/Resend/SendGrid
- Google Calendar

## Segurança importante

Para produção comercial, recomendo antes de vender a clientes:

- Trocar a senha master
- Ativar domínio próprio e HTTPS
- Configurar backups PostgreSQL
- Implementar recuperação de password
- Implementar RBAC granular por módulo
- Implementar logs de segurança mais detalhados
- Remover qualquer senha hardcoded de frontend
- Rever RGPD/consentimentos com jurídico


## Integrações adicionadas nesta versão

Esta versão já inclui endpoints reais, prontos para produção, para:

- GPT/OpenAI: assistente, geração de campanhas, scoring e respostas.
- Prospecção automática: Apollo ou Google Places.
- Enriquecimento de emails: Hunter por domínio empresarial.
- Email marketing real: Resend.
- WhatsApp Business Cloud API: envio, webhook e chatbot com GPT.
- Redes sociais: publicação em Facebook Page e LinkedIn Organization.

### Importante

As integrações só ficam ativas quando colocar as credenciais no Render em **Environment Variables**. Não coloque tokens no código nem no GitHub.

### Variáveis principais

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=lxgest_verify_token
WHATSAPP_BOT_ENABLED=true
RESEND_API_KEY=
EMAIL_FROM=LXGest <noreply@seudominio.pt>
GOOGLE_PLACES_API_KEY=
APOLLO_API_KEY=
HUNTER_API_KEY=
META_ACCESS_TOKEN=
META_PAGE_ID=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_ORGANIZATION_URN=
```

### Fluxo recomendado para ativar tudo no Render

1. Subir este projeto para GitHub.
2. Criar o serviço no Render usando `render.yaml`.
3. Criar/ligar PostgreSQL.
4. Colocar todas as variáveis de ambiente no painel do Render.
5. Executar `npm run db:init` e `npm run db:seed`.
6. Testar `GET /api/integrations/status` depois do login.

### Limitação legal/RGPD

A prospeção deve usar fontes e APIs legítimas, preferencialmente emails corporativos, com base legal adequada, opção de opt-out e registo de consentimento/interesse legítimo quando aplicável em Portugal/UE.

## Atualização do protótipo visual

O protótipo em `public/index.html` foi atualizado para refletir as integrações reais:

- módulo **Integrações & API** com status lido do backend;
- botão de teste GPT;
- botão de teste de prospeção;
- módulo **Prospecção IA** ligado a `/api/prospecting/search`;
- logo real em PNG transparente: `public/logo-lxgest.png`.

## Variáveis para integrações reais

Configure no Render apenas as que vai utilizar:

```txt
RESEND_API_KEY=<chave Resend>
EMAIL_FROM=LXGest <no-reply@seudominio.pt>
WHATSAPP_TOKEN=<token Meta WhatsApp Cloud API>
WHATSAPP_PHONE_NUMBER_ID=<phone number id>
WHATSAPP_VERIFY_TOKEN=<token escolhido para webhook>
WHATSAPP_BOT_ENABLED=false
APOLLO_API_KEY=<chave Apollo>
GOOGLE_PLACES_API_KEY=<chave Google Places>
HUNTER_API_KEY=<chave Hunter>
META_ACCESS_TOKEN=<token Meta>
META_PAGE_ID=<id da página>
LINKEDIN_ACCESS_TOKEN=<token LinkedIn>
LINKEDIN_ORGANIZATION_URN=<urn da organização>
```

Endpoints de integrações:

- `GET /api/integrations/status`
- `POST /api/prospecting/search`
- `POST /api/email/send`
- `POST /api/whatsapp/send`
- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`
- `POST /api/social/facebook/post`
- `POST /api/social/linkedin/post`


## Correção aplicada
- Login local corrigido: ao abrir o HTML fora do Render, o utilizador master entra em modo protótipo sem mostrar "Erro API".
- Login real no Render continua a usar PostgreSQL + JWT.
- WhatsApp Robot IA ativado por padrão com `WHATSAPP_BOT_ENABLED=true`.
- Número WhatsApp configurado: `+351 913135420`.
- Logo LXGest convertida para PNG com fundo transparente.

## Variáveis obrigatórias para funcionamento real dos robots
```env
OPENAI_API_KEY=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
DATABASE_URL=gerado pelo Render
JWT_SECRET=gerado pelo Render
```

Webhook WhatsApp:
```text
https://SEU-SERVICO.onrender.com/api/whatsapp/webhook
```
