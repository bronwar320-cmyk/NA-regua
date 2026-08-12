-- Na Régua Barber Shop
-- Rode este SQL no SQL Editor do seu projeto Supabase.
-- Depois crie os DOIS usuários no Authentication > Users:
-- bryanyttcontato@gmail.com
-- naregua@icloud.com
-- Use a senha escolhida pelo dono SOMENTE no Supabase Auth.
--
-- Não coloque senha de administrador em tabela pública nem no JavaScript.

create extension if not exists pgcrypto;

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,
  email text,
  service text not null,
  date date not null,
  time text not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz not null default now()
);

create unique index if not exists appointments_active_slot
on public.appointments(date,time)
where status <> 'cancelled';

create index if not exists appointments_date_idx on public.appointments(date);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.appointments enable row level security;
alter table public.chat_messages enable row level security;

-- Visitantes podem criar agendamentos e ler os horários para saber o que está ocupado.
drop policy if exists "public can read appointments" on public.appointments;
create policy "public can read appointments"
on public.appointments for select
to anon, authenticated
using (true);

drop policy if exists "public can create appointments" on public.appointments;
create policy "public can create appointments"
on public.appointments for insert
to anon, authenticated
with check (
  char_length(name) between 1 and 80
  and char_length(whatsapp) between 1 and 30
  and char_length(service) between 1 and 100
);

-- Apenas usuários autenticados podem atualizar/cancelar.
drop policy if exists "authenticated can update appointments" on public.appointments;
create policy "authenticated can update appointments"
on public.appointments for update
to authenticated
using (auth.email() in ('bryanyttcontato@gmail.com','naregua@icloud.com'))
with check (auth.email() in ('bryanyttcontato@gmail.com','naregua@icloud.com'));

-- Chat: visitantes enviam e todos podem ler.
drop policy if exists "public can read chat" on public.chat_messages;
create policy "public can read chat"
on public.chat_messages for select
to anon, authenticated
using (true);

drop policy if exists "public can send chat" on public.chat_messages;
create policy "public can send chat"
on public.chat_messages for insert
to anon, authenticated
with check (char_length(name) between 1 and 60 and char_length(message) between 1 and 500);

-- Realtime
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.chat_messages;

-- Observação importante:
-- O limite de 10 vagas é reforçado pelo app e deve ser acompanhado pelo dono.
-- O índice único impede dois clientes de ocupar o MESMO horário ao mesmo tempo.
