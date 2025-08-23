# 🛠️ Local Development Scripts

## 📋 **Overview**

Local development scripts and test files are now excluded from Git to improve security, reduce repository size, and maintain a clean codebase.

## 🔒 **Security Benefits**

### **Why Exclude Local Scripts?**

1. **🔐 Prevent Secret Exposure**
   - Local scripts often contain hardcoded credentials for testing
   - Reduces risk of accidentally committing sensitive data
   - Prevents exposure of database URLs, API keys, and tokens

2. **🧹 Clean Repository**
   - Keeps the main codebase focused on production code
   - Reduces noise in pull requests and code reviews
   - Makes it easier to identify actual application changes

3. **🚀 Faster Operations**
   - Smaller repository size for faster cloning and fetching
   - Reduced bandwidth usage
   - Faster CI/CD pipeline execution

## 📁 **What's Excluded**

### **Scripts Directory**
All JavaScript files in `/scripts/` are excluded:
```
/scripts/*.js
```

**Examples of excluded files:**
- `scripts/update-with-real-data.js`
- `scripts/trigger-new-verification.js`
- `scripts/debug-timeline-data.js`
- `scripts/fetch-veriff-real-data.js`
- `scripts/check-token-status.js`

### **Root Directory Test Files**
Local test and utility files in the root directory:
```
test-*.js
debug-*.js
direct-*.js
simple-*.js
final-*.js
create-*.js
add-*.js
fix-*.js
# ... and many more patterns
```

## ✅ **What's Still Included**

### **Production Code**
- ✅ All application source code in `/src/`
- ✅ Configuration files (package.json, next.config.js, etc.)
- ✅ Documentation files in `/docs/`
- ✅ Database migration scripts (if needed for deployment)

### **Shared Scripts**
If you have scripts that should be shared with the team:
- ✅ Database setup scripts
- ✅ Deployment scripts
- ✅ Shared utility functions
- ✅ CI/CD configuration

## 🛠️ **Working with Local Scripts**

### **Creating New Local Scripts**
1. Create your script in the `/scripts/` directory
2. Use environment variables for all sensitive data
3. Add proper error handling and validation
4. Test locally before using

### **Example Local Script Pattern**
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function myLocalScript() {
  // Your script logic here
  console.log('Running local script...');
}

myLocalScript().catch(console.error);
```

### **Sharing Scripts with Team**
If you need to share a script with your team:

1. **Create a template version**:
   ```javascript
   // scripts/template-example.js
   // This file shows the pattern for local scripts
   // Copy this file and modify for your needs
   ```

2. **Document the script**:
   ```markdown
   ## Script: update-user-data.js
   
   **Purpose**: Updates user data from external source
   **Usage**: `node scripts/update-user-data.js`
   **Requirements**: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Add to documentation**:
   - Document the script in `/docs/`
   - Include setup instructions
   - List required environment variables

## 🔄 **Migration from Git**

### **If Scripts Are Already in Git**
If you have scripts already committed to Git:

1. **Remove from tracking** (but keep locally):
   ```bash
   git rm --cached scripts/*.js
   git commit -m "Remove local scripts from Git tracking"
   ```

2. **Update .gitignore** (already done)

3. **Verify exclusion**:
   ```bash
   git status
   # Should not show scripts/*.js files
   ```

### **Backup Important Scripts**
Before removing from Git, consider:

1. **Creating templates** for commonly used patterns
2. **Documenting** the purpose and usage of each script
3. **Saving** any unique logic that might be needed later

## 📚 **Best Practices**

### **For Local Scripts**
1. **Use environment variables** for all sensitive data
2. **Add validation** for required environment variables
3. **Include error handling** and clear error messages
4. **Add comments** explaining what the script does
5. **Test thoroughly** before using with production data

### **For Team Collaboration**
1. **Document** any scripts that others might need
2. **Create templates** for common patterns
3. **Share setup instructions** for required environment variables
4. **Use consistent naming** conventions

### **For Security**
1. **Never hardcode** credentials or sensitive data
2. **Use .env.local** for local environment variables
3. **Validate** all inputs and environment variables
4. **Test** scripts in a safe environment first

## 🚨 **Important Notes**

### **Environment Variables**
Make sure your `.env.local` file contains all required variables:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VERIFF_API_KEY=your_veriff_api_key
VERIFF_API_SECRET=your_veriff_api_secret
# ... other required variables
```

### **Backup Strategy**
Consider backing up important local scripts:
- **Personal backup**: Keep copies in a private repository
- **Documentation**: Document the purpose and usage of each script
- **Templates**: Create reusable templates for common patterns

## 📞 **Support**

If you need help with local scripts:
1. Check the existing documentation in `/docs/`
2. Look for template files in `/scripts/`
3. Review the environment variable setup
4. Test with a small dataset first

---

**Last Updated**: January 2025  
**Next Review**: As needed when adding new script patterns
