# Cruiser Aviation Management System

A comprehensive flight school management system built with Next.js, TypeScript, and Supabase.

## ✨ Features

- **User Management** - Complete user registration, authentication, and role-based access control
- **Flight Log Management** - Track flight hours, aircraft usage, and pilot training progress
- **Aircraft Fleet Management** - Manage aircraft inventory, maintenance, and availability
- **Airfield Management** - Organize airfields, bases, and operational areas
- **Reporting & Analytics** - Generate comprehensive reports and flight statistics
- **Real-time Updates** - Live data synchronization across all users
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Beautiful, accessible component library
- **React Hook Form** - Performant forms with validation
- **Zod** - TypeScript-first schema validation

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **Supabase** - PostgreSQL database with real-time features
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token management

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Static type checking

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Supabase** account and project
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd cruiserapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL="your-supabase-project-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# App Configuration
NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# ICAO Scraper (Optional)
ICAO_SCRAPER_TOKEN="change_this_to_a_strong_random_value"
NEXT_PUBLIC_ICAO_SCRAPER_TOKEN="change_this_to_a_strong_random_value"
```

### 4. Set Up Supabase Database

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and API keys from the project settings
3. Update your `.env.local` file with the Supabase credentials
4. Run the setup script to initialize the database:

```bash
npm run setup
```

### 5. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
cruiserapp/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   ├── logout/
│   │   │   │   └── register/
│   │   │   ├── users/
│   │   │   ├── fleet/
│   │   │   ├── flight-logs/
│   │   │   ├── airfields/
│   │   │   └── reports/
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── register/
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   ├── UserManagement.tsx
│   │   ├── FleetManagement.tsx
│   │   ├── FlightLogs.tsx
│   │   └── Reports.tsx
│   └── lib/
│       ├── auth.ts
│       ├── supabase.ts
│       └── utils.ts
├── scripts/
│   └── setup.js
├── public/
└── package.json
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run setup` - Initialize database with default data

## 🗄️ Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:

- **users** - User accounts and profiles
- **roles** - User roles and permissions
- **userRoles** - Many-to-many relationship between users and roles
- **aircraft** - Aircraft inventory and specifications
- **flightLogs** - Flight records and training data
- **airfields** - Airfield information and operational areas
- **baseManagement** - Base management and assignments

## 🔐 Authentication & Authorization

The system uses JWT tokens for authentication and implements role-based access control:

- **SUPER_ADMIN** - Full system access
- **ADMIN** - Administrative functions
- **BASE_MANAGER** - Base management operations
- **INSTRUCTOR** - Flight instruction and training
- **PILOT** - Flight logging and aircraft operations
- **STUDENT** - Limited access for training

## 🚀 Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set up environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Make sure to set all required environment variables in your production environment:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in the `/docs` folder

## 🔄 Changelog

### v1.0.0
- Initial release
- Complete user management system
- Flight log tracking
- Aircraft fleet management
- Airfield management
- Role-based access control
- Real-time data synchronization with Supabase
