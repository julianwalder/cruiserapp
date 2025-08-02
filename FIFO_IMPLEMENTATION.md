# FIFO Implementation for Hour Package Consumption

## Overview

The Client Hours system now uses **FIFO (First In, First Out)** method to calculate used hours from packages. This ensures that the oldest packages are consumed first, providing fair usage tracking and proper package expiration management.

## How FIFO Works

### 1. Package Sorting
- Packages are sorted by purchase date (oldest first)
- This determines the consumption order

### 2. Consumption Logic
```typescript
// Sort packages by purchase date (oldest first for FIFO)
const sortedPackages = [...packages].sort((a, b) => 
  new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
);

// Apply FIFO logic to each package
sortedPackages.forEach(pkg => {
  if (remainingUsedHours <= 0) {
    // No more hours to consume
    pkg.usedHours = 0;
    pkg.remainingHours = pkg.totalHours;
  } else if (remainingUsedHours >= pkg.totalHours) {
    // Consume entire package
    pkg.usedHours = pkg.totalHours;
    pkg.remainingHours = 0;
    remainingUsedHours -= pkg.totalHours;
  } else {
    // Partially consume package
    pkg.usedHours = remainingUsedHours;
    pkg.remainingHours = pkg.totalHours - remainingUsedHours;
    remainingUsedHours = 0;
  }
});
```

### 3. Consumption Scenarios

#### Scenario 1: No Usage
- All packages remain unused
- Status: `in progress`

#### Scenario 2: Partial Usage of First Package
- Only the oldest package is partially consumed
- Remaining packages stay unused
- Status: `in progress`

#### Scenario 3: Complete Usage of First Package
- Oldest package is fully consumed
- Status: `consumed`
- Next package remains unused

#### Scenario 4: Usage Across Multiple Packages
- Oldest package is fully consumed
- Second package is partially consumed
- Remaining packages stay unused

#### Scenario 5: Complete Usage of All Packages
- All packages are fully consumed
- Status: `consumed` for all packages
- Total remaining: 0 hours

#### Scenario 6: Overdrawn Usage
- All packages are fully consumed
- System shows negative remaining hours
- Status: `overdrawn`

## Visual Indicators

### 1. Main Table
- **FIFO Badge**: Shows when multiple packages exist
- **Tooltip**: Explains FIFO method
- **Status Colors**: Indicate package consumption state

### 2. Package Details Modal
- **FIFO Method Header**: Clear indication of method used
- **First Used Badge**: Highlights the first package being consumed
- **Consumed Badge**: Shows fully consumed packages
- **Chronological Order**: Packages displayed oldest to newest
- **Visual Ring**: Blue ring around first used package

### 3. Package Information
- **Used Hours**: Hours consumed from this specific package
- **Remaining Hours**: Hours left in this package
- **Total Hours**: Original package size
- **Progress Bar**: Visual representation of consumption
- **Status**: Current package state

## Benefits of FIFO

### 1. Fair Usage Tracking
- Ensures oldest packages are used first
- Prevents newer packages from expiring while old ones remain unused

### 2. Proper Expiration Management
- Helps manage package expiration dates effectively
- Reduces waste from expired packages

### 3. Accurate Financial Tracking
- Matches accounting principles (FIFO inventory method)
- Provides clear audit trail of package consumption

### 4. User Experience
- Clear visual indicators of consumption order
- Easy to understand which packages are being used
- Transparent tracking of remaining hours

## Implementation Details

### Files Modified
1. **`src/app/api/client-hours/route.ts`**
   - Updated calculation logic to use FIFO
   - Added package sorting by purchase date
   - Implemented sequential consumption logic

2. **`src/components/ClientHours.tsx`**
   - Enhanced package display with FIFO indicators
   - Added visual badges and tooltips
   - Improved package information layout

### Test Script
- **`scripts/test-fifo-calculation.js`**
   - Comprehensive test scenarios
   - Validates FIFO logic correctness
   - Demonstrates all consumption patterns

## Example Usage

### Sample Data
```javascript
const packages = [
  { id: 'pkg-1', totalHours: 10, purchaseDate: '2024-01-15' },
  { id: 'pkg-2', totalHours: 5,  purchaseDate: '2024-02-20' },
  { id: 'pkg-3', totalHours: 8,  purchaseDate: '2024-03-10' }
];
```

### Consumption Examples
- **12 hours used**: 
  - pkg-1: 10h used, 0h remaining (consumed)
  - pkg-2: 2h used, 3h remaining (in progress)
  - pkg-3: 0h used, 8h remaining (unused)

- **25 hours used**:
  - pkg-1: 10h used, 0h remaining (consumed)
  - pkg-2: 5h used, 0h remaining (consumed)
  - pkg-3: 8h used, 0h remaining (consumed)
  - Total: 2h overdrawn

## Future Enhancements

### 1. Package Expiration Warnings
- Alert users when packages are nearing expiration
- Suggest usage of expiring packages first

### 2. Advanced FIFO Options
- Allow users to choose consumption order
- Support for LIFO (Last In, First Out) for special cases

### 3. Reporting Features
- FIFO consumption reports
- Package utilization analytics
- Expiration tracking reports

### 4. Integration with Flight Logs
- Real-time FIFO updates based on flight log entries
- Automatic package consumption on flight completion

## Conclusion

The FIFO implementation provides a robust, fair, and transparent system for tracking hour package consumption. It ensures proper package management while providing clear visual feedback to users about their package usage status. 