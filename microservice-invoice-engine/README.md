# Invoice Engine Microservice

A robust microservice for handling proforma invoice generation and payment processing for Cruiser Aviation's flight training packages.

## 🚀 Features

- **Proforma Invoice Generation**: Create professional invoices with custom numbering
- **Payment Link Generation**: Generate secure payment links for online payments
- **PDF Invoice Generation**: Create beautiful PDF invoices automatically
- **Email Notifications**: Send invoice and payment confirmation emails
- **Payment Gateway Support**: Extensible payment gateway integration
- **RESTful API**: Clean, documented API endpoints
- **Security**: API key authentication and rate limiting
- **Logging**: Comprehensive logging with Winston
- **Health Checks**: Built-in health monitoring endpoints

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Invoice Engine  │    │  Payment        │
│   Application   │◄──►│   Microservice   │◄──►│  Gateway        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Email Service   │
                       │  & PDF Generator │
                       └──────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- SMTP server for email notifications (optional)
- Payment gateway credentials (optional)

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   cd microservice-invoice-engine
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Create required directories**:
   ```bash
   mkdir -p logs uploads
   ```

5. **Start the service**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Security
API_KEY=your-super-secret-api-key-change-this-in-production
JWT_SECRET=your-jwt-secret-key-change-this-in-production

# Database (if using external database)
DATABASE_URL=postgresql://username:password@localhost:5432/invoice_engine

# Payment Gateway (example)
PAYMENT_GATEWAY_URL=https://api.payment-gateway.com
PAYMENT_GATEWAY_KEY=your-payment-gateway-key

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@cruiseraviation.com

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/invoice-engine.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Invoice Configuration
INVOICE_SERIES=PROF
COMPANY_NAME=Cruiser Aviation
COMPANY_ADDRESS=123 Aviation Street, Bucharest, Romania
COMPANY_PHONE=+40 123 456 789
COMPANY_EMAIL=billing@cruiseraviation.com
COMPANY_WEBSITE=https://cruiseraviation.com
```

## 📡 API Endpoints

### Commands

**POST** `/api/commands`
Issue a proforma invoice

```json
{
  "command": "issue_proforma_invoice",
  "data": {
    "userId": "user-uuid",
    "packageId": "package-uuid",
    "packageName": "10 Hour Package",
    "hours": 10,
    "pricePerHour": 150,
    "totalPrice": 1500,
    "currency": "EUR",
    "validityDays": 365,
    "userData": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+40123456789",
      "address": "123 Main St",
      "city": "Bucharest",
      "country": "Romania"
    },
    "paymentMethod": "proforma",
    "paymentLink": true
  }
}
```

### Invoices

**GET** `/api/invoices/:invoiceId/status`
Get invoice status

**GET** `/api/invoices/:invoiceId`
Get invoice details

**POST** `/api/invoices/:invoiceId/cancel`
Cancel an invoice

### Health

**GET** `/api/health`
Health check

**GET** `/api/health/ready`
Readiness check

**GET** `/api/health/live`
Liveness check

## 🔐 Authentication

All API endpoints (except health checks) require API key authentication:

```bash
# Using Authorization header
Authorization: Bearer your-api-key

# Using X-API-Key header
X-API-Key: your-api-key
```

## 📊 Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {
    "invoiceId": "uuid",
    "microserviceId": "uuid",
    "invoiceNumber": "PROF-12345678-001",
    "paymentLink": "https://payment.example.com/pay/uuid",
    "status": "issued",
    "message": "Proforma invoice generated successfully"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 🔄 Integration with Frontend

### 1. Update Frontend Environment

Add to your frontend `.env.local`:

```env
MICROSERVICE_URL=http://localhost:3001
MICROSERVICE_API_KEY=your-api-key
MICROSERVICE_TIMEOUT=30000
```

### 2. Test the Integration

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test command endpoint
curl -X POST http://localhost:3001/api/commands \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "issue_proforma_invoice",
    "data": {
      "userId": "test-user",
      "packageId": "test-package",
      "packageName": "Test Package",
      "hours": 5,
      "pricePerHour": 100,
      "totalPrice": 500,
      "currency": "EUR",
      "validityDays": 30,
      "userData": {
        "firstName": "Test",
        "lastName": "User",
        "email": "test@example.com"
      },
      "paymentMethod": "proforma",
      "paymentLink": true
    }
  }'
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint
```

## 📝 Logging

The service uses Winston for logging with the following levels:

- **error**: Application errors
- **warn**: Warning messages
- **info**: General information
- **debug**: Debug information

Logs are written to:
- Console (development)
- `logs/combined.log` (all levels)
- `logs/error.log` (error level only)

## 🔧 Development

### Project Structure

```
src/
├── index.js              # Main application entry point
├── middleware/           # Express middleware
│   ├── auth.js          # Authentication middleware
│   ├── errorHandlers.js # Error handling middleware
│   └── validation.js    # Request validation
├── routes/              # API routes
│   ├── commands.js      # Command endpoints
│   ├── invoices.js      # Invoice endpoints
│   └── health.js        # Health check endpoints
├── services/            # Business logic services
│   ├── invoiceService.js    # Main invoice service
│   ├── paymentService.js    # Payment gateway integration
│   ├── emailService.js      # Email notifications
│   └── pdfService.js        # PDF generation
└── utils/               # Utility functions
    └── logger.js        # Winston logger configuration
```

### Adding New Features

1. **Create a new service** in `src/services/`
2. **Add routes** in `src/routes/`
3. **Update validation schemas** in route files
4. **Add tests** for new functionality
5. **Update documentation**

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3001
API_KEY=your-production-api-key
SMTP_HOST=your-production-smtp-host
PAYMENT_GATEWAY_KEY=your-production-payment-key
```

### Health Checks

The service provides health check endpoints for container orchestration:

- `/api/health` - Basic health check
- `/api/health/ready` - Readiness check
- `/api/health/live` - Liveness check

## 🔒 Security

- **API Key Authentication**: All endpoints require valid API key
- **Rate Limiting**: Configurable rate limiting per IP
- **Input Validation**: All inputs validated with Joi schemas
- **CORS**: Configurable CORS settings
- **Helmet**: Security headers middleware
- **Error Handling**: No sensitive information leaked in errors

## 📈 Monitoring

### Metrics

- Request count and response times
- Error rates
- Invoice generation success rate
- Payment processing metrics

### Alerts

- Service availability
- High error rates
- Payment gateway failures
- Email service issues

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the logs for debugging information

## 🔄 Changelog

### v1.0.0
- Initial release
- Standalone proforma invoice generation
- Custom invoice numbering system
- Payment link generation
- PDF invoice generation
- Email notifications
- RESTful API
- Security and authentication
- Comprehensive logging
- Health checks
