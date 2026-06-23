-- Feedings table
create table if not exists feedings (
  id uuid primary key default gen_random_uuid(),
  hive_id uuid not null references hives(id) on delete cascade,
  date date not null,
  type text not null,
  amount_kg numeric(6,2),
  note text,
  created_at timestamptz default now()
);
create index if not exists feedings_hive_date on feedings(hive_id, date desc);

-- Diary entries (apiary-level, no hive_id)
create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  note text not null,
  created_at timestamptz default now()
);
create index if not exists diary_entries_date on diary_entries(date desc);

-- RLS policies
alter table feedings enable row level security;
create policy "allow all" on feedings for all using (true) with check (true);

alter table diary_entries enable row level security;
create policy "allow all" on diary_entries for all using (true) with check (true);
