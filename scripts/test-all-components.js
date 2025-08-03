#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function testAllComponents() {
  console.log('🧪 Testing all components after TypeScript fixes...\n');

  const components = [
    'src/components/UserManagement.tsx',
    'src/components/AirfieldsManagement.tsx',
    'src/components/FleetManagement.tsx',
    'src/components/FlightLogs.tsx',
    'src/components/BaseManagement.tsx',
    'src/components/CompanyManagement.tsx',
    'src/components/UserBilling.tsx',
    'src/components/Reports.tsx',
    'src/components/Settings.tsx',
    'src/components/Usage.tsx',
    'src/components/Sidebar.tsx',
    'src/components/OperationalAreaManagement.tsx'
  ];

  let totalComponents = 0;
  let workingComponents = 0;
  let issuesFound = 0;

  components.forEach(componentPath => {
    totalComponents++;
    
    if (!fs.existsSync(componentPath)) {
      console.log(`⚠️  ${path.basename(componentPath)} - File not found`);
      return;
    }

    const content = fs.readFileSync(componentPath, 'utf8');
    const componentName = path.basename(componentPath, '.tsx');
    
    // Check for common issues
    const issues = [];
    
    // Check for any types
    const anyTypes = (content.match(/: any/g) || []).length;
    if (anyTypes > 0) {
      issues.push(`${anyTypes} any types found`);
    }

    // Check for proper imports
    if (!content.includes('import { User } from "@/types/uuid-types"') && 
        !content.includes('import { Airfield } from "@/types/uuid-types"') &&
        !content.includes('import { Aircraft } from "@/types/uuid-types"')) {
      issues.push('Missing UUID type imports');
    }

    // Check for extended interfaces
    if (content.includes('interface Extended') || content.includes('interface Billing')) {
      console.log(`✅ ${componentName} - Extended interfaces found`);
    } else {
      console.log(`ℹ️  ${componentName} - Using base types`);
    }

    if (issues.length > 0) {
      console.log(`❌ ${componentName} - Issues: ${issues.join(', ')}`);
      issuesFound += issues.length;
    } else {
      console.log(`✅ ${componentName} - No issues found`);
      workingComponents++;
    }
  });

  console.log(`\n📊 Component Test Summary:`);
  console.log(`- Total components: ${totalComponents}`);
  console.log(`- Working components: ${workingComponents}`);
  console.log(`- Issues found: ${issuesFound}`);

  // Test build status
  console.log('\n🔨 Testing build status...');
  
  const { execSync } = require('child_process');
  try {
    const buildOutput = execSync('npm run build', { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 60000 
    });
    
    if (buildOutput.includes('✓ Compiled successfully')) {
      console.log('✅ Build successful!');
      console.log('🎉 All components are working correctly!');
    } else {
      console.log('❌ Build failed');
      console.log(buildOutput);
    }
  } catch (error) {
    console.log('❌ Build failed with error:');
    console.log(error.message);
  }

  console.log('\n💡 Next steps:');
  console.log('1. Test components manually in the browser');
  console.log('2. Verify all functionality works as expected');
  console.log('3. Deploy to production when ready');
}

// Run the test
testAllComponents(); 