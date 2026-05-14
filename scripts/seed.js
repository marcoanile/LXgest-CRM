const { Client } = require('pg');

async function clean() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  await client.query('DELETE FROM whatsapp_messages');
  await client.query('DELETE FROM opportunities');
  await client.query('DELETE FROM tasks');
  await client.query('DELETE FROM contacts');

  await client.query(`
    DELETE FROM users
    WHERE email <> 'marco.anile@lxgest.com'
  `);

  console.log('Database cleaned');

  await client.end();
}

clean();
