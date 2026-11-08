alter table admins add column if not exists role text not null default 'owner'
  check (role in ('owner','team','assistant'));

alter table admins add column if not exists last_login_at timestamptz;

alter table packages add column if not exists deposit_percent integer
  check (deposit_percent is null or deposit_percent between 0 and 100);
alter table packages add column if not exists require_deposit boolean not null default false;

alter table reservations drop constraint if exists reservations_payment_status_check;
alter table reservations add constraint reservations_payment_status_check
  check (payment_status in ('unpaid','processing','deposit_paid','paid','failed','refunded','pending'));

alter table payments drop constraint if exists payments_status_check;
alter table payments add constraint payments_status_check
  check (status in ('pending','processing','deposit_paid','paid','failed','refunded'));

alter table blocked_slots add column if not exists end_time time;
alter table blocked_slots add column if not exists recurring_weekday integer
  check (recurring_weekday is null or recurring_weekday between 0 and 6);
alter table blocked_slots add column if not exists end_date date;

create table if not exists action_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references reservations(id) on delete cascade,
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table action_history enable row level security;
drop policy if exists "admin action history" on action_history;
create policy "admin action history" on action_history
  for all using (is_admin()) with check (is_admin());

insert into site_settings (key, value) values
  ('booking', '{"opening_date":"2026-12-01","horizon_months":12,"slots":["08:00","09:30","11:00","14:00","15:30","17:00"]}'::jsonb),
  ('bank', '{"bank_name":"","account_name":"","iban":"","swift":"","reference_label":"OCD-"}'::jsonb)
on conflict (key) do nothing;
