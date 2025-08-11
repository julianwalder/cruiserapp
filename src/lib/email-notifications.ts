import { getSupabaseClient } from '@/lib/supabase';

export interface EmailNotificationData {
  postId: string;
  postTitle: string;
  postType: 'ask' | 'offer';
  responderId: string;
  responderName: string;
  responderEmail: string;
  message?: string;
  postAuthorId: string;
  postAuthorName: string;
  postAuthorEmail: string;
}

export class EmailNotificationService {
  private supabase = getSupabaseClient();

  async sendResponseNotification(data: EmailNotificationData) {
    try {
      // Send email to post author about new response
      await this.sendResponseNotificationToAuthor(data);
      
      // Send confirmation email to responder
      await this.sendResponseConfirmationToResponder(data);
      
      console.log('Email notifications sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send email notifications:', error);
      return false;
    }
  }

  private async sendResponseNotificationToAuthor(data: EmailNotificationData) {
    const subject = `New response to your ${data.postType} post`;
    const htmlContent = this.generateResponseNotificationEmail(data);
    
    // In production, you'd use a proper email service like SendGrid, AWS SES, etc.
    // For now, we'll log the email content
    console.log('=== EMAIL TO POST AUTHOR ===');
    console.log('To:', data.postAuthorEmail);
    console.log('Subject:', subject);
    console.log('Content:', htmlContent);
    console.log('============================');
    
    // TODO: Integrate with your email service
    // await this.sendEmail({
    //   to: data.postAuthorEmail,
    //   subject,
    //   html: htmlContent
    // });
  }

  private async sendResponseConfirmationToResponder(data: EmailNotificationData) {
    const subject = `Response submitted to ${data.postTitle}`;
    const htmlContent = this.generateResponseConfirmationEmail(data);
    
    console.log('=== EMAIL TO RESPONDER ===');
    console.log('To:', data.responderEmail);
    console.log('Subject:', subject);
    console.log('Content:', htmlContent);
    console.log('==========================');
    
    // TODO: Integrate with your email service
    // await this.sendEmail({
    //   to: data.responderEmail,
    //   subject,
    //   html: htmlContent
    // });
  }

  private generateResponseNotificationEmail(data: EmailNotificationData): string {
    const postTypeLabel = data.postType === 'ask' ? 'Ask' : 'Offer';
    const actionLabel = data.postType === 'ask' ? 'can help' : 'is interested';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Response to Your ${postTypeLabel}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #007bff;">✈️ Aviation Community</h1>
          </div>
          
          <div class="content">
            <h2>New Response to Your ${postTypeLabel}</h2>
            
            <p>Hi ${data.postAuthorName},</p>
            
            <p><strong>${data.responderName}</strong> ${actionLabel} with your post:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">"${data.postTitle}"</h3>
              <p style="margin: 0; color: #6c757d;">${postTypeLabel} • ${new Date().toLocaleDateString()}</p>
            </div>
            
            ${data.message ? `
              <p><strong>Message from ${data.responderName}:</strong></p>
              <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196f3;">
                <p style="margin: 0; font-style: italic;">"${data.message}"</p>
              </div>
            ` : ''}
            
            <p>You can now review their response and decide whether to accept or decline their offer to help.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/community-board" class="button">View Response</a>
          </div>
          
          <div class="footer">
            <p>This email was sent from your aviation community board. You can manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateResponseConfirmationEmail(data: EmailNotificationData): string {
    const postTypeLabel = data.postType === 'ask' ? 'Ask' : 'Offer';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Response Submitted Successfully</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef; }
          .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #28a745;">✈️ Aviation Community</h1>
          </div>
          
          <div class="content">
            <h2>Response Submitted Successfully!</h2>
            
            <p>Hi ${data.responderName},</p>
            
            <p>Your response has been submitted to the following ${postTypeLabel}:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">"${data.postTitle}"</h3>
              <p style="margin: 0; color: #6c757d;">Posted by ${data.postAuthorName} • ${new Date().toLocaleDateString()}</p>
            </div>
            
            ${data.message ? `
              <p><strong>Your message:</strong></p>
              <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745;">
                <p style="margin: 0; font-style: italic;">"${data.message}"</p>
              </div>
            ` : ''}
            
            <p>The post author will be notified of your response and can choose to accept or decline your offer to help.</p>
            
            <p>You'll receive an update once they make a decision.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/community-board" class="button">View Community Board</a>
          </div>
          
          <div class="footer">
            <p>Thank you for being part of our aviation community!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Helper method to get user details for notifications
  async getUserDetails(userId: string) {
    try {
      const { data: user, error } = await this.supabase
        .from('users')
        .select('id, "firstName", "lastName", email')
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        fullName: `${user.firstName} ${user.lastName}`
      };
    } catch (error) {
      console.error('Failed to get user details:', error);
      throw error;
    }
  }

  // Method to send email (placeholder for email service integration)
  private async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    // TODO: Integrate with your preferred email service
    // Examples:
    // - SendGrid: https://sendgrid.com/
    // - AWS SES: https://aws.amazon.com/ses/
    // - Resend: https://resend.com/
    // - Nodemailer: https://nodemailer.com/
    
    console.log(`Email would be sent to ${to}: ${subject}`);
    
    // For now, just log the email details
    // In production, implement your email service here
  }
}

export const emailNotificationService = new EmailNotificationService();
