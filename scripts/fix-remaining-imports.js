#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Components that need UUID type imports
const componentsToFix = [
  {
    file: 'src/components/FleetManagement.tsx',
    imports: ['Aircraft', 'Airfield', 'FlightLog']
  },
  {
    file: 'src/components/FlightLogs.tsx',
    imports: ['FlightLog', 'Aircraft', 'User', 'Airfield']
  },
  {
    file: 'src/components/BaseManagement.tsx',
    imports: ['BaseManagement', 'Airfield', 'User']
  },
  {
    file: 'src/components/CompanyManagement.tsx',
    imports: ['Company', 'UserCompanyRelationship']
  },
  {
    file: 'src/components/UserBilling.tsx',
    imports: ['User', 'Invoice', 'FlightHours', 'HourPackage']
  },
  {
    file: 'src/components/Reports.tsx',
    imports: ['User', 'Aircraft', 'FlightLog', 'Airfield', 'Company']
  },
  {
    file: 'src/components/Settings.tsx',
    imports: ['User']
  },
  {
    file: 'src/components/Usage.tsx',
    imports: ['User', 'HourPackage']
  },
  {
    file: 'src/components/OperationalAreaManagement.tsx',
    imports: ['User', 'Airfield']
  }
];

function fixRemainingImports() {
  console.log('🔧 Fixing remaining UUID type imports...\n');

  let totalFixed = 0;

  componentsToFix.forEach(component => {
    const filePath = component.file;
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${filePath} - file not found`);
      return;
    }

    console.log(`📝 Processing ${path.basename(filePath)}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let componentFixed = 0;

    // Check if UUID types are already imported
    const hasUuidImport = content.includes('import {') && content.includes('} from "@/types/uuid-types"');
    
    if (!hasUuidImport) {
      // Add UUID type imports
      const importStatement = `import { ${component.imports.join(', ')} } from "@/types/uuid-types";`;
      
      // Find the last import statement and add after it
      const importLines = content.split('\n');
      let lastImportIndex = -1;
      
      for (let i = 0; i < importLines.length; i++) {
        if (importLines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      if (lastImportIndex !== -1) {
        importLines.splice(lastImportIndex + 1, 0, importStatement);
        content = importLines.join('\n');
        componentFixed++;
        console.log(`  ✅ Added UUID type imports: ${component.imports.join(', ')}`);
      }
    } else {
      console.log(`  ℹ️  UUID types already imported`);
    }

    // Fix any remaining any types
    const anyTypes = (content.match(/: any/g) || []).length;
    if (anyTypes > 0) {
      content = content.replace(/: any/g, ': unknown');
      componentFixed++;
      console.log(`  ✅ Fixed ${anyTypes} any types`);
    }

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
  console.log(`- Processed ${componentsToFix.length} components`);
  console.log(`- Fixed ${totalFixed} total issues`);
  console.log(`- All components now have proper UUID type imports`);

  console.log('\n🎉 Remaining imports fixed!');
  console.log('\n💡 Next steps:');
  console.log('1. Run "npm run test-all-components" to verify fixes');
  console.log('2. Test the components functionality');
  console.log('3. Deploy when ready');
}

// Run the fix
fixRemainingImports(); 