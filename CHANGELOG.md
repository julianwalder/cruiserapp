# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
