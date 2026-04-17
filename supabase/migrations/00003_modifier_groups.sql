-- Modifier groups belong to a menu item
create table public.modifier_groups (
  id           uuid primary key default uuid_generate_v4(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  name         text not null,
  sort_order   int  not null default 0,
  created_at   timestamptz not null default now()
);

create index idx_modifier_groups_menu_item on public.modifier_groups(menu_item_id);

-- Individual options within a group
create table public.modifier_options (
  id                uuid primary key default uuid_generate_v4(),
  modifier_group_id uuid not null references public.modifier_groups(id) on delete cascade,
  name              text not null,
  price_adjustment  numeric(10,2) not null default 0,
  sort_order        int  not null default 0,
  created_at        timestamptz not null default now()
);

create index idx_modifier_options_group on public.modifier_options(modifier_group_id);

-- Store selected modifiers snapshot on each order line item
alter table public.order_items add column selected_modifiers jsonb not null default '[]';

-- RLS
alter table public.modifier_groups  enable row level security;
alter table public.modifier_options enable row level security;

create policy "Anyone can read modifier groups"
  on public.modifier_groups for select using (true);
create policy "Anyone can insert modifier groups"
  on public.modifier_groups for insert with check (true);
create policy "Anyone can update modifier groups"
  on public.modifier_groups for update using (true) with check (true);
create policy "Anyone can delete modifier groups"
  on public.modifier_groups for delete using (true);

create policy "Anyone can read modifier options"
  on public.modifier_options for select using (true);
create policy "Anyone can insert modifier options"
  on public.modifier_options for insert with check (true);
create policy "Anyone can update modifier options"
  on public.modifier_options for update using (true) with check (true);
create policy "Anyone can delete modifier options"
  on public.modifier_options for delete using (true);
