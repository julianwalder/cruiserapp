# 🚀 Invoice Templates - Quick Reference

## 📋 Available Templates

| Template | ID | Best For | Colors |
|----------|----|----------|---------|
| **Modern Professional** | `modern` | Tech companies, startups | Blue theme |
| **Classic Business** | `classic` | Traditional businesses | Black & blue |
| **Minimalist** | `minimalist` | Creative agencies | Black & white |
| **Romanian Business** | `romanian` | Romanian companies | Romanian blue & orange |

## ⚡ Quick Commands

### 1. List All Templates
```bash
curl -X GET http://localhost:3002/api/templates \
  -H "Authorization: Bearer your-api-key-here"
```

### 2. Get Template Details
```bash
curl -X GET http://localhost:3002/api/templates/romanian \
  -H "Authorization: Bearer your-api-key-here"
```

### 3. Generate Invoice with Template
```bash
curl -X POST http://localhost:3002/api/commands \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -d '{
    "command": "issue_proforma_invoice",
    "data": {
      "template": "romanian",
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

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Set default template
INVOICE_TEMPLATE=romanian

# Company information
COMPANY_NAME=Cruiser Aviation
COMPANY_VAT_CODE=RO12345678
COMPANY_ADDRESS=123 Aviation Street
COMPANY_CITY=Bucharest
COMPANY_REGION=Bucharest
COMPANY_COUNTRY=Romania
COMPANY_EMAIL=billing@cruiseraviation.com
COMPANY_WEBSITE=https://cruiseraviation.com
INVOICE_FOOTER=Thank you for your business!
```

### Template Configuration (src/templates/invoice-templates.js)
```javascript
// Example: Modify Romanian template colors
romanian: {
  name: 'Romanian Business',
  config: {
    colors: {
      primary: '#003366',    // Romanian blue
      accent: '#ff6600',     // Orange accent
      text: '#000000'        // Black text
    },
    fonts: {
      title: 'Helvetica-Bold',
      body: 'Helvetica'
    }
  }
}
```

## 🎨 Template Customization

### Colors
- `primary`: Main brand color
- `secondary`: Secondary color
- `accent`: Accent color for highlights
- `text`: Main text color
- `lightText`: Light text color

### Fonts
- `title`: Main titles
- `subtitle`: Subtitles
- `body`: Body text
- `emphasis`: Emphasized text

### Layout
- `headerHeight`: Company header height
- `clientSectionHeight`: Client info section height
- `itemsStartY`: Invoice items start position
- `totalsStartY`: Totals section start position

## 🧪 Testing

### Test All Templates
```bash
#!/bin/bash
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

## 🔄 Integration

### TypeScript Interface
```typescript
interface ProformaInvoiceCommand {
  command: 'issue_proforma_invoice';
  data: {
    template?: string;  // Template ID
    userId: string;
    // ... other fields
  };
}
```

### React Component
```typescript
const TemplateSelector = ({ onTemplateChange }) => {
  const templates = [
    { id: 'modern', name: 'Modern Professional' },
    { id: 'classic', name: 'Classic Business' },
    { id: 'minimalist', name: 'Minimalist' },
    { id: 'romanian', name: 'Romanian Business' }
  ];

  return (
    <select onChange={(e) => onTemplateChange(e.target.value)}>
      {templates.map(template => (
        <option key={template.id} value={template.id}>
          {template.name}
        </option>
      ))}
    </select>
  );
};
```

## 🚨 Troubleshooting

### Common Issues
1. **Template not found**: Check available templates with `GET /api/templates`
2. **Microservice not starting**: Ensure all template files exist
3. **PDF generation fails**: Check template configuration

### Debug Commands
```bash
# Check microservice status
ps aux | grep "node src/index.js"

# Check available templates
curl -X GET http://localhost:3002/api/templates \
  -H "Authorization: Bearer your-api-key-here"

# Test health endpoint
curl -X GET http://localhost:3002/api/health
```

## 📞 Quick Help

- **Default template**: Set `INVOICE_TEMPLATE=romanian` in `.env`
- **Template selection**: Add `"template": "template-id"` to API requests
- **Customization**: Edit `src/templates/invoice-templates.js`
- **Testing**: Use the test script above

---

**For detailed documentation, see `TEMPLATE_GUIDE.md`** 📖
