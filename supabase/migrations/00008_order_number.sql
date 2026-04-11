-- Auto-incrementing order number for human-readable references
alter table public.orders add column order_number serial;
