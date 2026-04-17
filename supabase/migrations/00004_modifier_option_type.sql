-- Add modifier_type column: 'add' or 'remove'
alter table public.modifier_options
  add column modifier_type text not null default 'add';

alter table public.modifier_options
  add constraint modifier_options_modifier_type_check
  check (modifier_type in ('add', 'remove'));
