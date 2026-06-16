-- Kitchen Nova — Profit/Loss + auto inventory deduction.
-- RUN AFTER schema.sql, in Supabase → SQL Editor → New query → Run.

-- 1) cost columns
alter table public.inventory_items add column if not exists unit_cost numeric(10,2) not null default 0;   -- ₹ per unit (what YOU pay)
alter table public.order_items    add column if not exists cost      numeric(10,2) not null default 0;   -- food cost per plate, snapshot at sale time
alter table public.orders         add column if not exists tendered  numeric(10,2) not null default 0;   -- cash customer handed over (for change calc)

-- 2) recipe: dish -> ingredient + qty used per plate
create table if not exists public.recipe_items (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  menu_item_id      uuid not null references public.menu_items(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  qty_per_plate     numeric(10,3) not null default 0,
  unique (menu_item_id, inventory_item_id)
);

-- 3) overhead expenses (rent, gas, salary, ...)
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category    text not null default 'General',
  amount      numeric(10,2) not null default 0,
  note        text,
  spent_on    date not null default current_date,
  created_at  timestamptz not null default now()
);

create index if not exists idx_recipe_menu  on public.recipe_items(menu_item_id);
create index if not exists idx_recipe_owner on public.recipe_items(owner_id);
create index if not exists idx_exp_owner_day on public.expenses(owner_id, spent_on desc);

-- 4) RLS — same own-rows rule as the rest of the app
alter table public.recipe_items enable row level security;
alter table public.expenses     enable row level security;
do $$
declare t text;
begin
  foreach t in array array['recipe_items','expenses']
  loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated
         using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;

-- 5) trigger: on each sold line, snapshot food cost + auto-deduct stock
create or replace function public.fn_order_item_cost_and_stock()
returns trigger language plpgsql as $$
declare
  food_cost numeric(10,2);
begin
  -- per-plate food cost from the recipe
  select coalesce(sum(r.qty_per_plate * i.unit_cost), 0) into food_cost
  from public.recipe_items r
  join public.inventory_items i on i.id = r.inventory_item_id
  where r.menu_item_id = NEW.menu_item_id;
  NEW.cost := food_cost;

  -- reduce stock by (recipe qty x plates sold), never below 0
  update public.inventory_items i
  set qty = greatest(0, i.qty - r.qty_per_plate * NEW.qty)
  from public.recipe_items r
  where r.menu_item_id = NEW.menu_item_id
    and i.id = r.inventory_item_id
    and i.owner_id = NEW.owner_id;

  return NEW;
end $$;

drop trigger if exists trg_order_item_cost_stock on public.order_items;
create trigger trg_order_item_cost_stock
  before insert on public.order_items
  for each row execute function public.fn_order_item_cost_and_stock();
