-- Hives management app schema
-- Run this in Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table hives (
  id          uuid primary key default uuid_generate_v4(),
  number      integer not null unique,
  has_scale   boolean not null default false,
  note        text,
  created_at  timestamptz not null default now()
);

create table treatment_types (
  id    uuid primary key default uuid_generate_v4(),
  name  text not null unique
);

create table inspections (
  id               uuid primary key default uuid_generate_v4(),
  hive_id          uuid not null references hives(id) on delete cascade,
  date             date not null,
  colony_strength  text not null check (colony_strength in ('strong', 'medium', 'weak')),
  note             text,
  photo_urls       text[] not null default '{}',
  created_at       timestamptz not null default now()
);

create table treatments (
  id          uuid primary key default uuid_generate_v4(),
  hive_id     uuid not null references hives(id) on delete cascade,
  date        date not null,
  reason      text not null,
  note        text,
  photo_urls  text[] not null default '{}',
  created_at  timestamptz not null default now()
);

create table harvests (
  id            uuid primary key default uuid_generate_v4(),
  hive_id       uuid not null references hives(id) on delete cascade,
  date          date not null,
  frames_count  integer not null,
  note          text,
  created_at    timestamptz not null default now()
);

create table diseases (
  id             uuid primary key default uuid_generate_v4(),
  hive_id        uuid not null references hives(id) on delete cascade,
  name           text not null,
  detected_date  date not null,
  resolved_date  date,
  created_at     timestamptz not null default now()
);

create table weights (
  id         uuid primary key default uuid_generate_v4(),
  hive_id    uuid not null references hives(id) on delete cascade,
  date       date not null,
  weight_kg  numeric(6,2) not null,
  created_at timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index on inspections (hive_id, date desc);
create index on treatments  (hive_id, date desc);
create index on harvests    (hive_id, date desc);
create index on diseases    (hive_id) where resolved_date is null;
create index on weights     (hive_id, date desc);

-- ─── Seed: treatment_types ────────────────────────────────────────────────────

insert into treatment_types (name) values
  ('varoa'),
  ('krečno leglo'),
  ('nozema'),
  ('gnjiloća'),
  ('prihrana');
