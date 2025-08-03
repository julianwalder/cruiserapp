#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files to update with their specific changes
const filesToUpdate = [
  {
    file: 'src/components/UserManagement.tsx',
    changes: [
      { from: 'interface User {', to: 'import { User } from "@/types/uuid-types";\n\n// Local interface for backward compatibility' },
      { from: '  id: string;', to: '  // id is now UUID type from uuid-types' },
      { from: 'interface User {', to: '// Using User from uuid-types' }
    ]
  },
  {
    file: 'src/components/AirfieldsManagement.tsx',
    changes: [
      { from: 'interface Airfield {', to: 'import { Airfield } from "@/types/uuid-types";\n\n// Local interface for backward compatibility' },
      { from: '  id: string;', to: '  // id is now UUID type from uuid-types' },
      { from: 'interface Airfield {', to: '// Using Airfield from uuid-types' }
    ]
  },
  {
    file: 'src/components/Sidebar.tsx',
    changes: [
      { from: 'interface User {', to: 'import { User } from "@/types/uuid-types";\n\n// Local interface for backward compatibility' },
      { from: '  id: string;', to: '  // id is now UUID type from uuid-types' },
      { from: 'interface User {', to: '// Using User from uuid-types' }
    ]
  },
  {
    file: 'src/app/dashboard/page.tsx',
    changes: [
      { from: 'interface User {', to: 'import { User } from "@/types/uuid-types";\n\n// Local interface for backward compatibility' },
      { from: '  id: string;', to: '  // id is now UUID type from uuid-types' },
      { from: 'interface User {', to: '// Using User from uuid-types' }
    ]
  },
  {
    file: 'src/lib/auth.ts',
    changes: [
      { from: 'export interface User {', to: 'import { User } from "@/types/uuid-types";\n\n// Re-export for backward compatibility' },
      { from: '  id: string;', to: '  // id is now UUID type from uuid-types' },
      { from: 'export interface User {', to: '// Using User from uuid-types' }
    ]
  },
  {
    file: 'src/lib/validations/airfield.ts',
    changes: [
      { from: 'export interface Airfield {', to: 'import { Airfield } from "@/types/uuid-types";\n\n// Re-export for backward compatibility' },
      { from: '  id: string;', to: '  // id is now UUID type from uuid-types' },
      { from: 'export interface Airfield {', to: '// Using Airfield from uuid-types' }
    ]
  }
];

// Function to update a file
function updateFile(filePath, changes) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    changes.forEach(change => {
      if (content.includes(change.from)) {
        content = content.replace(change.from, change.to);
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Function to find and update all TypeScript files
function updateAllTypeScriptFiles() {
  const srcDir = 'src';
  const updatedFiles = [];

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        // Skip the uuid-types file itself
        if (filePath !== 'src/types/uuid-types.ts') {
          updatedFiles.push(filePath);
        }
      }
    });
  }

  walkDir(srcDir);

  console.log('🔍 Found TypeScript files:');
  updatedFiles.forEach(file => console.log(`  - ${file}`));
  console.log('');

  return updatedFiles;
}

// Function to add UUID imports to files that need them
function addUUIDImports() {
  const filesToAddImports = [
    'src/app/api/users/route.ts',
    'src/app/api/users/[id]/route.ts',
    'src/app/api/airfields/route.ts',
    'src/app/api/airfields/[id]/route.ts',
    'src/app/api/flight-logs/route.ts',
    'src/app/api/flight-logs/[id]/route.ts',
    'src/app/api/aircraft/route.ts',
    'src/app/api/aircraft/[id]/route.ts',
    'src/app/api/auth/login/route.ts',
    'src/app/api/auth/me/route.ts'
  ];

  filesToAddImports.forEach(filePath => {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return;
      }

      let content = fs.readFileSync(filePath, 'utf8');
      
      // Check if UUID types are already imported
      if (content.includes('@/types/uuid-types')) {
        console.log(`⚠️  UUID types already imported: ${filePath}`);
        return;
      }

      // Add import at the top of the file
      const importStatement = "import { UUID } from '@/types/uuid-types';\n";
      
      // Find the first import statement to add after it
      const lines = content.split('\n');
      let insertIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() === '' && insertIndex > 0) {
          break;
        }
      }
      
      lines.splice(insertIndex, 0, importStatement);
      content = lines.join('\n');
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Added UUID import: ${filePath}`);
      
    } catch (error) {
      console.error(`❌ Error updating ${filePath}:`, error.message);
    }
  });
}

// Main execution
console.log('🚀 Starting TypeScript to UUID migration...\n');

// Update specific files with interface changes
console.log('📝 Updating specific files with interface changes:');
let updatedCount = 0;
filesToUpdate.forEach(({ file, changes }) => {
  if (updateFile(file, changes)) {
    updatedCount++;
  }
});

console.log(`\n✅ Updated ${updatedCount} files with interface changes\n`);

// Add UUID imports to API files
console.log('📦 Adding UUID imports to API files:');
addUUIDImports();

// Find all TypeScript files
console.log('\n🔍 Scanning for all TypeScript files...');
const allFiles = updateAllTypeScriptFiles();

console.log(`\n📊 Summary:`);
console.log(`- Found ${allFiles.length} TypeScript files`);
console.log(`- Updated ${updatedCount} files with interface changes`);
console.log(`- Added UUID imports to API files`);

console.log('\n🎉 TypeScript to UUID migration completed!');
console.log('\n📋 Next steps:');
console.log('1. Review the updated files to ensure they work correctly');
console.log('2. Update any remaining hardcoded string ID references');
console.log('3. Test the application thoroughly');
console.log('4. Update any API endpoints that expect string IDs'); 