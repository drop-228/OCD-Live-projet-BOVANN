create extension if not exists pgcrypto;

create table admins (user_id uuid primary key references auth.users on delete cascade, email text, name text);
create or replace function is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from admins where user_id = auth.uid()) $$;

create table packages (id text primary key, name text not null, description text, price int, duration_min int not null default 90, sort int default 0, active boolean default true);
insert into packages (id,name,description,price,duration_min,sort) values
('express','Live Express','Un live de 1h30',15000,90,1),
('demi','Demi-journée','Un live de 4h',30000,240,2),
('boost','Live Boost','1h30 + annonce par Bouvann',40000,90,3),
('semaine','Pack Semaine','5 lives',60000,90,4),
('mois','Pack Mois','Lives sur un mois',250000,90,5),
('mesure','Sur mesure','Sur devis',null,90,6);

create table reservations (
 id uuid primary key default gen_random_uuid(), created_at timestamptz default now(),
 status text not null default 'pending' check (status in ('pending','accepted','refused','cancelled')),
 refusal_reason text, internal_note text,
 mode text not null check (mode in ('presentiel','distance')),
 live_date date not null, start_time time not null, end_time time not null,
 package_id text references packages(id), package_name text, price int,
 name text not null, phone text not null, email text, business text not null, product_desc text,
 city text, country text, address text, social text, payment_method text, ip text,
 reminder_sent boolean default false);
alter table reservations add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid','processing','paid','failed','refunded'));
create index on reservations (live_date, mode, status);
create unique index one_accepted_per_slot on reservations (live_date, start_time, mode) where status='accepted';

create table blocked_slots (id uuid primary key default gen_random_uuid(), live_date date not null, start_time time, reason text);
create table applications (id uuid primary key default gen_random_uuid(), created_at timestamptz default now(), role text default 'hotesse', name text not null, phone text not null, message text);

alter table admins enable row level security;
alter table packages enable row level security;
alter table reservations enable row level security;
alter table blocked_slots enable row level security;
alter table applications enable row level security;

create policy "admin self" on admins for select using (user_id = auth.uid());
create policy "public read active packages" on packages for select using (active or is_admin());
create policy "admin write packages" on packages for all using (is_admin()) with check (is_admin());
-- reservations et applications : AUCUNE policy publique. Le public écrit via l'API serveur (clé service) qui applique anti-spam et validation.
create policy "admin all reservations" on reservations for all using (is_admin()) with check (is_admin());
create policy "admin all blocked" on blocked_slots for all using (is_admin()) with check (is_admin());
create policy "admin all applications" on applications for all using (is_admin()) with check (is_admin());

create table if not exists payments (
 id uuid primary key default gen_random_uuid(), reservation_id uuid not null references reservations(id) on delete cascade,
 provider text not null, provider_ref text, amount integer not null check (amount >= 0), currency text not null default 'XOF',
 status text not null check (status in ('pending','processing','paid','failed','refunded')), metadata jsonb, created_at timestamptz default now(), updated_at timestamptz default now());
create unique index if not exists payments_provider_ref_unique on payments(provider,provider_ref) where provider_ref is not null;
alter table payments enable row level security;
drop policy if exists "admin all payments" on payments;
create policy "admin all payments" on payments for all using (is_admin()) with check (is_admin());

create table if not exists site_settings (key text primary key, value jsonb not null default '{}'::jsonb, updated_at timestamptz default now());
insert into site_settings (key,value) values ('payment','{"require_deposit":false,"deposit_percent":30,"eur_xof_rate":655.957,"usd_xof_rate":600}'::jsonb) on conflict (key) do nothing;
alter table site_settings enable row level security;
drop policy if exists "admin settings" on site_settings;
create policy "admin settings" on site_settings for all using (is_admin()) with check (is_admin());

-- Après avoir créé les 2 comptes dans Authentication > Users :
-- insert into admins (user_id,email,name) select id,email,'Bouvann' from auth.users where email='EMAIL_BOUVANN';
-- insert into admins (user_id,email,name) select id,email,'Équipe' from auth.users where email='EMAIL_EQUIPE';
