create table if not exists public.shared_records (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('quotation','customer','product')),
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_type, record_id)
);
alter table public.shared_records enable row level security;
create policy "Authenticated users can view shared records" on public.shared_records for select to authenticated using (true);
create policy "Authenticated users can add shared records" on public.shared_records for insert to authenticated with check (true);
create policy "Authenticated users can edit shared records" on public.shared_records for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete shared records" on public.shared_records for delete to authenticated using (true);
create index if not exists shared_records_type_updated_idx on public.shared_records (record_type, updated_at desc);
