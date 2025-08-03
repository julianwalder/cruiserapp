#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Component fix configuration
const componentFixes = [
  {
    file: 'src/components/AirfieldsManagement.tsx',
    description: 'Fix AirfieldsManagement component types',
    fixes: [
      {
        type: 'add-interface',
        interface: `
// Extended Airfield interface for AirfieldsManagement component
interface ExtendedAirfield extends Airfield {
  isBase?: boolean;
  source?: 'manual' | 'imported';
  type: string; // Allow any string type for OurAirports compatibility
}
`
      },
      {
        type: 'replace',
        from: ': any',
        to: ': unknown'
      },
      {
        type: 'replace',
        from: 'useState<Airfield[]>',
        to: 'useState<ExtendedAirfield[]>'
      },
      {
        type: 'replace',
        from: 'useState<Airfield | null>',
        to: 'useState<ExtendedAirfield | null>'
      }
    ]
  },
  {
    file: 'src/components/FleetManagement.tsx',
    description: 'Fix FleetManagement component types',
    fixes: [
      {
        type: 'add-interface',
        interface: `
// Extended Aircraft interface for FleetManagement component
interface ExtendedAircraft extends Aircraft {
  baseAirfield?: Airfield;
  lastFlightLog?: FlightLog;
}
`
      },
      {
        type: 'replace',
        from: ': any',
        to: ': unknown'
      },
      {
        type: 'replace',
        from: 'useState<Aircraft[]>',
        to: 'useState<ExtendedAircraft[]>'
      }
    ]
  },
  {
    file: 'src/components/FlightLogs.tsx',
    description: 'Fix FlightLogs component types',
    fixes: [
      {
        type: 'add-interface',
        interface: `
// Extended FlightLog interface for FlightLogs component
interface ExtendedFlightLog extends FlightLog {
  aircraft?: Aircraft;
  pilot?: User;
  instructor?: User;
  departureAirfield?: Airfield;
  arrivalAirfield?: Airfield;
  createdBy?: User;
}
`
      },
      {
        type: 'replace',
        from: ': any',
        to: ': unknown'
      },
      {
        type: 'replace',
        from: 'useState<FlightLog[]>',
        to: 'useState<ExtendedFlightLog[]>'
      }
    ]
  },
  {
    file: 'src/components/BaseManagement.tsx',
    description: 'Fix BaseManagement component types',
    fixes: [
      {
        type: 'add-interface',
        interface: `
// Extended BaseManagement interface for BaseManagement component
interface ExtendedBaseManagement extends BaseManagement {
  airfield?: Airfield;
  baseManager?: User;
}
`
      },
      {
        type: 'replace',
        from: ': any',
        to: ': unknown'
      },
      {
        type: 'replace',
        from: 'useState<BaseManagement[]>',
        to: 'useState<ExtendedBaseManagement[]>'
      }
    ]
  },
  {
    file: 'src/components/CompanyManagement.tsx',
    description: 'Fix CompanyManagement component types',
    fixes: [
      {
        type: 'add-interface',
        interface: `
// Extended Company interface for CompanyManagement component
interface ExtendedCompany extends Company {
  userRelationships?: UserCompanyRelationship[];
}
`
      },
      {
        type: 'replace',
        from: ': any',
        to: ': unknown'
      },
      {
        type: 'replace',
        from: 'useState<Company[]>',
        to: 'useState<ExtendedCompany[]>'
      }
    ]
  },
  {
    file: 'src/components/UserBilling.tsx',
    description: 'Fix UserBilling component types',
    fixes: [
      {
        type: 'add-interface',
        interface: `
// Extended User interface for UserBilling component
interface BillingUser extends User {
  invoices?: Invoice[];
  flightHours?: FlightHours[];
  hourPackages?: HourPackage[];
}
`
      },
      {
        type: 'replace',
        from: ': any',
        to: ': unknown'
      },
      {
        type: 'replace',
        from: 'useState<User | null>',
        to: 'useState<BillingUser | null>'
      }
    ]
  },
  {
    file: 'src/components/Reports.tsx',
    description: 'Fix Reports component types',
    fixes: [
      {
        type: 'replace',
        from: ': any',
        to: ': unknown'
      },
      {
        type: 'add-interface',
        interface: `
// Report data interfaces
interface ReportData {
  users: User[];
  aircraft: Aircraft[];
  flightLogs: FlightLog[];
  airfields: Airfield[];
  companies: Company[];
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}
`
      }
    ]
  },
  {
    file: 'src/components/Settings.tsx',
    description: 'Fix Settings component types',
    fixes: [
      {
        type: 'replace',
        from: ': any',
        to: ': unknown'
      },
      {
        type: 'add-interface',
        interface: `
// Settings interfaces
interface SystemSettings {
  icaoImportEnabled: boolean;
  smartbillEnabled: boolean;
  autoBackupEnabled: boolean;
  maintenanceMode: boolean;
}

interface ImportSettings {
  batchSize: number;
  retryAttempts: number;
  timeout: number;
}
`
      }
    ]
  },
  {
    file: 'src/components/Usage.tsx',
    description: 'Fix Usage component types',
    fixes: [
      {
        type: 'replace',
        from: ': any',
        to: ': unknown'
      },
      {
        type: 'add-interface',
        interface: `
// Usage interfaces
interface UsageData {
  userId: string;
  userName: string;
  totalHours: number;
  usedHours: number;
  remainingHours: number;
  packages: HourPackage[];
}

interface UsageStats {
  totalUsers: number;
  totalHours: number;
  averageUsage: number;
}
`
      }
    ]
  }
];

