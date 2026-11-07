-- Persist the buyer's closed-registry visual choice. The value is never rendered
-- without registry lookup, so it cannot become an arbitrary URL or HTML payload.
ALTER TABLE public.gift_vouchers
  ADD COLUMN IF NOT EXISTS gift_card_design_id TEXT;
