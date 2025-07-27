# Supabase Setup Guide

## Quick Setup for Cruiser Aviation App

### 1. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings > Database**
4. Copy the following information:

#### Database Connection String
```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

#### Project URL
```
https://[YOUR-PROJECT-REF].supabase.co
```

#### Anon Key
- Go to **Settings > API**
- Copy the "anon public" key

### 2. Create Environment File

```bash
cp env.production.example .env.production
```

### 3. Update Environment Variables

Edit `.env.production` with your Supabase details:

```env
# Supabase Database
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# JWT Secret (generate a random one)
JWT_SECRET="your-super-secret-jwt-key-here"

# Next.js
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret"

# Cloudflare
CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
CLOUDFLARE_ACCOUNT_ID="your-cloudflare-account-id"

# Supabase (Optional)
SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
```

### 4. Test Database Connection

```bash
node scripts/setup-supabase.js
```

### 5. Deploy to Cloudflare

```bash
./deploy-cloudflare.sh
```

## What I Need From You

Please provide:

1. **Your Supabase Project URL** (e.g., `https://abc123.supabase.co`)
2. **Your Database Password** (from Supabase Settings > Database)
3. **Your Anon Key** (from Supabase Settings > API)

Once you provide these, I can help you set up the environment variables and deploy! 