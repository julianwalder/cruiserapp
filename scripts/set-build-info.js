#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getGitCommitHash() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('⚠️  Could not get git commit hash:', error.message);
    return 'unknown';
  }
}

function getGitCommitDate() {
  try {
    return execSync('git log -1 --format=%cd --date=short', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('⚠️  Could not get git commit date:', error.message);
    return new Date().toISOString().split('T')[0];
  }
}

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn('⚠️  Could not get git branch:', error.message);
    return 'unknown';
  }
}

function createBuildInfoFile() {
  const buildInfo = {
    version: require('../package.json').version,
    commitHash: getGitCommitHash(),
    commitDate: getGitCommitDate(),
    branch: getGitBranch(),
    buildDate: new Date().toISOString().split('T')[0],
    buildTime: new Date().toTimeString().split(' ')[0],
    environment: process.env.NODE_ENV || 'development'
  };

  const buildInfoPath = path.join(process.cwd(), 'src/lib/build-info.json');
  
  try {
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
    console.log('✅ Build info file created:', buildInfoPath);
    console.log('📋 Build info:', buildInfo);
  } catch (error) {
    console.error('❌ Error creating build info file:', error.message);
  }
}

// Create .env.local with build info for development
function createEnvFile() {
  const buildInfo = {
    NEXT_PUBLIC_COMMIT_HASH: getGitCommitHash(),
    NEXT_PUBLIC_COMMIT_DATE: getGitCommitDate(),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString().split('T')[0],
    NEXT_PUBLIC_VERSION: require('../package.json').version
  };

  const envContent = Object.entries(buildInfo)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const envPath = path.join(process.cwd(), '.env.build');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Build environment file created:', envPath);
  } catch (error) {
    console.error('❌ Error creating build environment file:', error.message);
  }
}

// CLI usage
if (require.main === module) {
  const command = process.argv[2] || 'all';
  
  switch (command) {
    case 'build-info':
      createBuildInfoFile();
      break;
    case 'env':
      createEnvFile();
      break;
    case 'all':
      createBuildInfoFile();
      createEnvFile();
      break;
    default:
      console.error('❌ Invalid command. Use: build-info, env, or all');
      process.exit(1);
  }
}

module.exports = { createBuildInfoFile, createEnvFile }; 