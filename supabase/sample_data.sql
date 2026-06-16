-- Sample data for Kitchen Manager.
-- RUN ORDER: 1) schema.sql  2) sign up once in the app  3) this file.
-- Rows are tied to your owner account (auth.uid()). This script picks the
-- first/only user in auth.users. If you have more than one, set the email below.

do $$
declare
  owner uuid;
  -- menu ids
  m_rice uuid; m_65 uuid; m_egg uuid; m_biry uuid; m_gobi uuid; m_cool uuid;
  ord uuid;
  d int;
begin
  -- pick the owner (first signed-up user). To force a specific account:
  --   select id into owner from auth.users where email = 'you@restaurant.com';
  select id into owner from auth.users order by created_at asc limit 1;
  if owner is null then
    raise exception 'No user found. Sign up in the app first, then re-run this.';
  end if;

  -- fresh start (only this owner's rows)
  delete from public.orders          where owner_id = owner;
  delete from public.menu_items      where owner_id = owner;
  delete from public.inventory_items where owner_id = owner;

  -- ---------- MENU ----------
  insert into public.menu_items (owner_id, name, category, price, available) values
    (owner, 'Chicken Rice',     'Rice',     120, true) returning id into m_rice;
  insert into public.menu_items (owner_id, name, category, price, available) values
    (owner, 'Chicken 65',       'Starter',  150, true) returning id into m_65;
  insert into public.menu_items (owner_id, name, category, price, available) values
    (owner, 'Egg Fried Rice',   'Rice',     110, true) returning id into m_egg;
  insert into public.menu_items (owner_id, name, category, price, available) values
    (owner, 'Chicken Biryani',  'Rice',     180, true) returning id into m_biry;
  insert into public.menu_items (owner_id, name, category, price, available) values
    (owner, 'Gobi 65',          'Starter',  130, true) returning id into m_gobi;
  insert into public.menu_items (owner_id, name, category, price, available) values
    (owner, 'Soft Drink',       'Beverage',  30, true) returning id into m_cool;

  -- ---------- INVENTORY ----------
  insert into public.inventory_items (owner_id, name, qty, unit, low_threshold) values
    (owner, 'Chicken',    8, 'kg',  2),
    (owner, 'Rice',      15, 'kg',  5),
    (owner, 'Eggs',      30, 'pcs', 12),
    (owner, 'Oil',        4, 'L',   2),
    (owner, 'Soft Drink', 5, 'pcs', 6);   -- below threshold → shows as low

  -- ---------- ORDERS (spread over the last 7 days) ----------
  -- helper to add an order with two line items
  -- day offset d: 0 = today ... 6 = six days ago
  for d in 0..6 loop
    -- order A of the day: Chicken Rice + Chicken 65 (cash, paid)
    insert into public.orders (owner_id, total, status, payment_method, created_at)
      values (owner, 120 + 150, 'paid', 'cash', now() - make_interval(days => d, hours => 4))
      returning id into ord;
    insert into public.order_items (owner_id, order_id, menu_item_id, name, price, qty) values
      (owner, ord, m_rice, 'Chicken Rice', 120, 1),
      (owner, ord, m_65,   'Chicken 65',   150, 1);

    -- order B of the day: Biryani + Soft Drink (upi, paid)
    insert into public.orders (owner_id, total, status, payment_method, created_at)
      values (owner, 180 + 30, 'paid', 'upi', now() - make_interval(days => d, hours => 2))
      returning id into ord;
    insert into public.order_items (owner_id, order_id, menu_item_id, name, price, qty) values
      (owner, ord, m_biry, 'Chicken Biryani', 180, 1),
      (owner, ord, m_cool, 'Soft Drink',       30, 1);
  end loop;

  -- one open (unpaid) order today
  insert into public.orders (owner_id, total, status, payment_method, created_at)
    values (owner, 130 + 110, 'unpaid', 'cash', now() - make_interval(hours => 1))
    returning id into ord;
  insert into public.order_items (owner_id, order_id, menu_item_id, name, price, qty) values
    (owner, ord, m_gobi, 'Gobi 65',        130, 1),
    (owner, ord, m_egg,  'Egg Fried Rice', 110, 1);

  raise notice 'Sample data loaded for owner %', owner;
end $$;
