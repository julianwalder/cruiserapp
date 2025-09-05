import * as nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Use Gmail SMTP if credentials are available, otherwise fall back to Ethereal Email
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Use SMTP (Gmail, SendGrid, etc.) - works in both development and production
      console.log('📧 Using Gmail SMTP for email delivery...');
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASS!,
        },
      });
    } else {
      // Fallback: Use Ethereal Email for testing when no SMTP credentials
      console.log('📧 Using Ethereal Email for development (no SMTP credentials found)...');
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER || 'test@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'test123',
        },
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Handle "From" address based on environment and SMTP provider
      let fromAddress: string;
      
      if (process.env.SMTP_USER) {
        // Using Gmail SMTP
        const smtpUser = process.env.SMTP_USER;
        const fromEmail = process.env.FROM_EMAIL;
        
        if (fromEmail && fromEmail !== smtpUser) {
          // Use display name format: "Cruiser Aviation" <from-email>
          fromAddress = `"Cruiser Aviation" <${fromEmail}>`;
        } else {
          // Use SMTP_USER with Cruiser Aviation name
          fromAddress = `"Cruiser Aviation" <${smtpUser}>`;
        }
      } else {
        // Fallback: Use FROM_EMAIL with Cruiser Aviation name
        fromAddress = `"Cruiser Aviation" <${process.env.FROM_EMAIL || 'noreply@cruiseraviation.com'}>`;
      }

      const mailOptions = {
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      console.log('📧 Attempting to send email...');
      console.log('   From:', mailOptions.from);
      console.log('   To:', mailOptions.to);
      console.log('   Subject:', mailOptions.subject);
      console.log('   SMTP User:', process.env.SMTP_USER);
      console.log('   Environment:', process.env.NODE_ENV);

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);
      
      // If using Ethereal Email, show the preview URL
      if (info.messageId && info.messageId.includes('ethereal')) {
        console.log('📧 Ethereal Email Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordSetupEmail(email: string, setupToken: string, userName: string, lastName?: string): Promise<boolean> {
    const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/setup-password?token=${setupToken}`;
    
    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Set Up Your Password - Cruiser Aviation</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        body { margin: 0; padding: 0; }
        table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        p { display: block; margin: 13px 0; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
    <!--[if mso]>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
    <td align="center" style="background-color: #f5f5f5;">
    <![endif]-->
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #1e3a8a; padding: 32px 24px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 24px; font-weight: 600; color: #ffffff; letter-spacing: -0.025em;">Welcome to Cruiser Aviation</h1>

                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 24px; background-color: #ffffff;">
                            <h2 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 20px; font-weight: 600; color: #000000;">Captain ${lastName || userName},</h2>
                            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">Your account has been created successfully. To complete your registration and access your <strong style="color: #000000;">Cruiser Aviation</strong> account, you need to set up your password.</p>
                            
                            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">Click the button below to set up your password:</p>
                            
                            <!-- Button -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                                <tr>
                                    <td align="center">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" style="background-color: #1e3a8a; border-radius: 6px;">
                                                    <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">Set Up Password</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 16px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #9ca3af; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="margin: 4px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #6b7280; word-break: break-all;">${setupUrl}</p>
                            
                            <div style="margin: 24px 0 0 0; padding: 16px; background-color: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #92400e; font-weight: 600;">⏰ Important:</p>
                                <p style="margin: 4px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #92400e; line-height: 1.4;">This link will expire in 24 hours for security reasons. If you don't set up your password within this time, please contact support.</p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #6b7280; text-align: center;">If you didn't create an account with Cruiser Aviation, you can safely ignore this email.</p>
                            <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #9ca3af; text-align: center;">© 2024 Cruiser Aviation. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    
    <!--[if mso]>
    </td>
    </tr>
    </table>
    <![endif]-->
</body>
</html>`;

    const text = `Welcome to Cruiser Aviation!

Hello ${userName},

Your account has been created successfully. To complete your registration and access your Cruiser Aviation account, you need to set up your password.

Set up your password by visiting this link:
${setupUrl}

This link will expire in 24 hours for security reasons.

If you didn't create an account with Cruiser Aviation, you can safely ignore this email.

© 2024 Cruiser Aviation. All rights reserved.`;

    return this.sendEmail({
      to: email,
      subject: 'Set Up Your Password - Cruiser Aviation',
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Password Reset - Cruiser Aviation</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        body { margin: 0; padding: 0; }
        table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        p { display: block; margin: 13px 0; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
    <!--[if mso]>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
    <td align="center" style="background-color: #f5f5f5;">
    <![endif]-->
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                    
                    <!-- Header - Using dark blue instead of black for better dark mode compatibility -->
                    <tr>
                        <td align="center" style="background-color: #1e3a8a; padding: 32px 24px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 24px; font-weight: 600; color: #ffffff; letter-spacing: -0.025em;">Cruiser Aviation</h1>
                            <p style="margin: 8px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #ffffff; opacity: 0.9;">Password Reset Request</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 24px; background-color: #ffffff;">
                            <h2 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 20px; font-weight: 600; color: #000000;">Hello ${userName},</h2>
                            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">We received a request to reset your password for your <strong style="color: #000000;">Cruiser Aviation</strong> account.</p>
                            
                            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">Click the button below to securely reset your password:</p>
                            
                            <!-- Button -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                                <tr>
                                    <td align="center">
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td align="center" style="background-color: #1e3a8a; border-radius: 6px;">
                                                    <a href="${resetUrl}" style="display: inline-block; background-color: #1e3a8a; color: #ffffff; padding: 12px 24px; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-weight: 500; font-size: 14px; border: 1px solid #1e3a8a; border-radius: 6px; line-height: 1.4;">Reset Password</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security Notice -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <strong style="display: block; margin-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #000000;">Security Notice</strong>
                                        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                            <li style="margin-bottom: 4px;">This link will expire in 1 hour for your security</li>
                                            <li style="margin-bottom: 4px;">If you didn't request this reset, please ignore this email</li>
                                            <li style="margin-bottom: 4px;">Never share this link with anyone</li>
                                            <li style="margin-bottom: 4px;">This link is unique to your account</li>
                                        </ul>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">If the button doesn't work, copy and paste this link into your browser:</p>
                            
                            <!-- Link Box -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 12px;">
                                        <p style="margin: 0; font-family: 'Courier New', monospace; font-size: 12px; color: #000000; word-break: break-all; line-height: 1.4;">${resetUrl}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">Best regards,<br><strong style="color: #000000;">The Cruiser Aviation Team</strong></p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <p style="margin: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply to this email.</p>
                            <p style="margin: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #9ca3af;">&copy; 2024 Cruiser Aviation. All rights reserved.</p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
    
    <!--[if mso]>
    </td>
    </tr>
    </table>
    <![endif]-->
    
</body>
</html>`;

    const text = `Hello ${userName},

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

    return this.sendEmail({
      to: email,
      subject: 'Cruiser Aviation - Password Reset Request',
      html,
      text,
    });
  }

  async sendPasswordChangedEmail(email: string, userName: string): Promise<boolean> {
    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Password Changed - Cruiser Aviation</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        body { margin: 0; padding: 0; }
        table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        p { display: block; margin: 13px 0; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
    <!--[if mso]>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
    <td align="center" style="background-color: #f5f5f5;">
    <![endif]-->
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center" style="padding: 20px;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                    
                    <!-- Header - Using dark blue instead of black for better dark mode compatibility -->
                    <tr>
                        <td align="center" style="background-color: #1e3a8a; padding: 32px 24px; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 24px; font-weight: 600; color: #ffffff; letter-spacing: -0.025em;">Cruiser Aviation</h1>
                            <p style="margin: 8px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #ffffff; opacity: 0.9;">Password Successfully Changed</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 32px 24px; background-color: #ffffff;">
                            <h2 style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 20px; font-weight: 600; color: #000000;">Hello ${userName},</h2>
                            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">Your password has been successfully changed for your <strong style="color: #000000;">Cruiser Aviation</strong> account.</p>
                            
                            <!-- Success Box -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;">
                                <tr>
                                    <td style="padding: 16px;">
                                        <strong style="display: block; margin-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #000000;">Password Update Confirmed</strong>
                                        <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #6b7280; font-size: 14px; line-height: 1.6;">Your account password was updated on <span style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 8px 12px; border-radius: 4px; margin: 8px 0; display: inline-block;"><strong style="color: #000000; font-size: 14px;">${new Date().toLocaleString()}</strong></span></p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;"><strong style="color: #000000;">Security Check:</strong></p>
                            <ul style="color: #6b7280; margin: 16px 0; padding-left: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; line-height: 1.6;">
                                <li style="margin-bottom: 8px;">If you made this change, you can safely ignore this email</li>
                                <li style="margin-bottom: 8px;">If you didn't make this change, please contact us immediately</li>
                                <li style="margin-bottom: 8px;">Your account is now secured with your new password</li>
                            </ul>
                            
                            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">You can now log in to your account with your new password.</p>
                            
                            <p style="margin: 0 0 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 14px; color: #6b7280; line-height: 1.6;">Best regards,<br><strong style="color: #000000;">The Cruiser Aviation Team</strong></p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                            <p style="margin: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #9ca3af;">This is an automated message. Please do not reply to this email.</p>
                            <p style="margin: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 12px; color: #9ca3af;">&copy; 2024 Cruiser Aviation. All rights reserved.</p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
    
    <!--[if mso]>
    </td>
    </tr>
    </table>
    <![endif]-->
    
</body>
</html>`;

    const text = `Hello ${userName},

Your password has been successfully changed.

✅ Password Update Confirmed
Your account password was updated on ${new Date().toLocaleString()}.

If you made this change, you can safely ignore this email.
If you didn't make this change, please contact us immediately.

You can now log in to your account with your new password.

Best regards,
The Cruiser Aviation Team

This is an automated message. Please do not reply to this email.`;

    return this.sendEmail({
      to: email,
      subject: 'Cruiser Aviation - Your Password Has Been Changed',
      html,
      text,
    });
  }
}

export const emailService = new EmailService(); 