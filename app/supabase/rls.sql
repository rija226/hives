-- No authentication in this app — allow all operations on all tables

alter table hives           enable row level security;
alter table treatment_types enable row level security;
alter table inspections     enable row level security;
alter table treatments      enable row level security;
alter table harvests        enable row level security;
alter table diseases        enable row level security;
alter table weights         enable row level security;

create policy "allow all" on hives           for all using (true) with check (true);
create policy "allow all" on treatment_types for all using (true) with check (true);
create policy "allow all" on inspections     for all using (true) with check (true);
create policy "allow all" on treatments      for all using (true) with check (true);
create policy "allow all" on harvests        for all using (true) with check (true);
create policy "allow all" on diseases        for all using (true) with check (true);
create policy "allow all" on weights         for all using (true) with check (true);
