-- OCD Live: partners and complete package metadata
alter table packages add column if not exists short_description text;
alter table packages add column if not exists inclusions jsonb default '[]'::jsonb;
alter table packages add column if not exists live_count integer not null default 1 check (live_count > 0);
alter table packages add column if not exists live_duration_min integer;
alter table packages add column if not exists modes text[] default array['presentiel','distance']::text[];
alter table packages add column if not exists deposit_percent integer default 30 check (deposit_percent between 0 and 100);
alter table packages add column if not exists mention text;
alter table packages add column if not exists price_confirmed boolean default false;

update packages set
  short_description=coalesce(short_description, description),
  live_count=case id when 'semaine' then 5 when 'mois' then 20 else 1 end,
  live_duration_min=coalesce(live_duration_min, duration_min),
  modes=coalesce(modes, array['presentiel','distance']::text[]),
  deposit_percent=coalesce(deposit_percent, 30),
  inclusions=case
    when inclusions is not null and jsonb_array_length(inclusions)>0 then inclusions
    when id='express' then '["1 live de 1h30","Régie professionnelle"]'::jsonb
    when id='demi' then '["4 heures de live","Meilleur prix à l heure"]'::jsonb
    when id='boost' then '["1 live de 1h30","Annonce du live par Bouvann"]'::jsonb
    when id='semaine' then '["5 lives de 1h30","À répartir dans la même semaine"]'::jsonb
    when id='mois' then '["1 live par jour ouvré","Annonces incluses"]'::jsonb
    else '["Besoin analysé par l équipe","Devis personnalisé"]'::jsonb
  end
where true;

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_light text,
  logo_dark text,
  url text,
  active boolean not null default false,
  speed text not null default 'normal' check (speed in ('slow','normal')),
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists partners_name_key on partners(name);

insert into partners (name, logo_light, active, speed, sort)
values ('BOVANN GROUP', '/media/bovann-group.webp', true, 'normal', 10)
on conflict (name) do update set logo_light=excluded.logo_light;

insert into partners (name, logo_light, active, speed, sort)
values ('House of Challenge', null, false, 'normal', 20)
on conflict (name) do update set name=excluded.name;

alter table reservations add column if not exists package_snapshot jsonb;
alter table reservations add column if not exists selected_dates jsonb default '[]'::jsonb;
alter table reservations add column if not exists announcement_date date;
alter table reservations add column if not exists quote_status text;
alter table reservations add column if not exists deposit_amount int;

alter table partners enable row level security;
drop policy if exists "public read active partners" on partners;
create policy "public read active partners" on partners for select using (active = true);

create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from admins where user_id=auth.uid())
$$;

drop policy if exists "admins manage partners" on partners;
create policy "admins manage partners" on partners for all using (is_admin()) with check (is_admin());
