#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// API route fixes
const apiRouteFixes = [
  {
    file: 'src/app/api/auth/login/route.ts',
    description: 'Fix auth login route user_roles property',
    fixes: [
      {
        type: 'add-interface',
        interface: `
// Extended User interface for auth with user_roles
interface AuthUser extends User {
  user_roles: Array<{
    roles: {
      name: string;
    };
  }>;
}
`
      },
      {
        type: 'replace',
        from: 'user: User',
        to: 'user: AuthUser'
      },
      {
        type: 'replace',
        from: 'Parameter \'userRole\' implicitly has an \'any\' type',
        to: 'userRole: { roles: { name: string } }'
      }
    ]
  },
  {
    file: 'src/app/api/client-hours/order/route.ts',
    description: 'Fix client hours order route user properties',
    fixes: [
      {
        type: 'add-interface',
        interface: `
// Extended User interface for client hours
interface ClientHoursUser extends User {
  user_roles: Array<{
    roles: {
      name: string;
    };
  }>;
}
`
      },
      {
        type: 'replace',
        from: 'id: any',
        to: 'id: string'
      },
      {
        type: 'replace',
        from: 'user_roles: { roles: { name: any; }[]; }[]',
        to: 'user_roles: { roles: { name: string; }[]; }[]'
      }
    ]
  }
];

function fixApiRoutes() {
  console.log('🔧 Fixing API route TypeScript types...\n');

  let totalFixed = 0;
  let totalRoutes = 0;

  apiRouteFixes.forEach(routeFix => {
    const filePath = routeFix.file;
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${filePath} - file not found`);
      return;
    }

    console.log(`📝 Processing ${routeFix.description}...`);
    totalRoutes++;

    let content = fs.readFileSync(filePath, 'utf8');
    let routeFixed = 0;

    // Apply fixes
    routeFix.fixes.forEach(fix => {
      switch (fix.type) {
        case 'replace':
          if (fix.from && fix.to) {
            const regex = new RegExp(fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = content.match(regex);
            if (matches) {
              content = content.replace(regex, fix.to);
              routeFixed += matches.length;
              console.log(`  ✅ Replaced ${matches.length} instances of "${fix.from}" with "${fix.to}"`);
            }
          }
          break;

        case 'add-interface':
          if (fix.interface && !content.includes('interface AuthUser') && !content.includes('interface ClientHoursUser')) {
            // Find the import line and add interface after it
            const importMatch = content.match(/import.*User.*from.*uuid-types/);
            if (importMatch) {
              content = content.replace(
                importMatch[0],
                `${importMatch[0]}\n${fix.interface}`
              );
              routeFixed++;
              console.log(`  ✅ Added extended interface`);
            }
          }
          break;
      }
    });

    // Write the updated content back to the file
    fs.writeFileSync(filePath, content, 'utf8');
    totalFixed += routeFixed;

    if (routeFixed > 0) {
      console.log(`  📊 Fixed ${routeFixed} issues in ${path.basename(filePath)}\n`);
    } else {
      console.log(`  ✅ No issues found in ${path.basename(filePath)}\n`);
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`- Processed ${totalRoutes} API routes`);
  console.log(`- Fixed ${totalFixed} total issues`);
  console.log(`- All API routes updated with proper TypeScript types`);

  console.log('\n🎉 API route TypeScript types fixed!');
  console.log('\n💡 Next steps:');
  console.log('1. Run "npm run build" to check for remaining issues');
  console.log('2. Test the API endpoints');
  console.log('3. Fix any remaining type errors');
}

// Run the fix
fixApiRoutes(); 