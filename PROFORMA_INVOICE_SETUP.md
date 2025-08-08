# Proforma Invoice & Payment Link System

This document explains the proforma invoice and payment link functionality for hour package orders in the Cruiser Aviation Management System.

## Overview

The proforma invoice system allows users to generate invoices and payment links for hour package orders. It intelligently consolidates user data from multiple sources to ensure all mandatory fields for fiscal invoices are available.

## Features

- **Data Consolidation**: Automatically combines user data from multiple sources
- **Smartbill Integration**: Generates invoices directly in Smartbill
- **Payment Links**: Creates secure payment links for customers
- **Data Validation**: Validates user data before invoice generation
- **Universal Access**: All authenticated users can generate proforma invoices
- **Automatic Conversion**: Proforma invoices automatically become fiscal invoices when payment is received
- **Payment Status Tracking**: Real-time tracking of payment status and conversion
- **Company Support**: Handles both individual and company invoices
- **Proforma & Fiscal**: Supports both proforma and fiscal invoice types

## Data Sources

The system consolidates user data from the following sources in order of priority:

### 1. Veriff Verification (Most Reliable)
- **ID Number**: 13-digit personal identification number
- **Personal Details**: First name, last name, nationality, gender
- **Address**: Country information

### 2. User Profile
- **Personal Information**: First name, last name, email, phone
- **Address**: Street address, city, state, zip code, country
- **Personal Number**: CNP or other identification

### 3. Smartbill Imports (Historical Data)
- **CNP**: Personal identification from previous invoices
- **Client Data**: Name, address, contact information

### 4. Company Relationships (Optional)
- **Company Information**: Name, VAT code, address
- **Company Details**: Contact information, location

## Mandatory Fields

For fiscal invoices, the following fields are mandatory:

### Personal Identification
- **CNP or ID Number**: Personal identification number (13 digits)

### Personal Information
- **First Name & Last Name**: Full legal name
- **Email**: Contact email address

### Address Information
- **Street Address**: Complete street address
- **City**: City or municipality
- **Country**: Country of residence

## Database Schema

### New Columns Added to `invoices` Table

```sql
-- User relationship
"user_id" UUID REFERENCES users(id)

-- Package relationship  
"package_id" UUID REFERENCES hour_package_templates(id)

-- Invoice type
"payment_method" VARCHAR(20) DEFAULT 'fiscal' CHECK ("payment_method" IN ('proforma', 'fiscal'))

-- Payment information
"payment_link" TEXT
"payment_status" VARCHAR(20) DEFAULT 'pending' CHECK ("payment_status" IN ('pending', 'paid', 'failed', 'cancelled'))
"payment_date" TIMESTAMP WITH TIME ZONE
"payment_reference" VARCHAR(255)
```

### New Columns Added to `invoice_clients` Table

```sql
-- Company relationship
"company_id" UUID REFERENCES companies(id)
```

## API Endpoints

### GET `/api/proforma-invoices`
Retrieves user invoice data and validates it for invoice generation.

**Query Parameters:**
- `userId` (optional): User ID to get data for (admins only)

**Response:**
```json
{
  "userData": {
    "userId": "uuid",
    "cnp": "string",
    "idNumber": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "city": "string",
    "country": "string",
    "companyId": "uuid",
    "companyName": "string",
    "companyVatCode": "string"
  },
  "validation": {
    "valid": true,
    "missingFields": []
  },
  "canGenerateInvoice": true
}
```

### POST `/api/proforma-invoices`
Generates a proforma invoice and optionally a payment link.

**Request Body:**
```json
{
  "packageId": "uuid",
  "paymentMethod": "proforma" | "fiscal",
  "paymentLink": true | false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Proforma invoice generated successfully",
  "data": {
    "invoiceId": "uuid",
    "smartbillId": "string",
    "paymentLink": "string",
    "package": {
      "name": "string",
      "hours": 10,
      "totalPrice": 1200.00,
      "currency": "EUR"
    },
    "userData": {
      "name": "string",
      "email": "string",
      "hasCompany": true
    }
  }
}
```

