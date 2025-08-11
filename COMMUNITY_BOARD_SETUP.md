# Community Board Feature Setup Guide

## Overview
The Community Board is an open, invite-driven community feature where pilots can ask for help, offer support, and connect with fellow aviators. This guide will help you set up and deploy the Community Board feature.

## Features

### 🎯 Core Features
- **Ask/Offer Posts**: Users can create posts asking for help or offering support
- **Real-time Feed**: View all open posts with filtering and search
- **Response System**: Users can respond to posts and connect with each other
- **Peer Invitations**: Invite-driven community growth with unique invite codes
- **Post Expiration**: Posts automatically expire after 48 hours

### 📱 User Experience
- **Modern UI**: Clean, responsive design with dark mode support
- **Real-time Updates**: Live feed updates and notifications
- **Mobile Friendly**: Optimized for mobile and desktop use
- **Easy Navigation**: Intuitive filtering and search capabilities

## Database Setup

### 1. Run the Database Schema
Execute the SQL script to create all necessary tables:

```bash
# Copy the SQL content from scripts/community-board-setup.sql
# Run it in your Supabase SQL Editor
```

This creates:
- `help_posts` - Main posts table
- `help_responses` - Responses to posts
- `peer_invitations` - Invite tracking
- Database views for optimized queries
- Row Level Security (RLS) policies
- Helper functions for invite codes and post expiration

### 2. Verify Setup
Check that all tables and policies were created successfully in your Supabase dashboard.

## Frontend Components

### 📁 Component Structure
```
src/components/
├── CommunityBoard.tsx          # Main community board component
├── CreatePostModal.tsx         # Modal for creating new posts
├── PostCard.tsx               # Individual post display
├── ResponseModal.tsx          # Modal for responding to posts
└── InviteFriendsModal.tsx     # Modal for inviting friends
```

### 🎨 UI Components Used
- **shadcn/ui**: Button, Card, Dialog, Input, Textarea, Select, Badge
- **Lucide Icons**: HelpCircle, HandHeart, Users, MessageSquare, etc.
- **Tailwind CSS**: Responsive design and styling

## API Routes

### 📡 API Endpoints
```
/api/community-board/
├── posts/                     # GET, POST - List and create posts
├── responses/                 # GET, POST - Handle responses
└── invite/                    # GET, POST, PUT - Invite management
```

### 🔐 Authentication
All API routes use the existing authentication middleware (`requireAuth`).

## Navigation Integration

### 🧭 Sidebar Menu
The Community Board is automatically added to the sidebar navigation with:
- **Icon**: MessageSquare
- **Title**: "Community Board"
- **URL**: `/community-board`
- **Description**: "Ask for help and offer support"

### 📄 Page Title
The page title is automatically set to "Community Board" in the AppLayout.

## Invite System

### 🔗 Invite Flow
1. **Generate Invite**: Users can generate unique invite codes
2. **Share Invite**: Share via link, copy to clipboard, or native sharing
3. **Validate Invite**: New users validate invite codes during registration
4. **Link User**: System links new users to their inviter

### 📄 Invite Page
- **URL**: `/invite/[code]`
- **Features**: Invite validation, community preview, registration/login flow

## Post Categories

### 🏷️ Available Categories
- **Safety Pilot**: Need a safety pilot for flights
- **Cost Sharing**: Split costs for trips or training
- **Training Help**: Assistance with training or certification
- **Social Flight**: Recreational flying opportunities
- **Other**: General aviation-related requests

## Post Types

### ❓ Ask Posts
- Users request help, assistance, or resources
- Examples: "Need safety pilot for night flight", "Looking for cost sharing partner"

### 🤝 Offer Posts
- Users offer help, resources, or opportunities
- Examples: "Available for short-field coaching", "Offering spare seat for Venice trip"

## Response System

### 💬 Response Flow
1. **View Post**: Users see posts in the community feed
2. **Respond**: Click "I Can Help" or "I'm Interested"
3. **Add Message**: Optional message with response
4. **Author Review**: Post author can accept/decline responses
5. **Connection**: Users can connect and coordinate

## Post Lifecycle

### ⏰ Post Expiration
- **Default Duration**: 48 hours
- **Auto-expiration**: Posts automatically marked as expired
- **Cron Job**: Run `scripts/expire-community-posts.js` regularly

### 📊 Post Status
- **Open**: Active and accepting responses
- **Matched**: Successfully connected with responder
- **Expired**: Past expiration date

## Security & Permissions

### 🔒 Row Level Security (RLS)
- **Posts**: Users can view all open posts, edit only their own
- **Responses**: Users can view responses to their posts or their own responses
- **Invites**: Users can only manage their own invites

### 👥 Access Control
- **All Users**: Can view and create posts
- **Post Authors**: Can edit/delete their own posts
- **Post Authors**: Can manage responses to their posts

## Deployment

### 🚀 Production Setup
1. **Database**: Run the SQL setup script in production
2. **Environment Variables**: Ensure Supabase credentials are set
3. **Cron Jobs**: Set up post expiration job (recommended: every hour)
4. **Monitoring**: Monitor API usage and database performance

### 🔧 Cron Job Setup
```bash
# Add to your crontab (runs every hour)
0 * * * * cd /path/to/your/app && node scripts/expire-community-posts.js
```

## Usage Examples

### 📝 Creating a Post
1. Navigate to Community Board
2. Click "Create Ask" or "Create Offer"
3. Fill in title, description, category, and optional details
4. Submit post

### 🔗 Inviting Friends
1. Click "Invite Friends" on Community Board
2. Copy invite link or use native sharing
3. Friends click link and join community

### 💬 Responding to Posts
1. Browse community feed
2. Click "I Can Help" or "I'm Interested"
3. Add optional message
4. Submit response

## Customization

### 🎨 Styling
- Modify Tailwind classes in components
- Update color schemes in `getCategoryColor` functions
- Customize icons from Lucide React

### 📊 Categories
- Add new categories in the SQL schema
- Update category arrays in components
- Modify category labels and colors

### ⏱️ Expiration
- Change default expiration time in API
- Modify cron job frequency
- Update expiration logic in database function

## Troubleshooting

### 🔍 Common Issues
1. **Posts not loading**: Check RLS policies and database views
2. **Invite codes not working**: Verify database function exists
3. **Responses not submitting**: Check user permissions and post status
4. **UI not updating**: Verify API responses and component state

### 📋 Debug Checklist
- [ ] Database tables created successfully
- [ ] RLS policies enabled and working
- [ ] API routes responding correctly
- [ ] Frontend components importing correctly
- [ ] Authentication working for all routes
- [ ] Invite system generating unique codes

## Future Enhancements

### 🚀 Phase 2 Features
- **Real-time Notifications**: WebSocket integration for live updates
- **Badge System**: Recognition for helpful community members
- **Advanced Filtering**: Filter by friends, base, or date range
- **Public Board**: SEO-friendly public community board
- **Missions**: Group flight coordination features

### 📈 Analytics
- Track community growth and engagement
- Monitor post categories and response rates
- Analyze invite conversion rates
- Measure user retention and activity

## Support

For issues or questions about the Community Board feature:
1. Check the troubleshooting section
2. Review database logs and API responses
3. Verify all setup steps were completed
4. Test with different user roles and permissions

---

**Happy flying and building community! ✈️**
