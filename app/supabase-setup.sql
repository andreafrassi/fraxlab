-- FraxLab — setup Supabase
-- Incolla tutto questo file nel SQL Editor di Supabase e premi Run (una volta sola).

-- 1. Tabella profili: una riga per utente registrato.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  can_view_players boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 2. Helper per le policy admin.
-- security definer = gira con i privilegi del creatore, quindi NON riapplica le
-- policy di profiles su se stesso: evita la ricorsione infinita che si otterrebbe
-- scrivendo una policy su profiles che interroga profiles.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 3. Alla registrazione crea automaticamente il profilo.
-- Anche questo è security definer, quindi bypassa RLS: non serve una policy INSERT.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Policy di accesso.
drop policy if exists "utente legge il proprio profilo" on public.profiles;
create policy "utente legge il proprio profilo"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "admin legge tutti i profili" on public.profiles;
create policy "admin legge tutti i profili"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "admin modifica i profili" on public.profiles;
create policy "admin modifica i profili"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- 5. Se ti sei già registrato prima di lanciare questo script, la riga del profilo
-- non esiste. Questa insert recupera tutti gli utenti auth già presenti.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- 6. Sincronizzazione dati tra dispositivi (strategie, leghe, aste).
-- Una riga per utente: tutto il contenuto di DB (localStorage) salvato come JSON.
create table if not exists public.user_data (
  id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "utente legge i propri dati" on public.user_data;
create policy "utente legge i propri dati"
  on public.user_data for select
  using (id = auth.uid());

drop policy if exists "utente scrive i propri dati" on public.user_data;
create policy "utente scrive i propri dati"
  on public.user_data for insert
  with check (id = auth.uid());

drop policy if exists "utente aggiorna i propri dati" on public.user_data;
create policy "utente aggiorna i propri dati"
  on public.user_data for update
  using (id = auth.uid())
  with check (id = auth.uid());
