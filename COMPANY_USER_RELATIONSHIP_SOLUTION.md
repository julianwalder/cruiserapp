# Company-User Relationship Solution for Invoice Management

## Overview

This solution addresses the challenge of linking invoices issued to companies with the actual users (pilots/students) who consumed the flight hours. The system uses email addresses found in invoice XML files to automatically match users with companies and track the relationship between them.

## Problem Statement

- **Invoices are issued to companies** (companies pay for flight hours)
- **Usage comes from individual users** (pilots/students who actually flew)
- **Need to link users to companies** via email addresses from invoice XML
- **Track flight hours per user** while maintaining company billing relationships

## Solution Architecture

### 1. Database Schema Enhancements

#### New Tables Added:

**`companies`** - Stores company information
```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    vat_code VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Romania',
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**`user_company_relationships`** - Links users to companies
```sql
CREATE TABLE user_company_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'employee',
    is_primary BOOLEAN DEFAULT false,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);
```

#### Enhanced Existing Tables:

**`invoice_clients`** - Added company_id field
```sql
ALTER TABLE invoice_clients 
ADD COLUMN company_id UUID REFERENCES companies(id);
```

**`flight_hours`** - Added company_id field
```sql
ALTER TABLE flight_hours 
ADD COLUMN company_id UUID REFERENCES companies(id);
```

### 2. Enhanced Invoice Import Process

#### Email-Based User Matching
```typescript
private static async findUserByEmail(email?: string): Promise<string | null> {
  if (!email) return null;

  // Clean and normalize email
  const cleanEmail = email.toLowerCase().trim();

  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', cleanEmail)
    .single();

  return data?.id || null;
}
```

#### Company Creation/Matching
```typescript
private static async findOrCreateCompany(client: any): Promise<string | null> {
  if (!client.name) return null;

  let companyId: string | null = null;

  // First try to find by VAT code if available
  if (client.vatCode) {
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('vat_code', client.vatCode)
      .single();

    if (existingCompany) {
      companyId = existingCompany.id;
    }
  }

  // If not found by VAT code, try to find by name
  if (!companyId) {
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', client.name)
      .single();

    if (existingCompany) {
      companyId = existingCompany.id;
    }
  }

  // If still not found, create a new company
  if (!companyId) {
    const { data: newCompany } = await supabase
      .from('companies')
      .insert({
        name: client.name,
        vat_code: client.vatCode || null,
        email: client.email || null,
        phone: client.phone || null,
        address: client.address || null,
        city: client.city || null,
        country: client.country || 'Romania',
        status: 'Active'
      })
      .select('id')
      .single();

    companyId = newCompany.id;
  }

  return companyId;
}
```

#### Automatic Relationship Creation
```typescript
private static async ensureUserCompanyRelationship(userId: string, companyId: string): Promise<void> {
  // Check if relationship already exists
  const { data: existingRelationship } = await supabase
    .from('user_company_relationships')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single();

  // If relationship doesn't exist, create it
  if (!existingRelationship) {
    await supabase
      .from('user_company_relationships')
      .insert({
        user_id: userId,
        company_id: companyId,
        relationship_type: 'employee', // Default relationship type
        is_primary: false
      });
  }
}
```

### 3. User Interface Enhancements

#### Enhanced Invoice Display
- **Link Status Indicators**: Shows whether users and companies are properly linked
- **Relationship Visualization**: Displays user-company relationships in invoice details
- **Search Improvements**: Search by email addresses and company information

#### Company Management Interface
- **Company CRUD Operations**: Create, read, update, delete companies
- **User Association Display**: Show all users associated with each company
- **Relationship Management**: Manage user-company relationships

### 4. API Endpoints

#### Company Management
- `GET /api/companies` - List companies with user relationships
- `POST /api/companies` - Create new company

#### User-Company Relationships
- `GET /api/user-company-relationships` - List relationships
- `POST /api/user-company-relationships` - Create new relationship

### 5. Workflow Process

#### Invoice Import Workflow:
1. **Parse XML Invoice** - Extract client information including email
2. **Find User by Email** - Match email to existing user in system
3. **Find/Create Company** - Match VAT code or name to existing company, or create new
4. **Create Relationship** - Automatically link user to company if not already linked
5. **Store Invoice Data** - Save invoice with both user_id and company_id references
6. **Create Flight Hours** - Track flight hours per user with company billing reference

#### Example Scenario:
```
Invoice XML contains:
- Client: "ABC Aviation Ltd" (VAT: RO12345678)
- Email: "pilot@abcaviation.com"
- Flight Hours: 10 hours

System Process:
1. Find user with email "pilot@abcaviation.com" → User ID: abc123
2. Find company with VAT "RO12345678" → Company ID: def456
3. Create relationship: User abc123 ↔ Company def456
4. Store invoice with user_id=abc123, company_id=def456
5. Create flight hours record: 10 hours for user abc123, billed to company def456
```

### 6. Benefits

#### For Flight Schools:
- **Accurate Billing**: Track who flew vs. who pays
- **Company Management**: Maintain company profiles and relationships
- **User Tracking**: Monitor individual pilot/student progress
- **Reporting**: Generate reports by company or by user

#### For Users:
- **Personal Records**: See their flight hours regardless of who paid
- **Company Association**: Understand their relationship with paying companies
- **Transparency**: Clear visibility of billing relationships

#### For Administrators:
- **Automated Linking**: Reduce manual work in invoice processing
- **Data Integrity**: Maintain consistent relationships
- **Flexibility**: Support multiple relationship types (employee, contractor, student, etc.)

### 7. Implementation Steps

1. **Run Database Setup**:
   ```bash
   node scripts/setup-invoices-db-enhanced.js
   ```

2. **Update Invoice Import**:
   - Enhanced XML parser extracts email addresses
   - Improved user matching logic
   - Automatic company creation/matching

3. **Deploy New Components**:
   - CompanyManagement component
   - Enhanced ImportedXMLInvoices component
   - New API endpoints

4. **Test the Workflow**:
   - Import sample invoices with email addresses
   - Verify user-company linking
   - Check flight hours tracking

### 8. Future Enhancements

#### Smartbill API Integration:
- **Direct API Import**: Import invoices directly from Smartbill API
- **Real-time Sync**: Keep invoice data synchronized
- **Enhanced Matching**: Use Smartbill's user/company data for better matching

#### Advanced Features:
- **Bulk Relationship Management**: Import user-company relationships from CSV
- **Relationship History**: Track relationship changes over time
- **Advanced Reporting**: Generate detailed company-user analytics
- **Email Notifications**: Notify users when new invoices are linked to them

### 9. Troubleshooting

#### Common Issues:

**Email Not Found**:
- Check if user exists in system with exact email
- Verify email format and case sensitivity
- Consider adding email aliases or alternative matching

**Company Not Created**:
- Verify VAT code format
- Check company name uniqueness
- Review error logs for specific issues

**Relationship Not Created**:
- Ensure both user and company exist
- Check for duplicate relationships
- Verify database constraints

#### Debug Tools:
- Invoice import logs show matching results
- Company management interface shows relationships
- API endpoints provide detailed error messages

## Conclusion

This solution provides a robust foundation for managing the complex relationship between companies that pay for flight hours and the individual users who consume them. The email-based matching system ensures accurate linking while the enhanced database schema supports flexible relationship management.

The system is designed to be:
- **Automated**: Minimal manual intervention required
- **Flexible**: Supports various relationship types
- **Scalable**: Handles multiple companies and users
- **Transparent**: Clear visibility of all relationships
- **Extensible**: Ready for future enhancements like Smartbill API integration 