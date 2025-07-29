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
    if (process.env.NODE_ENV === 'production') {
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
      // Development: Use Ethereal Email for testing
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
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@cruiserapp.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
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
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛩️ Cruiser Aviation</h1>
        <p>Password Reset Request</p>
    </div>
    <div class="content">
        <h2>Hello ${userName},</h2>
        <p>We received a request to reset your password for your Cruiser Aviation account.</p>
        
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
            </ul>
        </div>
        
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #1e40af;">${resetUrl}</p>
        
        <p>Best regards,<br>The Cruiser Aviation Team</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>&copy; 2024 Cruiser Aviation. All rights reserved.</p>
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
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .success { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛩️ Cruiser Aviation</h1>
        <p>Password Successfully Changed</p>
    </div>
    <div class="content">
        <h2>Hello ${userName},</h2>
        <p>Your password has been successfully changed.</p>
        
        <div class="success">
            <strong>✅ Password Update Confirmed</strong>
            <p>Your account password was updated on ${new Date().toLocaleString()}.</p>
        </div>
        
        <p>If you made this change, you can safely ignore this email.</p>
        <p>If you didn't make this change, please contact us immediately.</p>
        
        <p>You can now log in to your account with your new password.</p>
        
        <p>Best regards,<br>The Cruiser Aviation Team</p>
    </div>
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>&copy; 2024 Cruiser Aviation. All rights reserved.</p>
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