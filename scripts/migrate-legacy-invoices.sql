-- Migration Script: Update Legacy Invoices with User IDs
-- This script links legacy invoices to users based on email matching
-- Run this in your Supabase SQL Editor

-- Step 1: Update invoice_clients to link users by email
-- This will populate the user_id field for legacy invoices where the email matches a user
UPDATE invoice_clients 
SET user_id = users.id
FROM users 
WHERE invoice_clients.email = users.email 
  AND invoice_clients.user_id IS NULL
  AND users.email IS NOT NULL;

-- Step 2: Show the results of the migration
SELECT 
  'Migration Results' as info,
  COUNT(*) as total_invoice_clients,
  COUNT(user_id) as linked_to_users,
  COUNT(*) - COUNT(user_id) as unlinked_clients
FROM invoice_clients;

-- Step 3: Show which users now have linked invoices
SELECT 
  u.email,
  u."firstName",
  u."lastName",
  COUNT(ic.id) as invoice_count
FROM users u
JOIN invoice_clients ic ON u.id = ic.user_id
GROUP BY u.id, u.email, u."firstName", u."lastName"
ORDER BY invoice_count DESC;

-- Step 4: Show unlinked clients (for manual review)
SELECT 
  ic.email,
  ic.name,
  ic.vat_code,
  COUNT(i.id) as invoice_count
FROM invoice_clients ic
JOIN invoices i ON ic.invoice_id = i.id
WHERE ic.user_id IS NULL
  AND ic.email IS NOT NULL
GROUP BY ic.email, ic.name, ic.vat_code
ORDER BY invoice_count DESC;
