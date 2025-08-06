// Version utility for reading package.json version
import packageJson from '../../package.json';

// Try to import build info (created during build process)
let buildInfo: any = null;
try {
  buildInfo = require('./build-info.json');
} catch (error) {
  // Build info file doesn't exist in development
  buildInfo = null;
}

export interface VersionInfo {
  version: string;
  name: string;
  buildDate: string;
  buildTime: string;
  commitHash?: string;
  commitDate?: string;
  environment: string;
}

// Get version from package.json
export function getVersion(): string {
  return packageJson.version;
}

// Get app name from package.json
export function getAppName(): string {
  return packageJson.name;
}

// Get build date and time
export function getBuildInfo(): { buildDate: string; buildTime: string } {
  const now = new Date();
  const buildDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const buildTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
  
  return { buildDate, buildTime };
}

// Get environment
export function getEnvironment(): string {
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NODE_ENV || 'development';
  } else {
    // Server-side
    return process.env.NODE_ENV || 'development';
  }
}

// Get git commit info (if available)
export function getGitInfo(): { commitHash?: string; commitDate?: string } {
  // First try build info file (created during build process)
  if (buildInfo) {
    return {
      commitHash: buildInfo.commitHash,
      commitDate: buildInfo.commitDate
    };
  }
  
  // Fallback to environment variables
  const commitHash = process.env.NEXT_PUBLIC_COMMIT_HASH || 
                    process.env.VERCEL_GIT_COMMIT_SHA ||
                    undefined;
  
  const commitDate = process.env.NEXT_PUBLIC_COMMIT_DATE ||
                    process.env.VERCEL_GIT_COMMIT_MESSAGE ||
                    undefined;
  
  return { commitHash, commitDate };
}

// Get complete version info
export function getVersionInfo(): VersionInfo {
  const { buildDate, buildTime } = getBuildInfo();
  const { commitHash, commitDate } = getGitInfo();
  
  return {
    version: getVersion(),
    name: getAppName(),
    buildDate,
    buildTime,
    commitHash,
    commitDate,
    environment: getEnvironment()
  };
}

// Format version for display
export function formatVersion(includeBuildInfo = false, includeCommit = false): string {
  const version = getVersion();
  const { buildDate } = getBuildInfo();
  const { commitHash } = getGitInfo();
  
  let formattedVersion = version;
  
  if (includeBuildInfo) {
    formattedVersion += ` (${buildDate})`;
  }
  
  if (includeCommit && commitHash) {
    formattedVersion += ` - ${commitHash.substring(0, 7)}`;
  }
  
  return formattedVersion;
}

// Get short version (just version number)
export function getShortVersion(): string {
  return getVersion();
}

// Get full version with build info
export function getFullVersion(): string {
  return formatVersion(true, true);
} 