### PUT `/api/proforma-invoices/[id]/payment-status`
Updates the payment status of an invoice. When payment is received, proforma invoices are automatically converted to fiscal invoices.

**Request Body:**
```json
{
  "paymentStatus": "paid" | "failed" | "cancelled",
  "paymentReference": "string" // Optional payment provider reference
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment status updated to paid"
}
```

### GET `/api/proforma-invoices/[id]/payment-status`
Retrieves the current payment status of an invoice.

**Response:**
```json
{
  "success": true,
  "paymentStatus": {
    "method": "proforma" | "fiscal",
    "status": "pending" | "paid" | "failed" | "cancelled",
    "date": "2024-01-15T10:30:00Z",
    "reference": "stripe_pi_123456",
    "smartbillId": "INV-2024-001",
    "amount": 1200.00,
    "currency": "EUR"
  }
}
```

## Payment Workflow

### 1. Proforma Invoice Generation
- User selects an hour package
- System validates user data completeness
- Proforma invoice is generated in Smartbill
- Payment link is created (if requested)
- Invoice is stored with `payment_method = 'proforma'` and `payment_status = 'pending'`

### 2. Payment Processing
- User clicks payment link and completes payment
- Payment provider sends webhook to update status
- System updates `payment_status = 'paid'` and `payment_date = NOW()`
- If original invoice was proforma, it's automatically converted to fiscal
- Smartbill invoice is updated to reflect fiscal status

### 3. Invoice Lifecycle
```
Proforma Invoice (pending) → Payment Received → Fiscal Invoice (paid)
```

**Note**: All authenticated users can generate proforma invoices. The system automatically handles the conversion from proforma to fiscal when payment is confirmed.

## Setup Instructions

### 1. Database Migration

Run the database migration script to add the necessary columns:

```bash
# Execute the SQL script
psql -d your_database -f scripts/add-proforma-invoice-columns.sql
```

### 2. Environment Variables

Add the following environment variables to your `.env.local`:

```env
# Smartbill Configuration
SMARTBILL_USERNAME=your_smartbill_username
SMARTBILL_PASSWORD=your_smartbill_password
SMARTBILL_CIF=your_company_cif

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Payment Provider Integration

The payment link generation is currently a placeholder. To integrate with a real payment provider:

1. **Stripe Integration**:
```typescript
// In ProformaInvoiceService.generatePaymentLink()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: `Invoice ${smartbillId}`,
      },
      unit_amount: Math.round(amount * 100), // Convert to cents
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
});

return session.url;
```

2. **PayPal Integration**:
```typescript
// Similar implementation for PayPal
```

## Usage

### 1. Access the Proforma Invoice Generator

Navigate to `/billing/proforma-invoices` in the application.

### 2. Data Validation

The system will automatically validate user data and show:
- ✅ Available data (green checkmark)
- ⚠️ Missing data (yellow warning)

### 3. Generate Invoice

1. Select an hour package
2. Choose invoice type (proforma or fiscal)
3. Optionally enable payment link generation
4. Click "Generate Invoice"

### 4. Review Generated Invoice

The system will display:
- Invoice ID and Smartbill ID
- Payment link (if generated)
- Package details
- User information

## User Interface

### ProformaInvoiceGenerator Component

The main component provides:

- **Data Validation Display**: Shows what user data is available/missing
- **Package Selection**: Radio buttons for available hour packages
- **Invoice Type Selection**: Proforma vs Fiscal
- **Payment Link Option**: Checkbox to generate payment links
- **Order Summary**: Shows selected package details
- **Success Modal**: Displays generated invoice information

### Page Structure

```
/billing/proforma-invoices/
├── Generate Invoice Tab
│   ├── Data Validation
│   ├── Package Selection
│   ├── Invoice Configuration
│   └── Success Modal
├── Overview Tab
│   ├── Statistics Cards
│   └── Recent Activity
└── Help & Requirements Tab
    ├── Data Requirements
    ├── Data Sources
    └── Invoice Types
