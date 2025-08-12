-- Debug script to check Daia's invoices
-- Run this in your Supabase SQL Editor

-- Step 1: Find Daia's user record
SELECT 
  id,
  email,
  "firstName",
  "lastName",
  role
FROM users 
WHERE "firstName" ILIKE '%Daia%' 
   OR "lastName" ILIKE '%Daia%'
   OR email ILIKE '%daia%';

-- Step 2: Check if any invoice_clients are linked to Daia's user_id
-- (Replace 'DAIA_USER_ID' with the actual ID from step 1)
SELECT 
  ic.id,
  ic.email,
  ic.name,
  ic.user_id,
  i.smartbill_id,
  i.issue_date,
  i.total_amount
FROM invoice_clients ic
JOIN invoices i ON ic.invoice_id = i.id
WHERE ic.user_id = '9043dc12-13d7-4763-a7ac-4d6d8a300ca5'  -- Daia's user ID
ORDER BY i.issue_date DESC;

-- Step 3: Check all invoice_clients with Daia's email
SELECT 
  ic.id,
  ic.email,
  ic.name,
  ic.user_id,
  i.smartbill_id,
  i.issue_date,
  i.total_amount
FROM invoice_clients ic
JOIN invoices i ON ic.invoice_id = i.id
WHERE ic.email ILIKE '%daia%'
   OR ic.email ILIKE '%ops@cruiseraviation.ro%'
ORDER BY i.issue_date DESC;

-- Step 4: Check total count of invoice_clients with user_id populated
SELECT 
  COUNT(*) as total_invoice_clients,
  COUNT(user_id) as with_user_id,
  COUNT(*) - COUNT(user_id) as without_user_id
FROM invoice_clients;

-- Step 5: Show some examples of unlinked invoice_clients
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
ORDER BY invoice_count DESC
LIMIT 10;
