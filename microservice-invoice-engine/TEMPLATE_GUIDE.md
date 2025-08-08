# 📄 Invoice Templates Guide

## 🎯 Overview

The Invoice Engine Microservice now supports multiple invoice templates, allowing you to choose different designs and styles for your invoices. This guide will show you how to set up, configure, and use the template system.

## 📋 Available Templates

### 1. **Modern Professional** (`modern`)
- **Style**: Clean, modern design with professional layout
- **Colors**: Dark blue primary (#2c3e50), blue accent (#3498db)
- **Fonts**: Helvetica family
- **Best for**: Tech companies, modern businesses, startups

### 2. **Classic Business** (`classic`)
- **Style**: Traditional business invoice with formal layout
- **Colors**: Black primary (#1a1a1a), blue accent (#0066cc)
- **Fonts**: Times family
- **Best for**: Traditional businesses, legal firms, established companies

### 3. **Minimalist** (`minimalist`)
- **Style**: Simple, clean design with minimal elements
- **Colors**: Black and white with gray accents
- **Fonts**: Helvetica family
- **Best for**: Creative agencies, minimalist brands, design-focused companies

### 4. **Romanian Business** (`romanian`)
- **Style**: Designed specifically for Romanian business requirements
- **Colors**: Romanian blue (#003366), orange accent (#ff6600)
- **Fonts**: Helvetica family
- **Best for**: Romanian businesses, compliance-focused companies

## 🚀 Quick Start

### Step 1: Set Default Template

Add the default template to your `.env` file:

```bash
# Choose your preferred template
INVOICE_TEMPLATE=romanian
```

### Step 2: Restart Microservice

```bash
# Stop the current microservice
pkill -f "node src/index.js"

# Start with new configuration
node src/index.js
```

### Step 3: Test Template

```bash
# Generate a test invoice with the default template
curl -X POST http://localhost:3002/api/commands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -d '{
    "command": "issue_proforma_invoice",
    "data": {
      "userId": "test-template",
      "packageId": "test-template",
      "packageName": "Template Test Package",
      "hours": 5,
      "pricePerHour": 100,
      "totalPrice": 500,
      "currency": "EUR",
      "validityDays": 365,
      "userData": {
        "userId": "test-template",
        "firstName": "John",
        "lastName": "Doe",
        "email": "julian.pad@me.com",
        "address": "123 Test Street",
        "city": "Bucharest",
        "region": "Bucharest",
        "country": "Romania",
        "cnp": "1234567890123"
      },
      "paymentMethod": "card",
      "paymentLink": true,
      "vatPercentage": 21,
      "pricesIncludeVat": true,
      "convertToRON": true
    }
  }'
```

## 🔧 Configuration Options

### Environment Variables

Configure your company information in the `.env` file:

```bash
# Company Information
COMPANY_NAME=Cruiser Aviation
COMPANY_VAT_CODE=RO12345678
COMPANY_ADDRESS=123 Aviation Street
COMPANY_CITY=Bucharest
COMPANY_REGION=Bucharest
COMPANY_COUNTRY=Romania
COMPANY_EMAIL=billing@cruiseraviation.com
COMPANY_WEBSITE=https://cruiseraviation.com

# Invoice Settings
INVOICE_TEMPLATE=romanian
INVOICE_FOOTER=Thank you for your business!

# Microservice Settings
PORT=3002
API_KEY=your-api-key-here
```

### Template-Specific Configuration

Each template can be customized by editing `src/templates/invoice-templates.js`:

```javascript
const templates = {
  modern: {
    name: 'Modern Professional',
    description: 'Clean, modern design with professional layout',
    config: {
      colors: {
        primary: '#2c3e50',      // Main brand color
        secondary: '#34495e',    // Secondary color
        accent: '#3498db',       // Accent color
        text: '#2c3e50',         // Text color
        lightText: '#7f8c8d'     // Light text color
      },
      fonts: {
        title: 'Helvetica-Bold',     // Main titles
        subtitle: 'Helvetica-Bold',  // Subtitles
        body: 'Helvetica',           // Body text
        emphasis: 'Helvetica-Bold'   // Emphasized text
      },
      layout: {
        headerHeight: 200,           // Company header height
        clientSectionHeight: 150,    // Client info section height
        itemsStartY: 400,            // Invoice items start position
        totalsStartY: 550            // Totals section start position
      }
    }
  }
  // ... other templates
};
```

## 📡 API Usage

### 1. List Available Templates

```bash
curl -X GET http://localhost:3002/api/templates \
  -H "Authorization: Bearer your-api-key-here"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": {
      "modern": { ... },
      "classic": { ... },
      "minimalist": { ... },
      "romanian": { ... }
    },
    "availableTemplates": ["modern", "classic", "minimalist", "romanian"],
    "count": 4
  }
}
```

### 2. Get Template Details

```bash
curl -X GET http://localhost:3002/api/templates/romanian \
  -H "Authorization: Bearer your-api-key-here"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Romanian Business",
    "description": "Designed specifically for Romanian business requirements",
    "config": {
      "colors": { ... },
      "fonts": { ... },
      "layout": { ... }
    }
  }
}
```

### 3. Get Template Preview

```bash
curl -X GET http://localhost:3002/api/templates/modern/preview \
  -H "Authorization: Bearer your-api-key-here"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "template": { ... },
    "sampleInvoice": {
      "id": "preview-invoice",
      "invoiceNumber": "PREVIEW-001",
      "invoiceType": "proforma",
      "userData": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "cnp": "1234567890123",
        // ... other fields
      }
      // ... other invoice data
    },
    "message": "Preview data generated successfully. Use this data to test the template."
  }
}
```

### 4. Generate Invoice with Specific Template

#### Option A: Using Template Parameter

```bash
curl -X POST http://localhost:3002/api/commands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -d '{
    "command": "issue_proforma_invoice",
    "data": {
      "template": "modern",
      "userId": "user123",
      "packageId": "package123",
      "packageName": "Flight Hours Package",
      "hours": 10,
      "pricePerHour": 150,
      "totalPrice": 1500,
      "currency": "EUR",
      "validityDays": 365,
      "userData": {
        "userId": "user123",
        "firstName": "John",
        "lastName": "Doe",
        "email": "julian.pad@me.com",
        "address": "123 Main Street",
        "city": "Bucharest",
        "region": "Bucharest",
        "country": "Romania",
        "cnp": "1234567890123"
      },
      "paymentMethod": "card",
      "paymentLink": true,
      "vatPercentage": 21,
      "pricesIncludeVat": true,
      "convertToRON": true
    }
  }'
```

#### Option B: Using Environment Variable

Set the default template in your `.env` file:

```bash
INVOICE_TEMPLATE=romanian
```

Then generate invoices normally (they will use the default template):

```bash
curl -X POST http://localhost:3002/api/commands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -d '{
    "command": "issue_proforma_invoice",
    "data": {
      "userId": "user123",
      // ... other data (template will be "romanian" by default)
    }
  }'
```

## 🎨 Customizing Templates

### 1. Modify Existing Template

Edit `src/templates/invoice-templates.js` to modify an existing template:

```javascript
// Example: Modify the Romanian template colors
romanian: {
  name: 'Romanian Business',
  description: 'Designed specifically for Romanian business requirements',
  config: {
    colors: {
      primary: '#003366',      // Keep Romanian blue
      secondary: '#0066cc',    // Keep secondary blue
      accent: '#ff6600',       // Keep orange accent
      text: '#000000',         // Black text
      lightText: '#666666'     // Gray light text
    },
    fonts: {
      title: 'Helvetica-Bold',
      subtitle: 'Helvetica-Bold',
      body: 'Helvetica',
      emphasis: 'Helvetica-Bold'
    },
    layout: {
      headerHeight: 220,
      clientSectionHeight: 160,
      itemsStartY: 440,
      totalsStartY: 580
    }
  }
}
```

### 2. Create New Template

Add a new template to `src/templates/invoice-templates.js`:

```javascript
// Add this to the templates object
custom: {
  name: 'Custom Template',
  description: 'My custom invoice design',
  config: {
    colors: {
      primary: '#your-brand-color',
      secondary: '#your-secondary-color',
      accent: '#your-accent-color',
      text: '#000000',
      lightText: '#666666'
    },
    fonts: {
      title: 'Your-Font-Bold',
      subtitle: 'Your-Font-Bold',
      body: 'Your-Font',
      emphasis: 'Your-Font-Bold'
    },
    layout: {
      headerHeight: 200,
      clientSectionHeight: 150,
      itemsStartY: 400,
      totalsStartY: 550
    }
  }
}
```

### 3. Template Inheritance

You can create templates that inherit from others:

```javascript
// Create a template based on Romanian but with different colors
romanian_blue: {
  name: 'Romanian Blue Variant',
  description: 'Romanian template with blue color scheme',
  config: {
    ...templates.romanian.config,  // Inherit Romanian layout
    colors: {
      primary: '#1e3a8a',      // Different blue
      secondary: '#3b82f6',
      accent: '#06b6d4',
      text: '#000000',
      lightText: '#666666'
    }
  }
}
```

## 🔄 Integration with Main Application

### 1. Update Microservice Client

Modify your main application's microservice client to support templates:

```typescript
// In src/lib/microservice-client.ts
interface ProformaInvoiceCommand {
  command: 'issue_proforma_invoice';
  data: {
    template?: string;  // Add template parameter
    userId: string;
    // ... other fields
  };
}

class MicroserviceClient {
  async issueProformaInvoice(data: ProformaInvoiceCommand['data']) {
    const command = {
      command: 'issue_proforma_invoice',
      data: {
        template: data.template || 'modern',  // Default to modern
        ...data
      }
    };
    
    return this.sendCommand(command);
  }
}
```

### 2. Template Selection in UI

Add template selection to your invoice generation UI:

```typescript
// Example React component
const TemplateSelector = ({ onTemplateChange }) => {
  const templates = [
    { id: 'modern', name: 'Modern Professional', description: 'Clean, modern design' },
    { id: 'classic', name: 'Classic Business', description: 'Traditional business layout' },
    { id: 'minimalist', name: 'Minimalist', description: 'Simple, clean design' },
    { id: 'romanian', name: 'Romanian Business', description: 'Romanian business compliant' }
  ];

  return (
    <div>
      <label>Invoice Template:</label>
      <select onChange={(e) => onTemplateChange(e.target.value)}>
        {templates.map(template => (
          <option key={template.id} value={template.id}>
            {template.name} - {template.description}
          </option>
        ))}
      </select>
    </div>
  );
};
```

### 3. User Preferences

Store user template preferences:

```typescript
// Save user template preference
const saveUserTemplatePreference = (userId: string, template: string) => {
  // Save to database or localStorage
  localStorage.setItem(`user_${userId}_template`, template);
};

// Get user template preference
const getUserTemplatePreference = (userId: string) => {
  return localStorage.getItem(`user_${userId}_template`) || 'modern';
};
```

## 🧪 Testing Templates

### 1. Test All Templates

Create a script to test all templates:

```bash
#!/bin/bash
# test-templates.sh

TEMPLATES=("modern" "classic" "minimalist" "romanian")
API_KEY="your-api-key-here"

for template in "${TEMPLATES[@]}"; do
  echo "Testing template: $template"
  
  curl -X POST http://localhost:3002/api/commands \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{
      \"command\": \"issue_proforma_invoice\",
      \"data\": {
        \"template\": \"$template\",
        \"userId\": \"test-$template\",
        \"packageId\": \"test-$template\",
        \"packageName\": \"$template Template Test\",
        \"hours\": 5,
        \"pricePerHour\": 100,
        \"totalPrice\": 500,
        \"currency\": \"EUR\",
        \"validityDays\": 365,
        \"userData\": {
          \"userId\": \"test-$template\",
          \"firstName\": \"Test\",
          \"lastName\": \"User\",
          \"email\": \"julian.pad@me.com\",
          \"address\": \"123 Test Street\",
          \"city\": \"Bucharest\",
          \"region\": \"Bucharest\",
          \"country\": \"Romania\",
          \"cnp\": \"1234567890123\"
        },
        \"paymentMethod\": \"card\",
        \"paymentLink\": true,
        \"vatPercentage\": 21,
        \"pricesIncludeVat\": true,
        \"convertToRON\": true
      }
    }"
  
  echo "Template $template test completed"
  sleep 2
done
```

### 2. Compare Templates

Generate invoices with different templates and compare the PDFs:

```bash
# Generate invoices with different templates
for template in modern classic minimalist romanian; do
  echo "Generating $template template invoice..."
  # ... curl command with template parameter
done

# Check generated PDFs
ls -la uploads/invoice-*.pdf
```

## 🚨 Troubleshooting

### Common Issues

1. **Template Not Found**
   ```
   Error: Template 'invalid-template' not found
   ```
   **Solution**: Check available templates with `GET /api/templates`

2. **Microservice Not Starting**
   ```
   Error: Cannot find module './templates/invoice-templates'
   ```
   **Solution**: Ensure all template files are in the correct locations

3. **PDF Generation Fails**
   ```
   Error: Failed to generate invoice PDF
   ```
   **Solution**: Check template configuration and restart microservice

### Debug Commands

```bash
# Check if microservice is running
ps aux | grep "node src/index.js"

# Check available templates
curl -X GET http://localhost:3002/api/templates \
  -H "Authorization: Bearer your-api-key-here"

# Test health endpoint
curl -X GET http://localhost:3002/api/health

# Check logs
tail -f logs/app.log
```

## 📚 Best Practices

### 1. Template Selection
- **Romanian businesses**: Use `romanian` template for compliance
- **Modern companies**: Use `modern` template for professional look
- **Traditional firms**: Use `classic` template for formal appearance
- **Creative agencies**: Use `minimalist` template for clean design

### 2. Color Schemes
- Keep primary colors consistent with your brand
- Ensure sufficient contrast for readability
- Use accent colors sparingly for emphasis

### 3. Font Selection
- Use web-safe fonts for consistency
- Ensure fonts support all required characters
- Test with different text lengths

### 4. Layout Considerations
- Adjust section heights based on content
- Ensure proper spacing between elements
- Test with different invoice amounts

## 🎯 Next Steps

1. **Choose your default template** and set it in `.env`
2. **Test all templates** to see which fits your business best
3. **Customize colors and fonts** to match your brand
4. **Integrate template selection** into your main application
5. **Set up user preferences** for template selection

## 📞 Support

If you need help with templates:
1. Check the troubleshooting section above
2. Review the template configuration files
3. Test with the provided examples
4. Contact the development team for assistance

---

**Happy invoicing! 🚀✨**
