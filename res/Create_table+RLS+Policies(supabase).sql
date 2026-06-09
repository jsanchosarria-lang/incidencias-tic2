-- 1) Extensión para UUID (si no está)
create extension if not exists pgcrypto;

-- 2) Tabla de incidencias
create table if not exists public.incidencias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  aula text not null,
  equipo text not null,
  tipo text not null check (tipo in ('Red','Impresora','Software','Hardware','Otro')),
  descripcion text not null,
  estado text not null default 'abierta' check (estado in ('abierta','cerrada'))
);

-- 3) Activar RLS
alter table public.incidencias enable row level security;

-- 4) Policies: SOLO el propietario
drop policy if exists "Incidencias: select own" on public.incidencias;
create policy "Incidencias: select own"
on public.incidencias
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Incidencias: insert own" on public.incidencias;
create policy "Incidencias: insert own"
on public.incidencias
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Incidencias: update own" on public.incidencias;
create policy "Incidencias: update own"
on public.incidencias
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());