-- Webiko Builder — skema database
-- Jalankan di SQL Editor Supabase, sekali. Aman dijalankan ulang.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text,
  name text,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'Project baru',
  files jsonb not null default '{}'::jsonb,
  status text not null default 'idle'
    check (status in ('idle', 'jalan', 'selesai', 'gagal')),
  step int not null default 0,
  tokens bigint not null default 0,
  error text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_daily (
  user_id uuid not null references public.users(id) on delete cascade,
  day date not null default current_date,
  builds int not null default 0,
  tokens bigint not null default 0,
  primary key (user_id, day)
);

create table if not exists public.usage_global (
  day date primary key,
  tokens bigint not null default 0
);

create table if not exists public.rate_limits (
  scope text not null,
  subject text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (scope, subject, window_start)
);

create index if not exists projects_user_idx on public.projects (user_id, updated_at desc);
create index if not exists messages_project_idx on public.messages (project_id, id desc);
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

-- Semua akses lewat server. RLS menyala tanpa policy = tidak ada akses publik.
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.usage_daily enable row level security;
alter table public.usage_global enable row level security;
alter table public.rate_limits enable row level security;

-- Kuota Build harian, atomik per pengguna.
create or replace function public.mulai_build(p_user uuid, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v int;
begin
  insert into usage_daily (user_id, day, builds, tokens)
  values (p_user, current_date, 0, 0)
  on conflict (user_id, day) do nothing;

  select builds into v
    from usage_daily
   where user_id = p_user and day = current_date
   for update;

  if v >= p_limit then
    return false;
  end if;

  update usage_daily
     set builds = builds + 1
   where user_id = p_user and day = current_date;

  return true;
end;
$$;

-- Catat token yang sudah terpakai. Mengembalikan false bila batas global lewat.
create or replace function public.catat_token(p_user uuid, p_tokens bigint, p_limit bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v bigint;
begin
  insert into usage_daily (user_id, day, builds, tokens)
  values (p_user, current_date, 0, p_tokens)
  on conflict (user_id, day)
  do update set tokens = usage_daily.tokens + excluded.tokens;

  insert into usage_global (day, tokens)
  values (current_date, p_tokens)
  on conflict (day)
  do update set tokens = usage_global.tokens + excluded.tokens
  returning tokens into v;

  return v <= p_limit;
end;
$$;

-- Rate limit berbasis jendela waktu tetap.
create or replace function public.naikkan_rate(
  p_scope text,
  p_subject text,
  p_window timestamptz,
  p_limit int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v int;
begin
  insert into rate_limits (scope, subject, window_start, count)
  values (p_scope, p_subject, p_window, 1)
  on conflict (scope, subject, window_start)
  do update set count = rate_limits.count + 1
  returning count into v;

  return v <= p_limit;
end;
$$;

revoke all on function public.mulai_build(uuid, int) from public, anon, authenticated;
revoke all on function public.catat_token(uuid, bigint, bigint) from public, anon, authenticated;
revoke all on function public.naikkan_rate(text, text, timestamptz, int) from public, anon, authenticated;

grant execute on function public.mulai_build(uuid, int) to service_role;
grant execute on function public.catat_token(uuid, bigint, bigint) to service_role;
grant execute on function public.naikkan_rate(text, text, timestamptz, int) to service_role;

grant select, insert, update, delete
  on public.users, public.projects, public.messages,
     public.usage_daily, public.usage_global, public.rate_limits
  to service_role;

grant usage, select
  on all sequences in schema public
  to service_role;
