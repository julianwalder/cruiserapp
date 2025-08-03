#!/usr/bin/env node

const fs = require('fs');

function fixUserManagementTypes() {
  console.log('🔧 Fixing UserManagement TypeScript types...\n');

  const filePath = 'src/components/UserManagement.tsx';
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ UserManagement.tsx file not found');
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Fix 1: Replace any types with proper types
  const replacements = [
    // Function parameters
    { from: ': any', to: ': unknown' },
    { from: 'validationData?: any', to: 'validationData?: { [key: string]: unknown }' },
    { from: 'paymentData?: any', to: 'paymentData?: { [key: string]: unknown }' },
    { from: 'field: string, value: any', to: 'field: string, value: unknown' },
    
    // Event handlers
    { from: 'event: React.ChangeEvent<HTMLInputElement>', to: 'event: React.ChangeEvent<HTMLInputElement>' },
    
    // API responses
    { from: 'data: any', to: 'data: unknown' },
    { from: 'error: any', to: 'error: unknown' },
    
    // Form data
    { from: 'formData: any', to: 'formData: FormData' },
    
    // User data
    { from: 'userData: any', to: 'userData: unknown' },
    { from: 'user: any', to: 'user: User' },
    
    // Array types
    { from: 'users: any[]', to: 'users: User[]' },
    { from: 'roles: any[]', to: 'roles: string[]' },
    
    // Object types
    { from: 'user: any', to: 'user: User' },
    { from: 'selectedUser: any', to: 'selectedUser: User' },
    { from: 'currentUser: any', to: 'currentUser: User' },
  ];

  let updatedCount = 0;
  replacements.forEach(replacement => {
    const regex = new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, replacement.to);
      updatedCount += matches.length;
      console.log(`✅ Replaced ${matches.length} instances of "${replacement.from}" with "${replacement.to}"`);
    }
  });

  // Fix 2: Add proper interface for extended user
  const extendedUserInterface = `
// Extended User interface for UserManagement component
interface ExtendedUser extends User {
  roles: string[];
  lastLoginAt?: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
`;

  if (!content.includes('interface ExtendedUser')) {
    content = content.replace(
      'import { User } from "@/types/uuid-types";',
      `import { User } from "@/types/uuid-types";\n${extendedUserInterface}`
    );
    console.log('✅ Added ExtendedUser interface');
  }

  // Fix 3: Update useState calls to use ExtendedUser
  content = content.replace(/useState<User\[\]>/g, 'useState<ExtendedUser[]>');
  content = content.replace(/useState<User \| null>/g, 'useState<ExtendedUser | null>');
  content = content.replace(/: User\[\]/g, ': ExtendedUser[]');
  content = content.replace(/: User \| null/g, ': ExtendedUser | null');
  content = content.replace(/: User\)/g, ': ExtendedUser)');
  content = content.replace(/: User,/g, ': ExtendedUser,');
  content = content.replace(/: User$/g, ': ExtendedUser');

  console.log('✅ Updated User type references to ExtendedUser');

  // Fix 4: Add proper error handling types
  const errorHandlingTypes = `
// Error handling types
interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  message?: string;
}
`;

  if (!content.includes('interface ApiError')) {
    content = content.replace(
      'import { User } from "@/types/uuid-types";',
      `import { User } from "@/types/uuid-types";\n${errorHandlingTypes}`
    );
    console.log('✅ Added error handling types');
  }

  // Fix 5: Add proper form validation types
  const formValidationTypes = `
// Form validation types
interface FormErrors {
  [key: string]: string | undefined;
}

interface FormState {
  isValid: boolean;
  errors: FormErrors;
  touched: { [key: string]: boolean };
}
`;

  if (!content.includes('interface FormErrors')) {
    content = content.replace(
      'import { User } from "@/types/uuid-types";',
      `import { User } from "@/types/uuid-types";\n${formValidationTypes}`
    );
    console.log('✅ Added form validation types');
  }

  // Write the updated content back to the file
  fs.writeFileSync(filePath, content, 'utf8');

  console.log(`\n📊 Summary:`);
  console.log(`- Fixed ${updatedCount} any type references`);
  console.log(`- Added ExtendedUser interface`);
  console.log(`- Added error handling types`);
  console.log(`- Added form validation types`);
  console.log(`- Updated User type references`);

  console.log('\n🎉 UserManagement TypeScript types fixed!');
  console.log('\n💡 Next steps:');
  console.log('1. Run "npm run build" to check for remaining issues');
  console.log('2. Test the component functionality');
  console.log('3. Fix any remaining type errors manually');
}

// Run the fix
fixUserManagementTypes(); 