const nodemailer = require('nodemailer');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testEmailConfiguration() {
  console.log('🧪 Testing Email Configuration...\n');

  // Check environment variables
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.log('\nPlease add these variables to your .env.local file.');
    process.exit(1);
  }

  // Display configuration (without showing password)
  console.log('📧 Email Configuration:');
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   Secure: ${process.env.SMTP_SECURE || 'false'}`);
  console.log(`   User: ${process.env.SMTP_USER}`);
  console.log(`   From Email: ${process.env.FROM_EMAIL || process.env.SMTP_USER}`);
  console.log('   Password: [HIDDEN]');
  console.log('');

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log('🔍 Verifying SMTP connection...');
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Send test email
    console.log('📤 Sending test email...');
    
    const testEmail = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: '🧪 Cruiser Aviation - Email Configuration Test',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Email Configuration Test</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
                .success { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🛩️ Cruiser Aviation</h1>
                <p>Email Configuration Test</p>
            </div>
            <div class="content">
                <h2>✅ Email Configuration Successful!</h2>
                <p>This is a test email to verify that your email configuration is working correctly.</p>
                
                <div class="success">
                    <strong>Configuration Details:</strong>
                    <ul>
                        <li>SMTP Host: ${process.env.SMTP_HOST}</li>
                        <li>SMTP Port: ${process.env.SMTP_PORT}</li>
                        <li>Secure: ${process.env.SMTP_SECURE || 'false'}</li>
                        <li>From Email: ${process.env.FROM_EMAIL || process.env.SMTP_USER}</li>
                        <li>Test Time: ${new Date().toLocaleString()}</li>
                    </ul>
                </div>
                
                <p>Your email service is now ready for password reset emails and other notifications.</p>
                
                <p>Best regards,<br>The Cruiser Aviation Team</p>
            </div>
        </body>
        </html>
      `,
      text: `
Cruiser Aviation - Email Configuration Test

✅ Email Configuration Successful!

This is a test email to verify that your email configuration is working correctly.

Configuration Details:
- SMTP Host: ${process.env.SMTP_HOST}
- SMTP Port: ${process.env.SMTP_PORT}
- Secure: ${process.env.SMTP_SECURE || 'false'}
- From Email: ${process.env.FROM_EMAIL || process.env.SMTP_USER}
- Test Time: ${new Date().toLocaleString()}

Your email service is now ready for password reset emails and other notifications.

Best regards,
The Cruiser Aviation Team
      `,
    };

    const info = await transporter.sendMail(testEmail);
    
    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Sent to: ${testEmail.to}`);
    console.log('');

    // Additional information
    console.log('📋 Next Steps:');
    console.log('   1. Check your email inbox for the test message');
    console.log('   2. If using Gmail, check the "Sent" folder');
    console.log('   3. Test the password reset flow in your application');
    console.log('   4. Monitor for any delivery issues');
    console.log('');

    if (process.env.SMTP_HOST === 'smtp.gmail.com') {
      console.log('💡 Gmail Tips:');
      console.log('   - Check your Gmail "Sent" folder to confirm the email was sent');
      console.log('   - If emails are going to spam, add your app to contacts');
      console.log('   - Monitor Gmail\'s security settings for any blocks');
      console.log('');
    }

    console.log('🎉 Email configuration test completed successfully!');

  } catch (error) {
    console.error('❌ Email configuration test failed:');
    console.error('   Error:', error.message);
    console.log('');
    
    if (error.code === 'EAUTH') {
      console.log('🔧 Authentication Error - Common Solutions:');
      console.log('   1. Verify your email and password are correct');
      console.log('   2. For Gmail, ensure you\'re using an App Password');
      console.log('   3. Check that 2-Factor Authentication is enabled');
      console.log('   4. Verify the App Password was generated for "Mail"');
      console.log('');
    } else if (error.code === 'ECONNECTION') {
      console.log('🔧 Connection Error - Common Solutions:');
      console.log('   1. Check your internet connection');
      console.log('   2. Verify the SMTP host and port are correct');
      console.log('   3. Check if your firewall is blocking the connection');
      console.log('   4. Try using a different port (465 with SSL)');
      console.log('');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('🔧 Timeout Error - Common Solutions:');
      console.log('   1. Check your network connection');
      console.log('   2. Verify the SMTP server is accessible');
      console.log('   3. Try using a different port');
      console.log('   4. Check if your ISP is blocking SMTP traffic');
      console.log('');
    }

    console.log('📚 For more help, see:');
    console.log('   - GMAIL_SMTP_SETUP.md');
    console.log('   - PASSWORD_RESET_SETUP.md');
    
    process.exit(1);
  }
}

// Run the test
testEmailConfiguration(); 