# PPL Course Management System

This document describes the automated PPL course management system that handles tranche-based hour allocation for student pilots.

## Overview

The PPL course system automatically detects invoices containing PPL course items and processes them into tranche-based hour packages. Each tranche represents a payment installment for the 45-hour PPL course, with proportional hour allocation.

## Features

### 1. Automatic PPL Course Detection
- Detects invoices with descriptions containing "Pregătire PPL(A) conform contract"
- Supports multiple description patterns for PPL course identification
- Automatically processes new invoices during import

### 2. Tranche Parsing
The system recognizes various tranche description formats:
- `"tranșa 1 (2875 euro)"` - Tranche with amount
- `"Tranșa 1/4"` - Fractional format
- `"tranșa 1 din 4"` - Romanian format
- `"tranșa final"` - Final tranche
- `"ultima tranșa"` - Last tranche

### 3. Proportional Hour Allocation
- Each tranche gets proportional hours from the 45-hour course
- Final tranche receives remaining hours to ensure total equals 45
- Integer hour allocation (no fractional hours)

### 4. Student vs Pilot Status
- **Students**: Have PPL Course 45 Hours (tranche-based)
- **Pilots**: Have Hour Packages (regular flight hours)
- Students graduate to pilots when PPL course is completed

## Database Schema

### PPL Course Tranches Table
```sql
CREATE TABLE ppl_course_tranches (
  id UUID PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  tranche_number INTEGER NOT NULL,
  total_tranches INTEGER NOT NULL,
  hours_allocated DECIMAL(5,2) NOT NULL DEFAULT 0,
  total_course_hours DECIMAL(5,2) NOT NULL DEFAULT 45,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RON',
  description TEXT,
  purchase_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  used_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  remaining_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(invoice_id, tranche_number)
);
```

## API Endpoints

### 1. Process PPL Courses from Existing Invoices
```http
POST /api/smartbill/process-ppl-courses
```
Processes all existing invoices to detect and create PPL course tranches.

### 2. Update PPL Course Usage
```http
POST /api/smartbill/update-ppl-usage
```
Updates PPL course usage based on flight logs for all users.

## Setup Instructions

### 1. Database Setup
Run the setup script to create the PPL course tranches table:

```bash
node scripts/setup-ppl-courses.js
```

### 2. Process Existing Invoices
After setup, process existing invoices to detect PPL courses:

```bash
# Via API call (requires admin authentication)
curl -X POST /api/smartbill/process-ppl-courses \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Update Usage
Update PPL course usage based on flight logs:

```bash
# Via API call (requires admin authentication)
curl -X POST /api/smartbill/update-ppl-usage \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Usage Examples

### Example 1: 4-Tranche PPL Course
Invoice description: `"Pregătire PPL(A) conform contract - Tranșa 1/4"`

**Allocation:**
- Tranche 1: 11 hours (11.25 rounded down)
- Tranche 2: 11 hours (11.25 rounded down)
- Tranche 3: 11 hours (11.25 rounded down)
- Tranche 4: 12 hours (remaining to reach 45)

### Example 2: 3-Tranche PPL Course
Invoice description: `"Pregătire PPL(A) conform contract - Tranșa 1 din 3"`

**Allocation:**
- Tranche 1: 15 hours (45/3)
- Tranche 2: 15 hours (45/3)
- Tranche 3: 15 hours (45/3)

### Example 3: Final Tranche
Invoice description: `"Pregătire PPL(A) conform contract - Tranșa final"`

**Allocation:**
- Final tranche: 45 hours (complete course)

## User Interface

### Client Hours Details Modal
The PPL course information is displayed in the client details modal:

1. **PPL Course Summary**
   - Total allocated hours
   - Used hours
   - Remaining hours
   - Course progress percentage

2. **Tranche Details**
   - Individual tranche information
   - Hours allocated per tranche
   - Usage progress per tranche
   - Status (active/completed)

3. **Progress Tracking**
   - Visual progress bars
   - Completion status
   - Tranche completion count

## Workflow

### For New Students
1. Student registers with STUDENT role
2. PPL course invoice is imported
3. System automatically detects PPL course items
4. Tranches are created with proportional hour allocation
5. Student can view PPL course progress in client hours

### For Graduating Students
1. Student completes 45 hours of PPL course
2. System marks course as completed
3. Student role can be upgraded to PILOT
4. Student now has access to regular hour packages

### For Instructors
1. Instructors can view PPL course progress for their students
2. Flight logs automatically update PPL course usage
3. Real-time progress tracking

## Configuration

### PPL Course Detection Patterns
The system looks for these patterns in invoice descriptions:
- `pregătire ppl`
- `ppl(a)`
- `ppl course`

### Tranche Parsing Patterns
- `tranșa\s+(\d+)(?:\s*\/\s*(\d+))?`
- `tranșa\s+(\d+)\s+din\s+(\d+)`
- `tranșa final`
- `ultima tranșa`

### Hour Allocation Rules
- Total course hours: 45
- Proportional allocation for regular tranches
- Final tranche gets remaining hours
- Integer hour allocation (no decimals)

## Troubleshooting

### Common Issues

1. **PPL Course Not Detected**
   - Check invoice description format
   - Verify user has STUDENT role
   - Ensure invoice is marked as paid/imported

2. **Tranche Not Created**
   - Check tranche description format
   - Verify invoice has valid user_id
   - Check database permissions

3. **Usage Not Updated**
   - Run update-ppl-usage endpoint
   - Verify flight logs exist for user
   - Check flight log dates are after tranche purchase

### Debug Commands
```bash
# Check PPL course detection
curl -X POST /api/smartbill/process-ppl-courses

# Update usage
curl -X POST /api/smartbill/update-ppl-usage

# View client hours (includes PPL data)
curl -X GET /api/client-hours
```

## Security

### Row Level Security (RLS)
- Users can only view their own PPL course data
- Admins can view all PPL course data
- Instructors can view PPL course data for their students

### Access Control
- PPL course processing requires ADMIN or SUPER_ADMIN role
- Usage updates require ADMIN or SUPER_ADMIN role
- Regular users can only view their own data

## Future Enhancements

1. **Automatic Role Upgrade**
   - Automatically upgrade STUDENT to PILOT when course completed
   - Email notifications for course completion

2. **Advanced Tranche Patterns**
   - Support for more complex tranche descriptions
   - Custom hour allocation rules

3. **Reporting**
   - PPL course completion reports
   - Revenue tracking by tranche
   - Student progress analytics

4. **Integration**
   - SmartBill API integration for real-time processing
   - Flight log automatic updates
   - Email notifications for tranche purchases 