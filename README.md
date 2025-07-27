# Cruiser Aviation Management System

A modern web application for managing Cruiser Aviations with comprehensive user management, role-based access control, and a beautiful UI built with Next.js, TypeScript, and Shadcn/ui.

## 🚀 Features

### User Management
- **Role-based Access Control**: 5 different user roles (Pilot, Flight Instructor, Base Manager, Admin, Super Admin)
- **User Registration & Authentication**: Secure JWT-based authentication with session management
- **User Profiles**: Comprehensive user profiles with flight-specific information
- **User Status Management**: Active, Inactive, Suspended, and Pending Approval statuses
- **Search & Filtering**: Advanced search and filtering capabilities for user management

### Security
- **Password Hashing**: Secure password storage using bcrypt
- **JWT Authentication**: Token-based authentication with session management
- **Role-based Permissions**: Hierarchical permission system
- **Input Validation**: Comprehensive form validation using Zod

### UI/UX
- **Modern Design**: Beautiful, responsive UI built with Shadcn/ui components
- **Dark/Light Mode**: Support for both themes
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Real-time Feedback**: Loading states, error handling, and success notifications

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Beautiful, accessible component library
- **React Hook Form** - Performant forms with validation
- **Zod** - TypeScript-first schema validation

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Primary database
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
- **PostgreSQL** database
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

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/flightschool?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# App
NEXTAUTH_SECRET="your-nextauth-secret-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed the database with initial data
npx prisma db seed
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
│   │   │   └── users/
│   │   ├── dashboard/
│   │   ├── login/
│   │   ├── register/
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── UserManagement.tsx
│   └── lib/
│       ├── auth.ts
│       ├── middleware.ts
│       ├── validations.ts
│       └── utils.ts
├── prisma/
│   └── schema.prisma
├── public/
└── package.json
```

## 👥 User Roles & Permissions

### Role Hierarchy
1. **Pilot** - Basic user access
2. **Flight Instructor** - Can manage students and flights
3. **Base Manager** - Can manage instructors and aircraft
4. **Admin** - Full system access
5. **Super Admin** - Highest level access

### Permissions
- **Pilot**: View own profile, update personal information
- **Flight Instructor**: All pilot permissions + manage students
- **Base Manager**: All instructor permissions + manage aircraft
- **Admin**: All permissions + user management
- **Super Admin**: All permissions + system configuration

## 🔐 Authentication Flow

1. **Registration**: Users register with email, password, and role
2. **Login**: Users authenticate with email and password
3. **JWT Token**: Server generates JWT token with user information
4. **Session Management**: Tokens stored in database with expiration
5. **Authorization**: Middleware validates tokens and permissions

## 📊 Database Schema

### Users Table
- Basic information (name, email, phone, address)
- Role and status
- Flight-specific fields (license, medical class, flight hours)
- Timestamps and audit trail

### Sessions Table
- JWT token storage
- User association
- Expiration management

## 🎨 UI Components

The application uses Shadcn/ui components for a consistent and beautiful design:

- **Cards** - Content containers
- **Tables** - Data display
- **Forms** - User input with validation
- **Buttons** - Interactive elements
- **Badges** - Status indicators
- **Avatars** - User profile pictures
- **Dialogs** - Modal windows
- **Alerts** - Notifications and messages

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- **Netlify**
- **Railway**
- **Heroku**
- **AWS**
- **DigitalOcean**

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Type checking
npm run type-check
```

### Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ User management
- ✅ Authentication system
- ✅ Role-based access control
- ✅ Modern UI/UX

### Phase 2 (Planned)
- [ ] Aircraft management
- [ ] Flight scheduling
- [ ] Maintenance tracking
- [ ] Student progress tracking

### Phase 3 (Future)
- [ ] Mobile app
- [ ] Advanced reporting
- [ ] Integration with flight planning software
- [ ] Real-time notifications

---

Built with ❤️ for Cruiser Aviations everywhere.
