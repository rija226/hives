-- Run this in Supabase SQL editor after schema.sql
-- Creates the storage bucket for hive photos

insert into storage.buckets (id, name, public)
values ('hive-photos', 'hive-photos', true);

-- Allow all operations (no auth in this app)
create policy "Public access" on storage.objects
  for all using (bucket_id = 'hive-photos');
