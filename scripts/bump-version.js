#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Version bump types
const BUMP_TYPES = {
  patch: 'patch', // 0.1.0 -> 0.1.1
  minor: 'minor', // 0.1.0 -> 0.2.0
  major: 'major'  // 0.1.0 -> 1.0.0
};

function bumpVersion(currentVersion, bumpType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }
}

function updatePackageJson(bumpType = 'patch') {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  try {
    // Read current package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;
    
    // Bump version
    const newVersion = bumpVersion(currentVersion, bumpType);
    
    // Update package.json
    packageJson.version = newVersion;
    
    // Write back to file
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log(`✅ Version bumped from ${currentVersion} to ${newVersion}`);
    return newVersion;
    
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const bumpType = process.argv[2] || 'patch';
  
  if (!BUMP_TYPES[bumpType]) {
    console.error(`❌ Invalid bump type. Use: ${Object.keys(BUMP_TYPES).join(', ')}`);
    process.exit(1);
  }
  
  updatePackageJson(bumpType);
}

module.exports = { updatePackageJson, bumpVersion }; 