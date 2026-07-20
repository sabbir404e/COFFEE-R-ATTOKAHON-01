-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- This adds all relevant tables to the supabase_realtime publication
-- so that realtime events are actually broadcast to subscribers.

ALTER PUBLICATION supabase_realtime ADD TABLE dining_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Verify: should now show 6 tables instead of 0
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
