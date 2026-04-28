-- Visual chassis configuration for the customer-facing order page.
--
-- Promptly's customer page is being re-skinned with an "Editorial" chassis
-- (magazine-styled, serif display). A second chassis ("Modern") is planned;
-- both will read these fields. Fields here are deliberately chassis-agnostic
-- copy — what to put in the masthead, what to call the location question,
-- what the success headline says — not chassis-specific styling.
--
-- All fields are nullable except where the chassis needs a never-empty
-- string (submit_cta_label, success_headline) — those carry sensible
-- defaults that the Editorial chassis is happy to render verbatim.
--
-- Notable non-additions (deliberate, see PR description):
--   - location_type_label is NOT added — it already exists with a different
--     meaning (the noun for a location row, e.g. "Hole" / "Pier"). The new
--     masthead-subhead concept is named location_subhead instead.
--   - fulfillment_modes is NOT added — the existing allow_pickup /
--     allow_delivery booleans already represent it. The chassis derives a
--     'both' | 'delivery' | 'pickup' value at render time.

alter table public.venues
  add column tagline                          text,
  add column location_subhead                 text,
  add column location_question_label          text,
  add column submit_cta_label                 text not null default 'Submit Request',
  add column success_headline                 text not null default 'On its way.',
  add column fulfillment_copy                 text,
  add column default_fulfillment_eta_minutes  int,
  add column billing_state                    text not null default 'house_account'
    check (billing_state in ('house_account', 'tab', 'complimentary', 'paid'));
