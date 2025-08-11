# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.9] - 2025-01-27

### Added
- **Role Management System**
  - Comprehensive role-based access control (RBAC) system
  - Role management interface with capability matrix
  - Three-tier capability system: Menu, Data, and API access
  - Super admin-only access to role management
  - Real-time capability updates and role creation
  - Database schema for roles, capabilities, and menu items
  - PostgreSQL functions for role capability management
- **Enhanced Security Architecture**
  - Edge Middleware for route-level access control
  - Server-side guards for robust authentication
  - Multi-layered security with fail-closed approach
  - JWT token validation with proper claims (iss, aud, sub, nbf, iat)
  - Role-based route protection with 404 redirects
  - Next.js 15 compatible middleware implementation
- **Access Control Improvements**
  - Prospect users restricted from flight logs access
  - Fleet management view-only access for prospects
  - Role-based navigation filtering in sidebar
  - Secure API endpoints with proper authorization headers
  - Clean 404 redirects for unauthorized access

### Fixed
- Next.js 15 compatibility issues with params handling
- Role capabilities API params destructuring errors
- Duplicate Role Management menu items in sidebar
- Role management page header showing "Dashboard" instead of "Role Management"
- Redundant text in role management page content
- Login redirect loop issues with middleware
- JWT verification errors in Edge Runtime
- Role management API authorization header issues
- Array handling errors in role management client

### Changed
- Improved role management UI with clean, minimal design
- Enhanced security posture with proper JWT implementation
- Better user experience with role-based navigation
- Streamlined access control with clear permission boundaries
- Updated middleware configuration for better performance

## [0.1.8] - 2025-01-27

### Added
- **Community Board System**
  - Open community board for pilots to post Asks and Offers
  - Real-time feed with WebSocket integration
  - Post types: Ask (requests for help) and Offer (ways to help)
  - Response system with "I Can Help" functionality
  - Peer invitation system with shareable invite links
  - Email notifications for responses
  - Post filtering by base, category, and date
  - Response management for post authors (accept/reject)
  - Real-time updates for post counts and status changes
  - Mobile-responsive design with modern UI
- **WebSocket Infrastructure**
  - Standalone WebSocket server on port 3003
  - Real-time communication for community board
  - Connection status indicators
  - Automatic reconnection and heartbeat
  - Event-driven notifications system
- **Next.js 15 Compatibility**
  - Updated params handling for dynamic routes
  - React.use() integration for Promise-based params
  - Improved TypeScript type safety

### Fixed
- Next.js 15 params Promise compatibility in invite routes
- Response count updates after submitting responses
- Post status updates when responses are accepted
- Share functionality error handling for user cancellation
- Page spacing consistency across all authenticated pages
- Email notification service integration
- WebSocket connection error handling

### Changed
- Enhanced community board UI with better spacing and layout
- Improved error handling and user feedback
- Updated invite system with better share functionality
- Enhanced response management interface

## [0.1.7] - 2025-08-09

### Added
- **Sitewide Announcement Bar System**
  - Reusable, dismissible announcement bar component
  - Fixed-top positioning with content offset
  - iOS safe area support for mobile devices
  - localStorage persistence for dismissal state
  - ResizeObserver for dynamic height management
  - CSS custom properties for seamless integration
- **Veriff Identity Verification Announcement Bar**
  - Targeted announcement for unverified users
  - Session-based dismissal with automatic reappearance on login
  - Direct navigation to "Verification" tab in My Account
  - Modern gradient styling with responsive design
  - Mobile-optimized layout (hidden text and badges)
- **Enhanced Dashboard Quick Actions**
  - "Log New Flight" button with black styling
  - Direct navigation to flight logs with modal opening
  - "View Flight Logs" navigation
  - "Check Weather" popup with "Available soon" message
- **Real-time Monthly Statistics**
  - Live calculation of current month flight data
  - This month vs last month comparisons
  - Percentage change indicators with trend arrows
  - Enhanced "This Month" card with flight hours display

### Fixed
- `dateOfBirth.toISOString` error in user management
- Mobile sidebar hamburger menu positioning and z-index issues
- Logo alignment and sizing in mobile sidebar
- Announcement bar content overlap with sidebar
- TypeScript errors in FlightLogs component
- User role mapping and interface definitions

### Changed
- Improved mobile sidebar layout and transitions
- Enhanced announcement bar styling and positioning
- Updated dashboard layout with better content spacing
- Refined UI components for better mobile experience
- Improved TypeScript type safety across components

## [Unreleased]

### Added
- Invoice Engine Microservice with template system
- 4 invoice templates (Modern, Classic, Minimalist, Romanian)
- Proforma to fiscal invoice workflow
- BNR exchange rate integration for EUR to RON conversion
- VAT calculation and display
- Custom invoice numbering system
- Email integration with PDF attachments
- Template customization system

### Fixed
- TypeScript interface mismatches in microservice client
- Empty string validation issues in invoice generation
- Payment method type definitions
- User data field mapping for invoice generation

### Changed
- Replaced SmartBill integration with custom microservice
- Updated "Place order" functionality to use new invoice system
- Enhanced PDF generation with company and client details
- Improved error handling and validation

## [0.1.6] - 2025-08-08

### Added
- Invoice Engine Microservice integration
- Template-based invoice generation system
- Romanian business compliance features
- Currency conversion (EUR to RON)
- VAT calculation and display
- Enhanced PDF generation with company details
- Email notification system for invoices

### Fixed
- TypeScript interface issues in microservice client
- Validation errors for empty address fields
- Payment method type definitions
- User data mapping for invoice generation

### Changed
- Replaced SmartBill API with custom microservice
- Updated order placement workflow
- Enhanced invoice PDF formatting
- Improved error handling and user feedback

## [0.1.5] - 2025-08-07

### Added
- Hour packages management system
- Usage tracking and reporting
- FIFO method for hour consumption
- PPL course tranche management
- Flight type categorization (Ferry, Demo, Charter)
- Personal vs Company usage views
- Export functionality for usage reports

### Fixed
- TypeScript compilation errors
- Component interface definitions
- API route validation
- Database query optimizations

### Changed
- Enhanced usage dashboard with detailed metrics
- Improved role-based access control
- Better error handling and user feedback
- Updated UI components for better UX

## [0.1.4] - 2025-08-06

### Added
- User management system
- Role-based access control
- Authentication and authorization
- Password reset functionality
- User profile management

### Fixed
- Database schema issues
- API endpoint security
- TypeScript type definitions

### Changed
- Improved security measures
- Enhanced user experience
- Better error handling

## [0.1.3] - 2025-08-05

### Added
- Initial project setup
- Basic authentication
- Database integration
- Core UI components

### Fixed
- Build configuration issues
- Development environment setup

### Changed
- Project structure improvements
- Development workflow optimization
