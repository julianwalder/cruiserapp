#!/usr/bin/env node

const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testPasswordResetEmail() {
  console.log('🧪 Testing Password Reset Email Template...\n');

  try {
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

    // Test data
    const testEmail = process.env.SMTP_USER; // Send to yourself for testing
    const testToken = 'test-reset-token-123456789';
    const testUserName = 'John Doe';
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${testToken}`;

    console.log('📧 Test Data:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Token: ${testToken}`);
    console.log(`   User Name: ${testUserName}`);
    console.log(`   Reset URL: ${resetUrl}`);
    console.log('');

    // Generate the new email-client-compatible HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Cruiser Aviation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #000000; color: #ffffff; padding: 32px 24px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; color: #ffffff;">Cruiser Aviation</h1>
                            <p style="margin: 8px 0 0 0; opacity: 0.8; font-size: 14px; color: #ffffff;">Password Reset Request</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 24px; background-color: #ffffff;">
                            <h2 style="color: #000000; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">Hello ${testUserName},</h2>
                            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">We received a request to reset your password for your <strong style="color: #000000;">Cruiser Aviation</strong> account.</p>
                            
                            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">Click the button below to securely reset your password:</p>
                            
                            <!-- Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                                <tr>
                                    <td align="center">
                                        <table cellpadding="0" cellspacing="0" style="border-radius: 6px; overflow: hidden;">
                                            <tr>
                                                <td style="background-color: #000000; border-radius: 6px;">
                                                    <a href="${resetUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; font-weight: 500; font-size: 14px; border: 1px solid #000000; border-radius: 6px;">Reset Password</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security Notice -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <strong style="color: #000000; display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600;">Security Notice</strong>
                                        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #6b7280;">
                                            <li style="margin-bottom: 4px; font-size: 14px;">This link will expire in 1 hour for your security</li>
                                            <li style="margin-bottom: 4px; font-size: 14px;">If you didn't request this reset, please ignore this email</li>
                                            <li style="margin-bottom: 4px; font-size: 14px;">Never share this link with anyone</li>
                                            <li style="margin-bottom: 4px; font-size: 14px;">This link is unique to your account</li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
                            
                            <!-- Link Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 12px;">
                                        <p style="margin: 0; color: #000000; font-family: 'Courier New', monospace; font-size: 12px; word-break: break-all;">${resetUrl}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">Best regards,<br><strong style="color: #000000;">The Cruiser Aviation Team</strong></p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px; padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 4px 0;">This is an automated message. Please do not reply to this email.</p>
                            <p style="margin: 4px 0;">&copy; 2024 Cruiser Aviation. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

    const text = `Hello ${testUserName},

We received a request to reset your password for your Cruiser Aviation account.

Click the link below to reset your password:
${resetUrl}

⚠️ Security Notice:
- This link will expire in 1 hour
- If you didn't request this reset, please ignore this email
- Never share this link with anyone

Best regards,
The Cruiser Aviation Team

This is an automated message. Please do not reply to this email.`;

    // Send test email
    console.log('📤 Sending password reset test email...');
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || process.env.SMTP_USER,
      to: testEmail,
      subject: '🧪 Cruiser Aviation - Password Reset Email Test (iPhone Compatible)',
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Password reset test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Sent to: ${testEmail}`);
    console.log('');

    console.log('🎉 Email template test completed!');
    console.log('');
    console.log('📋 What to check on iPhone Mail app:');
    console.log('   1. Check your email inbox for the test message');
    console.log('   2. Verify the header background is BLACK (not transparent)');
    console.log('   3. Check that the button is BLACK and clickable');
    console.log('   4. Ensure all text is visible and properly formatted');
    console.log('   5. Test that the reset link works correctly');

  } catch (error) {
    console.error('❌ Error testing email templates:', error);
  }
}

// Run the test
testPasswordResetEmail(); 