-- Migrate Gianluca's legacy invoices to link by user_id
-- Gianluca Di Pinto: 057919c3-97d5-436b-b72b-dd73681cfcd1
-- Email: giandipinto@gmail.com

-- Update invoice_clients table to link Gianluca's invoices by email
UPDATE invoice_clients 
SET user_id = '057919c3-97d5-436b-b72b-dd73681cfcd1'
WHERE email = 'giandipinto@gmail.com'
  AND user_id IS NULL;

-- Show the results
SELECT 
  ic.id,
  ic.name,
  ic.email,
  ic.user_id,
  i.smartbill_id,
  i.payment_method
FROM invoice_clients ic
JOIN invoices i ON ic.invoice_id = i.id
WHERE ic.email = 'giandipinto@gmail.com'
ORDER BY i.smartbill_id;
