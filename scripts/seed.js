const bcrypt = require('bcryptjs');
const { pool } = require('../server/db/pool');

async function cleanBusinessData() {
  const tables = [
    'audit_logs',
    'lead_searches',
    'whatsapp_messages',
    'automations',
    'segments',
    'campaigns',
    'opportunities',
    'tasks',
    'contacts'
  ];

  for (const table of tables) {
    await pool.query(`DELETE FROM ${table}`);
  }

  await pool.query('DELETE FROM users WHERE lower(email) <> lower($1)', [process.env.MASTER_EMAIL]);
  console.log('Business data cleaned. Only master user remains.');
}

async function ensureMasterUser() {
  if (!process.env.MASTER_EMAIL || !process.env.MASTER_PASSWORD) {
    throw new Error('MASTER_EMAIL and MASTER_PASSWORD must be configured.');
  }

  const email = process.env.MASTER_EMAIL.toLowerCase();
  const password = process.env.MASTER_PASSWORD;
  const name = process.env.MASTER_NAME || 'Master User';
  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    `insert into users (name, email, password_hash, role, active, is_master)
     values ($1, $2, $3, 'Administrador Master', true, true)
     on conflict (email)
     do update set
       name = excluded.name,
       password_hash = excluded.password_hash,
       role = 'Administrador Master',
       active = true,
       is_master = true,
       updated_at = now()`,
    [name, email, hash]
  );

  console.log(`Master user ready: ${email}`);
}

async function main() {
  if (process.env.CLEAN_DATABASE_ON_DEPLOY === 'true') {
    await cleanBusinessData();
  } else {
    console.log('Database cleaning skipped. Set CLEAN_DATABASE_ON_DEPLOY=true to clean business data.');
  }

  await ensureMasterUser();
  console.log('Seed complete.');
}

main()
  .then(() => pool.end())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
