# Manual Database Migration Guide

## Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project (the one with URL: `https://lvbukwpecrtdtrsmqass.supabase.co`)

## Step 2: Open SQL Editor

1. In the left sidebar, click on **"SQL Editor"**
2. Click **"New query"** to create a new SQL query

## Step 3: Copy and Paste the Migration SQL

Copy the entire contents of the file `scripts/add-proforma-invoice-columns-fixed.sql` and paste it into the SQL editor.

## Step 4: Execute the Migration

1. Click the **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for the execution to complete
3. You should see a success message

## Step 5: Verify the Migration

Run this query to verify the columns were added:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND column_name IN ('user_id', 'package_id', 'payment_method', 'payment_link', 'payment_status');
```

You should see the new columns listed.

## Step 6: Test the API

After the migration is complete:

1. Restart your Next.js development server:
   ```bash
   npm run dev
   ```

2. Test the API endpoint:
   ```bash
   curl http://localhost:3000/api/proforma-invoices?userId=me
   ```

## Troubleshooting

### If you get permission errors:
- Make sure you're using the correct database connection
- Check that you have admin privileges on the project

### If you get column already exists errors:
- This is normal if the migration was partially run before
- The `IF NOT EXISTS` clauses will handle this gracefully

### If the API still returns 404:
- Check the browser console for any JavaScript errors
- Verify that the Next.js server is running
- Check that the route file exists at `src/app/api/proforma-invoices/route.ts`

## Alternative: Run Migration in Parts

If the full migration fails, you can run it in parts:

### Part 1: Add Columns
```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "package_id" UUID REFERENCES hour_package_templates(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(20) DEFAULT 'fiscal' CHECK ("payment_method" IN ('proforma', 'fiscal'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "payment_link" TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(20) DEFAULT 'pending' CHECK ("payment_status" IN ('pending', 'paid', 'failed', 'cancelled'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "payment_date" TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "payment_reference" VARCHAR(255);
ALTER TABLE invoice_clients ADD COLUMN IF NOT EXISTS "company_id" UUID REFERENCES companies(id);
```

### Part 2: Create Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices("user_id");
CREATE INDEX IF NOT EXISTS idx_invoices_package_id ON invoices("package_id");
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices("payment_method");
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices("payment_status");
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices("created_at");
```

### Part 3: Create Views and Policies
```sql
-- Create the views and policies from the full migration script
-- (Copy the rest of the script)
```

## Need Help?

If you're still having issues:

1. Check the Supabase logs in the dashboard
2. Verify your environment variables are correct
3. Make sure your database connection is working
4. Contact support if needed
