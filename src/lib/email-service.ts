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
    // Force Ethereal Email for development to avoid SMTP authentication issues
    if (process.env.NODE_ENV === 'production' && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Production: Use SMTP (Gmail, SendGrid, etc.)
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
      // Development: Always use Ethereal Email for testing
      console.log('📧 Using Ethereal Email for development...');
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
      
      if (process.env.NODE_ENV === 'production' && process.env.SMTP_USER) {
        // Production with Gmail SMTP
        const smtpUser = process.env.SMTP_USER;
        const fromEmail = process.env.FROM_EMAIL;
        
        if (fromEmail && fromEmail !== smtpUser) {
          // Use display name format: "Cruiser Aviation" <smtp-user@gmail.com>
          fromAddress = `"Cruiser Aviation" <${fromEmail}>`;
        } else {
          // Use SMTP_USER directly
          fromAddress = smtpUser;
        }
      } else {
        // Development or other SMTP providers
        fromAddress = process.env.FROM_EMAIL || 'noreply@cruiseraviation.com';
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

  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Cruiser Aviation</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #374151; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #fafafa;
        }
        .container {
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
        }
        .header { 
            background: #000000; 
            color: white; 
            padding: 32px 24px; 
            text-align: center; 
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            letter-spacing: -0.025em;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.8;
            font-size: 14px;
        }
        .content { 
            padding: 32px 24px; 
            background: white;
        }
        .content h2 {
            color: #000000;
            margin: 0 0 16px 0;
            font-size: 20px;
            font-weight: 600;
        }
        .content p {
            margin: 0 0 16px 0;
            color: #6b7280;
            font-size: 14px;
        }
        .button { 
            display: inline-block; 
            background: #000000; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0; 
            font-weight: 500;
            font-size: 14px;
            border: 1px solid #000000;
        }
        .warning { 
            background: #f9fafb; 
            border: 1px solid #e5e7eb; 
            padding: 16px; 
            border-radius: 6px; 
            margin: 20px 0; 
        }
        .warning strong {
            color: #000000;
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
        }
        .warning ul {
            margin: 8px 0 0 0;
            padding-left: 20px;
            color: #6b7280;
        }
        .warning li {
            margin-bottom: 4px;
            font-size: 14px;
        }
        .link-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 12px;
            border-radius: 6px;
            margin: 16px 0;
            word-break: break-all;
        }
        .link-box p {
            margin: 0;
            color: #000000;
            font-family: 'Courier New', monospace;
            font-size: 12px;
        }
        .footer { 
            text-align: center; 
            margin-top: 32px; 
            color: #9ca3af; 
            font-size: 12px; 
            padding: 16px 24px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 4px 0;
        }
        .logo {
            font-weight: 600;
            color: #000000;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Cruiser Aviation</h1>
            <p>Password Reset Request</p>
        </div>
        <div class="content">
            <h2>Hello ${userName},</h2>
            <p>We received a request to reset your password for your <span class="logo">Cruiser Aviation</span> account.</p>
            
            <p>Click the button below to securely reset your password:</p>
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
                <strong>Security Notice</strong>
                <ul>
                    <li>This link will expire in 1 hour for your security</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Never share this link with anyone</li>
                    <li>This link is unique to your account</li>
                </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <div class="link-box">
                <p>${resetUrl}</p>
            </div>
            
            <p>Best regards,<br><strong>The Cruiser Aviation Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2024 Cruiser Aviation. All rights reserved.</p>
        </div>
    </div>
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
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed - Cruiser Aviation</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #374151; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #fafafa;
        }
        .container {
            background: white;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
        }
        .header { 
            background: #000000; 
            color: white; 
            padding: 32px 24px; 
            text-align: center; 
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            letter-spacing: -0.025em;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.8;
            font-size: 14px;
        }
        .content { 
            padding: 32px 24px; 
            background: white;
        }
        .content h2 {
            color: #000000;
            margin: 0 0 16px 0;
            font-size: 20px;
            font-weight: 600;
        }
        .content p {
            margin: 0 0 16px 0;
            color: #6b7280;
            font-size: 14px;
        }
        .success { 
            background: #f9fafb; 
            border: 1px solid #e5e7eb; 
            padding: 16px; 
            border-radius: 6px; 
            margin: 20px 0; 
        }
        .success strong {
            color: #000000;
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
        }
        .success p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }
        .footer { 
            text-align: center; 
            margin-top: 32px; 
            color: #9ca3af; 
            font-size: 12px; 
            padding: 16px 24px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 4px 0;
        }
        .logo {
            font-weight: 600;
            color: #000000;
        }
        .timestamp {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            border-radius: 4px;
            margin: 8px 0;
            display: inline-block;
        }
        .timestamp strong {
            color: #000000;
            font-size: 14px;
        }
        .security-list {
            color: #6b7280; 
            margin: 16px 0; 
            padding-left: 20px;
            font-size: 14px;
        }
        .security-list li {
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Cruiser Aviation</h1>
            <p>Password Successfully Changed</p>
        </div>
        <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Your password has been successfully changed for your <span class="logo">Cruiser Aviation</span> account.</p>
            
            <div class="success">
                <strong>Password Update Confirmed</strong>
                <p>Your account password was updated on <span class="timestamp"><strong>${new Date().toLocaleString()}</strong></span></p>
            </div>
            
            <p><strong>Security Check:</strong></p>
            <ul class="security-list">
                <li>If you made this change, you can safely ignore this email</li>
                <li>If you didn't make this change, please contact us immediately</li>
                <li>Your account is now secured with your new password</li>
            </ul>
            
            <p>You can now log in to your account with your new password.</p>
            
            <p>Best regards,<br><strong>The Cruiser Aviation Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2024 Cruiser Aviation. All rights reserved.</p>
        </div>
    </div>
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