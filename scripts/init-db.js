require('dotenv').config();
const { pool } = require('../server/db/pool');

async function main() {
  await pool.query('create extension if not exists pgcrypto');
  await pool.query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      email text not null unique,
      password_hash text not null,
      role text not null default 'Comercial',
      active boolean not null default true,
      is_master boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists contacts (
      id uuid primary key default gen_random_uuid(),
      name text,
      email text,
      phone text,
      company text,
      source text default 'manual',
      status text default 'lead',
      tags text[] default '{}',
      consent_email boolean default false,
      consent_whatsapp boolean default false,
      consent_sms boolean default false,
      owner_id uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index if not exists idx_contacts_email on contacts(lower(email));
    create index if not exists idx_contacts_company on contacts(company);
    create table if not exists opportunities (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      company text,
      value numeric(12,2) default 0,
      stage text default 'novo',
      probability integer default 10,
      assigned_to uuid references users(id) on delete set null,
      contact_id uuid references contacts(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists tasks (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      description text,
      status text default 'por_fazer',
      priority text default 'media',
      due_date date,
      assigned_to uuid references users(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists campaigns (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      type text default 'email',
      status text default 'draft',
      budget numeric(12,2) default 0,
      starts_at timestamptz,
      ends_at timestamptz,
      metrics jsonb default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists segments (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      description text,
      filters jsonb default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists automations (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      description text,
      trigger_type text not null default 'manual',
      action_type text not null default 'task',
      active boolean default false,
      config jsonb default '{}',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists whatsapp_messages (
      id uuid primary key default gen_random_uuid(),
      direction text not null,
      phone text not null,
      message text not null,
      provider_payload jsonb default '{}',
      created_at timestamptz not null default now()
    );
    create table if not exists lead_searches (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references users(id) on delete set null,
      sector text not null,
      location text default 'Portugal',
      provider text,
      result_count integer default 0,
      results jsonb default '[]',
      created_at timestamptz not null default now()
    );
    create table if not exists audit_logs (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references users(id) on delete set null,
      action text not null,
      entity_type text,
      entity_id uuid,
      metadata jsonb default '{}',
      created_at timestamptz not null default now()
    );
  `);

  // Unique partial index to prevent duplicate contacts by email (ignores nulls)
  await pool.query(`
    create unique index if not exists idx_contacts_email_unique
    on contacts(lower(email)) where email is not null
  `);

  console.log('Database schema is ready.');
}

main().then(() => pool.end()).catch(err => { console.error(err); process.exit(1); });
