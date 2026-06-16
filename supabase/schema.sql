-- Restaurant Manager — Supabase schema
-- Run this once in Supabase Studio → SQL Editor → New query → Run.
-- Single-owner app: every row scoped to the logged-in user (auth.uid()).

-- ============ MENU ============
create table if not exists public.menu_items (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  category    text default 'General',
  price       numeric(10,2) not null default 0,
  available   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============ ORDERS ============
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  total           numeric(10,2) not null default 0,
  status          text not null default 'paid',      -- paid | unpaid
  payment_method  text default 'cash',               -- cash | upi | card
  note            text,
  created_at      timestamptz not null default now()
);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  order_id      uuid not null references public.orders(id) on delete cascade,
  menu_item_id  uuid references public.menu_items(id) on delete set null,
  name          text not null,
  price         numeric(10,2) not null default 0,
  qty           integer not null default 1
);

-- ============ INVENTORY ============
create table if not exists public.inventory_items (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null,
  qty           numeric(10,2) not null default 0,
  unit          text default 'pcs',
  low_threshold numeric(10,2) not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_orders_owner_created on public.orders(owner_id, created_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_menu_owner on public.menu_items(owner_id);
create index if not exists idx_inv_owner on public.inventory_items(owner_id);

-- ============ ROW LEVEL SECURITY ============
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.inventory_items enable row level security;

-- One policy per table: you can only see/touch your own rows.
do $$
declare t text;
begin
  foreach t in array array['menu_items','orders','order_items','inventory_items']
  loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated
         using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;
