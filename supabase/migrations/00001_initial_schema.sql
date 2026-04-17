-- =============================================================
-- Promptly Database Schema  —  Initial Migration
-- =============================================================

create extension if not exists "uuid-ossp";

-- ----- VENUES ------------------------------------------------
create table public.venues (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,
  logo_url      text,
  primary_color text not null default '#000000',
  accent_color  text not null default '#3b82f6',

  -- Configurable labels
  location_type_label  text not null default 'Location',
  customer_id_label    text,
  customer_id_required boolean not null default false,

  -- Fulfillment options
  allow_pickup   boolean not null default true,
  allow_delivery boolean not null default true,

  -- Admin auth
  passcode text not null default '0000',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----- LOCATIONS ---------------------------------------------
create table public.locations (
  id        uuid primary key default uuid_generate_v4(),
  venue_id  uuid not null references public.venues(id) on delete cascade,
  code      text not null unique,
  name      text not null,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_locations_venue on public.locations(venue_id);
create index idx_locations_code  on public.locations(code);

-- ----- MENU CATEGORIES ---------------------------------------
create table public.menu_categories (
  id         uuid primary key default uuid_generate_v4(),
  venue_id   uuid not null references public.venues(id) on delete cascade,
  name       text not null,
  sort_order int  not null default 0,

  created_at timestamptz not null default now()
);

create index idx_menu_categories_venue on public.menu_categories(venue_id);

-- ----- MENU ITEMS --------------------------------------------
create table public.menu_items (
  id          uuid primary key default uuid_generate_v4(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name        text not null,
  description text,
  price       numeric(10,2),
  icon_url    text,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_menu_items_venue    on public.menu_items(venue_id);
create index idx_menu_items_category on public.menu_items(category_id);

-- ----- ORDERS ------------------------------------------------
create type public.fulfillment_type as enum ('pickup', 'delivery');
create type public.order_status     as enum ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

create table public.orders (
  id                uuid primary key default uuid_generate_v4(),
  venue_id          uuid not null references public.venues(id) on delete cascade,
  location_id       uuid not null references public.locations(id) on delete cascade,
  fulfillment        public.fulfillment_type not null,
  delivery_location  text,
  customer_id_value  text,
  status             public.order_status not null default 'pending',
  notes              text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_venue    on public.orders(venue_id);
create index idx_orders_location on public.orders(location_id);
create index idx_orders_status   on public.orders(status);

-- ----- ORDER ITEMS -------------------------------------------
create table public.order_items (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  quantity     int  not null default 1 check (quantity > 0),

  created_at timestamptz not null default now()
);

create index idx_order_items_order on public.order_items(order_id);

-- ----- ROW LEVEL SECURITY ------------------------------------
alter table public.venues          enable row level security;
alter table public.locations       enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;

-- Public read policies (anonymous QR code scans)
create policy "Anyone can read venues"
  on public.venues for select using (true);

create policy "Anyone can read active locations"
  on public.locations for select using (is_active = true);

create policy "Anyone can read menu categories"
  on public.menu_categories for select using (true);

create policy "Anyone can read active menu items"
  on public.menu_items for select using (is_active = true);

-- Public insert policies (anonymous order submission)
create policy "Anyone can create orders"
  on public.orders for insert with check (true);

create policy "Anyone can create order items"
  on public.order_items for insert with check (true);

-- Admin write policies (passcode auth checked in server actions, not RLS)
create policy "Anyone can update venues"
  on public.venues for update using (true) with check (true);

create policy "Anyone can insert menu categories"
  on public.menu_categories for insert with check (true);

create policy "Anyone can update menu categories"
  on public.menu_categories for update using (true) with check (true);

create policy "Anyone can delete menu categories"
  on public.menu_categories for delete using (true);

create policy "Anyone can read all menu items"
  on public.menu_items for select using (true);

create policy "Anyone can insert menu items"
  on public.menu_items for insert with check (true);

create policy "Anyone can update menu items"
  on public.menu_items for update using (true) with check (true);

create policy "Anyone can delete menu items"
  on public.menu_items for delete using (true);

-- Staff read policies (authenticated users)
create policy "Authenticated users can read orders"
  on public.orders for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read order items"
  on public.order_items for select using (auth.role() = 'authenticated');

-- ----- UPDATED_AT TRIGGER ------------------------------------
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_venues_updated_at
  before update on public.venues
  for each row execute function public.update_updated_at();

create trigger trg_locations_updated_at
  before update on public.locations
  for each row execute function public.update_updated_at();

create trigger trg_menu_items_updated_at
  before update on public.menu_items
  for each row execute function public.update_updated_at();

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at();
