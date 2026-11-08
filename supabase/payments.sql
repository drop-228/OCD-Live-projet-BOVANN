alter table reservations
  add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid','processing','paid','failed','refunded')),
  add column if not exists payment_method text;

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  provider text not null,
  provider_ref text,
  amount integer not null check (amount >= 0),
  currency text not null default 'XOF',
  status text not null check (status in ('pending','processing','paid','failed','refunded')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payments_provider_ref_unique
  on payments(provider, provider_ref)
  where provider_ref is not null;
create index if not exists payments_reservation_id_idx on payments(reservation_id);

alter table payments enable row level security;
drop policy if exists "admin all payments" on payments;
create policy "admin all payments" on payments
  for all using (is_admin()) with check (is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin read payment proofs" on storage.objects;
create policy "admin read payment proofs"
  on storage.objects for select
  using (bucket_id = 'payment-proofs' and is_admin());
drop policy if exists "admin write payment proofs" on storage.objects;
create policy "admin write payment proofs"
  on storage.objects for all
  using (bucket_id = 'payment-proofs' and is_admin())
  with check (bucket_id = 'payment-proofs' and is_admin());

create table if not exists site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into site_settings (key, value) values
  ('payment', '{"require_deposit":false,"deposit_percent":30,"eur_xof_rate":655.957,"usd_xof_rate":600}'::jsonb)
on conflict (key) do nothing;

alter table site_settings enable row level security;
drop policy if exists "admin settings" on site_settings;
create policy "admin settings" on site_settings
  for all using (is_admin()) with check (is_admin());