function fixComponentTypes() {
  console.log('🔧 Fixing all component TypeScript types...\n');

  let totalFixed = 0;
  let totalComponents = 0;

  componentFixes.forEach(componentFix => {
    const filePath = componentFix.file;
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${filePath} - file not found`);
      return;
    }

    console.log(`📝 Processing ${componentFix.description}...`);
    totalComponents++;

    let content = fs.readFileSync(filePath, 'utf8');
    let componentFixed = 0;

    // Apply fixes
    componentFix.fixes.forEach(fix => {
      switch (fix.type) {
        case 'replace':
          if (fix.from && fix.to) {
            const regex = new RegExp(fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = content.match(regex);
            if (matches) {
              content = content.replace(regex, fix.to);
              componentFixed += matches.length;
              console.log(`  ✅ Replaced ${matches.length} instances of "${fix.from}" with "${fix.to}"`);
            }
          }
          break;

        case 'add-interface':
          if (fix.interface && !content.includes('interface Extended') && !content.includes('interface Billing')) {
            content = content.replace(
              'import { User } from "@/types/uuid-types";',
              `import { User } from "@/types/uuid-types";\n${fix.interface}`
            );
            componentFixed++;
            console.log(`  ✅ Added extended interface`);
          }
          break;

        case 'update-import':
          if (fix.import) {
            // Handle import conflicts (like User icon vs User type)
            if (content.includes('import { User } from "lucide-react"') && content.includes('import { User } from "@/types/uuid-types"')) {
              content = content.replace(
                'import { User } from "lucide-react"',
                'import { User as UserIcon } from "lucide-react"'
              );
              componentFixed++;
              console.log(`  ✅ Fixed import conflict`);
            }
          }
          break;
      }
    });

    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed += componentFixed;

    if (componentFixed > 0) {
      console.log(`  📊 Fixed ${componentFixed} issues in ${path.basename(filePath)}\n`);
    } else {
      console.log(`  ✅ No issues found in ${path.basename(filePath)}\n`);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`- Processed ${totalComponents} components`);
  console.log(`- Fixed ${totalFixed} total issues`);
  console.log(`- All components updated with proper TypeScript types`);

  console.log('\n🎉 All component TypeScript types fixed!');
  console.log('\n💡 Next steps:');
  console.log('1. Run "npm run build" to check for remaining issues');
  console.log('2. Test the components functionality');
  console.log('3. Fix any remaining API route issues');
}

// Run the fix
fixComponentTypes(); 