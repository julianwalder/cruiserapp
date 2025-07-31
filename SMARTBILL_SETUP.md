# SmartBill Integration Setup

This guide will help you set up the SmartBill integration to fetch and manage your invoices within the application.

## Overview

The SmartBill integration allows you to:
- View all your issued invoices
- Filter invoices by date range and status
- View invoice details and statistics
- Manage your financial data in one place

## Prerequisites

1. **SmartBill Account**: You need an active SmartBill Cloud account
2. **API Access**: Your SmartBill account must have API access enabled
3. **API Credentials**: Username and password for API authentication

## Setup Instructions

### 1. Get SmartBill API Credentials

1. Log in to your SmartBill Cloud account at [https://cloud.smartbill.ro/](https://cloud.smartbill.ro/)
2. Navigate to **Settings** → **API Access**
3. Enable API access if not already enabled
4. Note down your API username and password

### 2. Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# SmartBill API Configuration
SMARTBILL_USERNAME=your_smartbill_username
SMARTBILL_PASSWORD=your_smartbill_password
```

For production deployment on Vercel, add these variables to your Vercel project settings:

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the SmartBill credentials

### 3. Deploy the Changes

If you're using Vercel, the changes will be automatically deployed. If not, deploy your application with the new environment variables.

### 4. Test the Integration

1. Navigate to your application's dashboard
2. Go to the **Accounting** tab
3. You should see the SmartBill Invoices section
4. Click "Refresh" to test the connection

## API Endpoints

The integration provides the following API endpoints:

### Get All Invoices
```
GET /api/smartbill/invoices
```

**Query Parameters:**
- `startDate` (optional): Filter invoices from this date (YYYY-MM-DD)
- `endDate` (optional): Filter invoices until this date (YYYY-MM-DD)
- `status` (optional): Filter by invoice status (draft, sent, paid, overdue, cancelled)

**Example:**
```
GET /api/smartbill/invoices?startDate=2024-01-01&endDate=2024-12-31&status=paid
```

### Get Specific Invoice
```
GET /api/smartbill/invoices/[id]
```

### Get Invoice Statistics
```
GET /api/smartbill/stats
```

**Query Parameters:**
- `startDate` (optional): Start date for statistics (YYYY-MM-DD)
- `endDate` (optional): End date for statistics (YYYY-MM-DD)

## Features

### Invoice Management
- **View All Invoices**: See a comprehensive list of all your invoices
- **Filter by Date Range**: Select specific date ranges to view invoices
- **Filter by Status**: Filter invoices by their current status
- **Real-time Data**: Data is fetched directly from SmartBill API

### Invoice Details
- Invoice number and series
- Issue date and due date
- Client information
- Invoice status with color-coded badges
- Total amount with currency formatting
- Action buttons for viewing and downloading

### User Interface
- Modern, responsive design
- Dark/light theme support
- Loading states and error handling
- Date picker for easy date selection
- Status badges for quick visual identification

## Troubleshooting

### Common Issues

1. **"SmartBill credentials not configured"**
   - Ensure environment variables are set correctly
   - Check that the variable names match exactly
   - Restart your development server after adding environment variables

2. **"Failed to fetch invoices"**
   - Verify your SmartBill credentials are correct
   - Check that your SmartBill account has API access enabled
   - Ensure your internet connection is stable

3. **"API error: 401 Unauthorized"**
   - Double-check your username and password
   - Ensure your SmartBill account is active
   - Contact SmartBill support if credentials are correct but still failing

4. **"API error: 403 Forbidden"**
   - Your account may not have API access enabled
   - Contact SmartBill support to enable API access

### Debug Mode

To enable debug logging, add this environment variable:

```bash
DEBUG_SMARTBILL=true
```

This will log API requests and responses to help troubleshoot issues.

## Security Considerations

1. **Environment Variables**: Never commit API credentials to version control
2. **API Access**: Use dedicated API credentials, not your main login credentials
3. **Rate Limiting**: The integration respects SmartBill's API rate limits
4. **Data Privacy**: Invoice data is only fetched when requested and not stored permanently

## SmartBill API Documentation

For more detailed information about the SmartBill API, visit:
- [SmartBill API Documentation](https://api.smartbill.ro/)
- [SmartBill Cloud Platform](https://cloud.smartbill.ro/)

## Support

If you encounter issues with the SmartBill integration:

1. Check the troubleshooting section above
2. Verify your SmartBill account settings
3. Contact SmartBill support for API-related issues
4. Check the application logs for detailed error messages

## Future Enhancements

Planned features for the SmartBill integration:
- Invoice creation and editing
- PDF download functionality
- Payment status tracking
- Client management integration
- Automated invoice synchronization
- Financial reporting and analytics 