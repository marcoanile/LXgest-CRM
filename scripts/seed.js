require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../server/db/pool');

async function main() {
  const email = (process.env.MASTER_EMAIL || 'marco.anile@lxgest.com').toLowerCase();
  const password = process.env.MASTER_PASSWORD || 'Mec090716';
  const name = process.env.MASTER_NAME || 'Marco Anile';
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `insert into users (name,email,password_hash,role,active,is_master)
     values ($1,$2,$3,'Administrador Master',true,true)
     on conflict (email) do update set password_hash=excluded.password_hash, role='Administrador Master', active=true, is_master=true, updated_at=now()`,
    [name, email, passwordHash]
  );
  await pool.query(`
    insert into contacts (name,email,phone,company,source,status,tags,consent_email,consent_whatsapp)
    values
      ('Ana Silva','ana@tecnilab.pt','+351 910 000 001','Tecnilab','demo','lead',array['B2B','Quente'],true,true),
      ('João Ferreira','joao@medigest.pt','+351 910 000 002','Medigest','demo','cliente',array['Saúde'],true,true)
    on conflict do nothing;
    insert into opportunities (title,company,value,stage,probability)
    values ('CRM + Marketing Hub','Tecnilab',12500,'proposta',72),('Automação WhatsApp','Medigest',7800,'negociacao',60)
    on conflict do nothing;
    insert into tasks (title,description,status,priority,due_date)
    values ('Enviar proposta Tecnilab','Validar escopo e enviar versão final','em_progresso','alta',current_date + interval '2 days')
    on conflict do nothing;
  `);
  console.log('Seed complete. Master login:', email);
}
main().then(()=>pool.end()).catch(err => { console.error(err); process.exit(1); });
