-- Add price column to menu_items
alter table public.menu_items add column price numeric(10,2);

-- Add passcode column to venues for admin auth
alter table public.venues add column passcode text not null default '0000';

-- RLS policies for admin operations
-- (Passcode auth is checked in server actions, not RLS)

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
