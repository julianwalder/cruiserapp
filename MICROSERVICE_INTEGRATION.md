# Microservice Integration for Proforma Invoice Generation

This document explains how to use the new microservice integration for placing orders and generating proforma invoices instead of using the SmartBill API directly.

## Overview

The system now includes a microservice client that sends commands to your own microservice for issuing proforma invoices. This provides better control over the invoice generation process and allows for custom business logic.

## Components

### 1. Microservice Client (`src/lib/microservice-client.ts`)

A TypeScript client for communicating with your microservice:

```typescript
import microserviceClient from '@/lib/microservice-client';

// Send a command to issue a proforma invoice
const response = await microserviceClient.issueProformaInvoice({
  userId: 'user-id',
  packageId: 'package-id',
  packageName: '10 Hour Package',
  hours: 10,
  pricePerHour: 150,
  totalPrice: 1500,
  currency: 'EUR',
  validityDays: 365,
  userData: { /* user information */ },
  paymentMethod: 'proforma',
  paymentLink: true,
});
```

### 2. Place Order API (`src/app/api/orders/place-order/route.ts`)

A new API endpoint that handles order placement:

- **POST** `/api/orders/place-order`
- Validates user data and package information
- Sends command to microservice
- Stores order record in database
- Returns order details and payment link

### 3. Place Order Button Component (`src/components/PlaceOrderButton.tsx`)

A reusable React component for placing orders:

```tsx
import { PlaceOrderButton } from '@/components/PlaceOrderButton';

<PlaceOrderButton
  package={hourPackage}
  userData={userData}
  onOrderPlaced={(orderData) => {
    console.log('Order placed:', orderData);
  }}
  className="w-full"
/>
```

### 4. Orders Management (`src/components/OrdersManagement.tsx`)

A component for viewing and managing orders with pagination and filtering.

## Database Schema

### Orders Table

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "packageId" UUID NOT NULL REFERENCES hour_package_templates(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "paymentMethod" VARCHAR(20) NOT NULL,
    "microserviceInvoiceId" VARCHAR(255),
    "microserviceId" VARCHAR(255),
    "paymentLink" TEXT,
    "invoiceData" JSONB,
    "microserviceResponse" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Environment Variables

Add these to your `.env.local` file:

```env
# Microservice Configuration
MICROSERVICE_URL=http://your-microservice-url:3001
MICROSERVICE_API_KEY=your-api-key-if-required
MICROSERVICE_TIMEOUT=30000
```

## Microservice API Specification

Your microservice should implement the following endpoints:

### 1. Command Endpoint

**POST** `/api/commands`

Request body:
```json
{
  "command": "issue_proforma_invoice",
  "data": {
    "userId": "string",
    "packageId": "string",
    "packageName": "string",
    "hours": number,
    "pricePerHour": number,
    "totalPrice": number,
    "currency": "string",
    "validityDays": number,
    "userData": {
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string",
      "address": "string",
      "city": "string",
      "state": "string",
      "zipCode": "string",
      "country": "string",
      "cnp": "string",
      "idNumber": "string",
      "companyId": "string",
      "companyName": "string",
      "companyVatCode": "string",
      "companyAddress": "string",
      "companyCity": "string",
      "companyCountry": "string"
    },
    "paymentMethod": "proforma" | "fiscal",
    "paymentLink": boolean
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "invoiceId": "string",
    "microserviceId": "string",
    "paymentLink": "string",
    "status": "pending" | "issued" | "failed",
    "message": "string"
  }
}
```

### 2. Status Check Endpoint

**GET** `/api/invoices/{invoiceId}/status`

Response:
```json
{
  "success": true,
  "data": {
    "invoiceId": "string",
    "status": "pending" | "issued" | "failed",
    "message": "string"
  }
}
```

## Usage Examples

### 1. Basic Order Placement

```tsx
import { PlaceOrderButton } from '@/components/PlaceOrderButton';

function PackageCard({ package, userData }) {
  return (
    <div>
      <h3>{package.name}</h3>
      <p>{package.description}</p>
      <PlaceOrderButton
        package={package}
        userData={userData}
        onOrderPlaced={(orderData) => {
          toast.success('Order placed successfully!');
          // Navigate to orders page or show order details
        }}
      />
    </div>
  );
}
```

### 2. Orders Management Page

```tsx
import { OrdersManagement } from '@/components/OrdersManagement';

function OrdersPage() {
  return (
    <div>
      <h1>My Orders</h1>
      <OrdersManagement />
    </div>
  );
}
```

### 3. Direct API Usage

```typescript
const placeOrder = async (packageId: string) => {
  const response = await fetch('/api/orders/place-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      packageId,
      paymentMethod: 'proforma',
      paymentLink: true,
    }),
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('Order placed:', result.data);
    // Handle success
  } else {
    console.error('Order failed:', result.error);
    // Handle error
  }
};
```

## Setup Instructions

### 1. Run Database Migration

```bash
npm run setup-orders-table
```

### 2. Configure Environment Variables

Add the microservice configuration to your `.env.local`:

```env
MICROSERVICE_URL=http://localhost:3001
MICROSERVICE_API_KEY=your-secret-key
MICROSERVICE_TIMEOUT=30000
```

### 3. Test the Integration

1. Start your microservice
2. Navigate to the Orders page in the application
3. Try placing an order using the PlaceOrderButton component
4. Check the orders list to see the created order

## Error Handling

The microservice client includes comprehensive error handling:

- **Timeout errors**: When the microservice doesn't respond within the configured timeout
- **Network errors**: Connection issues or invalid URLs
- **API errors**: Invalid responses from the microservice
- **Validation errors**: Invalid data sent to the microservice

All errors are logged and returned with appropriate error messages.

## Security Considerations

1. **API Key**: Use a secure API key for microservice communication
2. **HTTPS**: Use HTTPS in production for secure communication
3. **Input Validation**: All input is validated before sending to the microservice
4. **Rate Limiting**: Consider implementing rate limiting on your microservice
5. **Authentication**: Ensure your microservice validates the API key

## Monitoring and Logging

The system logs all microservice interactions:

- Command requests and responses
- Error details and stack traces
- Performance metrics (response times)
- Order status changes

Check the application logs for detailed information about microservice communication.

## Troubleshooting

### Common Issues

1. **Microservice not responding**: Check the URL and ensure the service is running
2. **Authentication errors**: Verify the API key is correct
3. **Timeout errors**: Increase the timeout value or check microservice performance
4. **Database errors**: Ensure the orders table exists and has proper permissions

### Debug Mode

Enable debug logging by setting the log level in your environment:

```env
DEBUG=microservice:*
```

This will provide detailed logs of all microservice communication.
