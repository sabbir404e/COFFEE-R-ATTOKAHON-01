-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- This updates the check constraint on 'orders' and 'payments' tables to allow 'confirmed' status.

-- 1. Drop existing check constraint on orders table if present
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Add updated check constraint to orders table with 'confirmed' allowed
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('paid', 'confirmed', 'preparing', 'ready', 'served', 'cancelled', 'failed', 'refunded'));

-- 3. Drop and update check constraint on payments table if present
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('paid', 'confirmed', 'preparing', 'ready', 'served', 'cancelled', 'failed', 'refunded'));
