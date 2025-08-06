declare module "*/build-info.json" {
  const value: {
    version: string;
    commitHash: string;
    commitDate: string;
    branch: string;
    buildDate: string;
    buildTime: string;
    environment: string;
  };
  export default value;
} 