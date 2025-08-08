# Supabase Counter Persistence Setup

This guide explains how to set up persistent invoice counters using your existing Supabase database.

## 🎯 **Overview**

The microservice now supports persistent invoice counters stored in Supabase, ensuring that invoice numbers remain sequential even after microservice restarts.

## 📋 **Prerequisites**

1. **Existing Supabase Project**: You already have a Supabase project for your main app
2. **Service Role Key**: Access to your Supabase service role key
3. **Database Access**: Ability to create tables in your Supabase database

## 🚀 **Setup Steps**

### **Step 1: Install Dependencies**

```bash
cd microservice-invoice-engine
npm install @supabase/supabase-js
```

### **Step 2: Configure Environment Variables**

Add these to your `.env` file:

```bash
# Supabase Configuration (for persistent counters)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**To find these values:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "Project URL" and "service_role" key

### **Step 3: Create Database Table**

Run the setup script:

```bash
cd scripts
node setup-invoice-counters.js
```

This will:
- Create the `invoice_counters` table
- Insert initial counter values (PROF: 1000, FISC: 1000)
- Set up RLS policies
- Verify the setup

### **Step 4: Test the Setup**

1. **Start the microservice**:
   ```bash
   cd microservice-invoice-engine
   node src/index.js
   ```

2. **Check counters**:
   ```bash
   curl -X GET http://localhost:3002/api/invoices/counters \
     -H "Authorization: Bearer your-api-key-here"
   ```

3. **Create a test invoice**:
   ```bash
   curl -X POST http://localhost:3002/api/commands \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-api-key-here" \
     -d '{
       "command": "issue_proforma_invoice",
       "data": {
         "userId": "test-persistent",
         "packageId": "test-persistent",
         "packageName": "Persistent Counter Test",
         "hours": 5,
         "pricePerHour": 100,
         "totalPrice": 500,
         "currency": "EUR",
         "validityDays": 180,
         "userData": {
           "email": "julian.pad@me.com",
           "name": "Julian Pad"
         },
         "paymentMethod": "card",
         "paymentLink": true,
         "vatPercentage": 21,
         "pricesIncludeVat": true,
         "convertToRON": true
       }
     }'
   ```

4. **Restart the microservice** and check counters again to verify persistence

## 🔧 **How It Works**

### **Counter Persistence**
- Counters are stored in the `invoice_counters` table
- Each invoice series (PROF, FISC) has its own counter
- Counters are atomically incremented using database transactions
- Fallback to in-memory counters if Supabase is unavailable

### **Database Schema**
```sql
CREATE TABLE invoice_counters (
  id SERIAL PRIMARY KEY,
  series VARCHAR(10) NOT NULL UNIQUE,
  current_counter INTEGER NOT NULL,
  start_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **API Endpoints**
- `GET /api/invoices/counters` - Get current counters
- `POST /api/commands` - Create invoices (automatically increments counters)
- `POST /api/invoices/:id/mark-paid` - Generate fiscal invoices

## 🛡️ **Security**

- **RLS Policies**: Only authenticated users can read/update counters
- **Service Role**: Uses service role key for database operations
- **Fallback**: Graceful degradation to in-memory counters if database is unavailable

## 🔍 **Monitoring**

### **Check Counter Status**
```bash
curl -X GET http://localhost:3002/api/invoices/counters \
  -H "Authorization: Bearer your-api-key-here"
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "proforma": {
      "series": "PROF",
      "currentCounter": 1005,
      "startNumber": 1000,
      "updatedAt": "2025-08-08T15:45:00Z"
    },
    "fiscal": {
      "series": "FISC", 
      "currentCounter": 1002,
      "startNumber": 1000,
      "updatedAt": "2025-08-08T15:40:00Z"
    }
  }
}
```

### **Database Queries**
```sql
-- View all counters
SELECT * FROM invoice_counters ORDER BY series;

-- Check counter history
SELECT series, current_counter, updated_at 
FROM invoice_counters 
ORDER BY updated_at DESC;
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"Supabase configuration not found"**
   - Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
   - Verify the service role key has the correct permissions

2. **"Error getting invoice counter"**
   - Ensure the `invoice_counters` table exists
   - Check RLS policies are correctly configured
   - Verify database connectivity

3. **Counters not incrementing**
   - Check database logs for errors
   - Verify the service role key has UPDATE permissions
   - Ensure the table has the correct schema

### **Fallback Behavior**
If Supabase is unavailable, the microservice will:
- Log a warning message
- Use in-memory counters
- Continue functioning normally
- Resume Supabase usage when available

## 📈 **Benefits**

1. **Persistent Counters**: Invoice numbers remain sequential across restarts
2. **Scalability**: Supports multiple microservice instances
3. **Reliability**: Graceful fallback to in-memory counters
4. **Monitoring**: Easy to track counter usage and history
5. **Security**: Proper RLS policies and authentication

## 🎯 **Next Steps**

1. **Production Deployment**: Update your production environment variables
2. **Monitoring**: Set up alerts for counter-related errors
3. **Backup**: Ensure the `invoice_counters` table is included in backups
4. **Testing**: Verify persistence across multiple restarts and deployments
