-- Kitchen Nova — shop profile + GST + stock purchases + void restock.
-- RUN AFTER 02_profit_inventory.sql, in Supabase → SQL Editor → Run.

-- 1) shop profile (one row per owner) — for receipts + GST
create table if not exists public.shop_profile (
  owner_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  shop_name     text not null default 'My Kitchen',
  address       text,
  phone         text,
  gstin         text,
  gst_enabled   boolean not null default false,
  gst_rate      numeric(5,2) not null default 5,   -- % added on bills
  receipt_footer text default 'Thank you! Visit again.',
  updated_at    timestamptz not null default now()
);

-- 2) tax on orders
alter table public.orders add column if not exists tax numeric(10,2) not null default 0;

-- 3) stock purchase log (stock-in)
create table if not exists public.stock_purchases (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  qty               numeric(10,3) not null default 0,
  unit_price        numeric(10,2) not null default 0,
  amount            numeric(10,2) not null default 0,
  bought_on         date not null default current_date,
  created_at        timestamptz not null default now()
);
create index if not exists idx_purchase_owner on public.stock_purchases(owner_id, bought_on desc);

-- 4) RLS
alter table public.shop_profile    enable row level security;
alter table public.stock_purchases enable row level security;
do $$
declare t text;
begin
  foreach t in array array['shop_profile','stock_purchases']
  loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated
         using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;

-- 5) restock when an order line is removed (void/delete) — reverse of the deduct trigger
create or replace function public.fn_order_item_restock()
returns trigger language plpgsql as $$
begin
  update public.inventory_items i
  set qty = i.qty + r.qty_per_plate * OLD.qty
  from public.recipe_items r
  where r.menu_item_id = OLD.menu_item_id
    and i.id = r.inventory_item_id
    and i.owner_id = OLD.owner_id;
  return OLD;
end $$;

drop trigger if exists trg_order_item_restock on public.order_items;
create trigger trg_order_item_restock
  after delete on public.order_items
  for each row execute function public.fn_order_item_restock();
