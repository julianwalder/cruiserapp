# Deployment Guide

This guide will help you deploy the Cruiser Aviation Flight School Management System to production.

## Prerequisites

1. **GitHub Account** - Code is already pushed to GitHub
2. **Cloudflare Account** - For hosting and database
3. **Database** - PostgreSQL database (Cloudflare D1 or external)

## Step 1: Set Up Cloudflare Account

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Create a new account or sign in
3. Get your API token from Account Settings > API Tokens

## Step 2: Set Up Supabase Database

### Option A: Supabase (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or use existing one
3. Get your database connection details:
   - Go to Settings > Database
   - Copy the connection string
   - Note your database password

### Option B: Other PostgreSQL Services

Use a service like:
- [Neon](https://neon.tech/) (Free tier available)
- [Railway](https://railway.app/) (Free tier available)
- [PlanetScale](https://planetscale.com/) (Free tier available)

## Step 3: Configure Environment Variables

1. Copy the environment template:
   ```bash
   cp env.production.example .env.production
   ```

2. Update the variables in `.env.production`:
   ```env
   # Supabase Database
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
   
   # JWT Secret
   JWT_SECRET="your-super-secret-jwt-key"
   
   # Next.js
   NEXTAUTH_URL="https://your-domain.com"
   NEXTAUTH_SECRET="your-nextauth-secret"
   
   # Cloudflare
   CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
   CLOUDFLARE_ACCOUNT_ID="your-cloudflare-account-id"
   
   # Supabase (Optional)
   SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
   SUPABASE_ANON_KEY="your-supabase-anon-key"
   ```

## Step 4: Deploy to Cloudflare Pages

### Method 1: Using Wrangler CLI

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Deploy using the script:
   ```bash
   ./deploy-cloudflare.sh
   ```

### Method 2: Using Cloudflare Dashboard

1. Go to Cloudflare Dashboard > Pages
2. Click "Create a project"
3. Connect your GitHub repository
4. Configure build settings:
   - Build command: `npm run build`
   - Build output directory: `.next`
   - Node.js version: 18
5. Add environment variables from Step 3
6. Deploy

## Step 5: Set Up Database Schema

1. Run the Supabase database setup:
   ```bash
   node scripts/setup-supabase.js
   ```

2. This will:
   - Test database connection
   - Run all migrations
   - Create initial roles
   - Create a super admin user
   - Show database statistics

## Step 6: Configure Custom Domain (Optional)

1. In Cloudflare Pages, go to your project
2. Click "Custom domains"
3. Add your domain
4. Update DNS records as instructed

## Step 7: Set Up Continuous Deployment

1. In Cloudflare Pages, enable automatic deployments
2. Configure branch deployments:
   - Production: `main` branch
   - Staging: `develop` branch (optional)

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for JWT token signing | Yes |
| `NEXTAUTH_URL` | Your application URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Yes |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | Yes |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | Yes |

## Default Login Credentials

After running the database setup script:

- **Email**: admin@cruiseraviation.ro
- **Password**: admin123

⚠️ **Important**: Change the password immediately after first login!

## Troubleshooting

### Common Issues

1. **Build fails**: Check Node.js version (should be 18+)
2. **Database connection fails**: Verify DATABASE_URL format
3. **JWT errors**: Ensure JWT_SECRET is set and unique
4. **API routes not working**: Check Cloudflare Pages routing configuration

### Support

If you encounter issues:
1. Check Cloudflare Pages logs
2. Verify environment variables
3. Test database connection locally
4. Check GitHub repository for latest updates

## Security Considerations

1. Use strong, unique secrets for JWT_SECRET and NEXTAUTH_SECRET
2. Enable HTTPS (automatic with Cloudflare)
3. Regularly update dependencies
4. Monitor application logs
5. Set up proper backup strategy for database
6. Use environment-specific configurations

## Performance Optimization

1. Enable Cloudflare caching
2. Use CDN for static assets
3. Optimize database queries
4. Enable compression
5. Monitor performance metrics

## Backup Strategy

1. **Database**: Set up automated backups
2. **Code**: GitHub provides version control
3. **Environment**: Document all configurations
4. **Files**: Use Cloudflare R2 for file storage

## Monitoring

1. Set up Cloudflare Analytics
2. Monitor error rates
3. Track performance metrics
4. Set up alerts for critical issues 