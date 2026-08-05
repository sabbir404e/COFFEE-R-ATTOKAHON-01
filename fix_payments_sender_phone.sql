-- Run this once in Supabase Dashboard -> SQL Editor.
-- Checkout stores the payer's mobile number with each payment, and the Admin
-- Payments page reads this column to display it.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS sender_phone text;