```

## Data Flow

1. **User Data Retrieval**:
   - Fetch user profile data
   - Get Veriff verification data
   - Retrieve Smartbill import data
   - Check company relationships

2. **Data Consolidation**:
   - Prioritize Veriff data (most reliable)
   - Fallback to profile data
   - Use Smartbill data for CNP
   - Include company data if available

3. **Validation**:
   - Check mandatory fields
   - Validate data completeness
   - Show missing fields to user

4. **Invoice Generation**:
   - Create Smartbill invoice
   - Store database record
   - Generate payment link (if requested)
   - Return success response

## Error Handling

### Common Errors

1. **Missing User Data**:
   - Error: "Missing required data for invoice generation"
   - Solution: Complete user profile or Veriff verification

2. **Smartbill Connection**:
   - Error: "Failed to generate Smartbill invoice"
   - Solution: Check Smartbill credentials and connection

3. **Package Not Found**:
   - Error: "Hour package not found or inactive"
   - Solution: Ensure package exists and is active

### Validation Errors

The system provides detailed feedback on missing data:

```json
{
  "error": "Missing required data for invoice generation",
  "missingFields": ["CNP or ID Number", "Complete Address (Street, City, Country)"],
  "userData": { /* current user data */ }
}
```

## Security Considerations

### Data Privacy

- User data is only accessible to the user and administrators
- Veriff verification data is treated as sensitive information
- Company data is only included if user has permission

### Access Control

- Users can only generate invoices for themselves
- Administrators can generate invoices for any user
- Payment links are secured with proper authentication

### Audit Trail

- All invoice generation is logged
- Payment status changes are tracked
- User actions are recorded for compliance

## Troubleshooting

### Data Not Appearing

1. **Check Veriff Status**: Ensure user has completed Veriff verification
2. **Verify Profile Data**: Check if user profile is complete
3. **Smartbill Imports**: Ensure previous invoices are imported
4. **Company Relationships**: Verify company linking if applicable

### Invoice Generation Fails

1. **Smartbill Credentials**: Verify username, password, and CIF
2. **Network Connection**: Check internet connectivity
3. **Database Connection**: Ensure Supabase connection is working
4. **Package Status**: Verify hour package is active

### Payment Links Not Working

1. **Payment Provider**: Ensure payment provider is configured
2. **Environment Variables**: Check payment provider credentials
3. **URL Configuration**: Verify return and cancel URLs
4. **SSL Certificate**: Ensure HTTPS is properly configured

## Future Enhancements

### Planned Features

1. **Bulk Invoice Generation**: Generate multiple invoices at once
2. **Invoice Templates**: Customizable invoice templates
3. **Payment Tracking**: Real-time payment status updates
4. **Email Notifications**: Automatic invoice and payment notifications
5. **Invoice Analytics**: Detailed reporting and analytics
6. **Multi-Currency Support**: Support for multiple currencies
7. **Tax Calculation**: Automatic tax calculation based on location
8. **Invoice Scheduling**: Schedule invoice generation for future dates

### Integration Opportunities

1. **Accounting Software**: Integration with QuickBooks, Xero, etc.
2. **Banking APIs**: Direct bank transfer integration
3. **CRM Systems**: Customer relationship management integration
4. **ERP Systems**: Enterprise resource planning integration
5. **Tax Authorities**: Direct reporting to tax authorities

## Support

For technical support or questions about the proforma invoice system:

1. Check the application logs for error details
2. Verify all environment variables are set correctly
3. Ensure database migration has been completed
4. Test Smartbill connection independently
5. Contact the development team with specific error messages

## Related Documentation

- [Smartbill Integration Setup](./SMARTBILL_SETUP.md)
- [Veriff Integration Setup](./VERIFF_INTEGRATION_SETUP.md)
- [Database Schema Documentation](./README.md#database-schema)
- [API Documentation](./README.md#api-endpoints)
