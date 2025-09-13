const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service configuration error:', error);
      } else {
        console.log('Email service is ready to send messages');
      }
    });
  }

  async sendEmail({ to, subject, html, text }) {
    try {
      const mailOptions = {
        from: `"Relatim AI Chat" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendWelcomeEmail(userEmail, userName) {
    const subject = 'Welcome to Relatim AI Chat!';
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #25D366, #075E54); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Relatim AI Chat!</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #075E54;">Hello ${userName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Welcome to our amazing Relatim-style AI messaging platform! We're excited to have you on board.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #25D366; margin-top: 0;">Get Started:</h3>
            <ul style="color: #333; line-height: 1.6;">
              <li>Add contacts and start messaging</li>
              <li>Try our AI chat assistant</li>
              <li>Make voice and video calls</li>
              <li>Share files, images, and documents</li>
              <li>Enable push notifications for real-time updates</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Start Chatting Now
            </a>
          </div>
          <p style="color: #666; font-size: 14px; text-align: center;">
            If you have any questions, feel free to contact our support team.
          </p>
        </div>
        <div style="background: #075E54; padding: 15px; text-align: center; color: white; font-size: 12px;">
          © 2025 Relatim AI Chat. All rights reserved.
        </div>
      </div>
    `;
    
    const text = `
      Welcome to Relatim AI Chat!
      
      Hello ${userName}!
      
      Welcome to our amazing Relatim-style AI messaging platform! We're excited to have you on board.
      
      Get Started:
      - Add contacts and start messaging
      - Try our AI chat assistant
      - Make voice and video calls
      - Share files, images, and documents
      - Enable push notifications for real-time updates
      
      Visit: ${process.env.FRONTEND_URL}
      
      © 2025 Relatim AI Chat. All rights reserved.
    `;

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  async sendPasswordResetEmail(userEmail, resetToken, userName) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request - Relatim AI Chat';
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #25D366, #075E54); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset Request</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #075E54;">Hello ${userName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            We received a request to reset your password for your Relatim AI Chat account.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="color: #333; margin: 0 0 15px 0;">
              Click the button below to reset your password. This link will expire in 1 hour for security reasons.
            </p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${resetUrl}" 
                 style="background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #25D366; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
            </p>
          </div>
        </div>
        <div style="background: #075E54; padding: 15px; text-align: center; color: white; font-size: 12px;">
          © 2025 Relatim AI Chat. All rights reserved.
        </div>
      </div>
    `;
    
    const text = `
      Password Reset Request - Relatim AI Chat
      
      Hello ${userName}!
      
      We received a request to reset your password for your Relatim AI Chat account.
      
      Click this link to reset your password (expires in 1 hour):
      ${resetUrl}
      
      If you didn't request this password reset, please ignore this email.
      
      © 2025 Relatim AI Chat. All rights reserved.
    `;

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  async sendEmailVerification(userEmail, verificationToken, userName) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your Email - Relatim AI Chat';
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #25D366, #075E54); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Verify Your Email</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #075E54;">Hello ${userName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Thank you for registering with Relatim AI Chat! Please verify your email address to complete your account setup.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="color: #333; margin: 0 0 15px 0;">
              Click the button below to verify your email address:
            </p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${verificationUrl}" 
                 style="background: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Verify Email
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #25D366; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>
        </div>
        <div style="background: #075E54; padding: 15px; text-align: center; color: white; font-size: 12px;">
          © 2025 Relatim AI Chat. All rights reserved.
        </div>
      </div>
    `;
    
    const text = `
      Verify Your Email - Relatim AI Chat
      
      Hello ${userName}!
      
      Thank you for registering with Relatim AI Chat! Please verify your email address to complete your account setup.
      
      Click this link to verify your email:
      ${verificationUrl}
      
      © 2025 Relatim AI Chat. All rights reserved.
    `;

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  async sendLoginNotification(userEmail, userName, loginInfo) {
    const subject = 'New Login Detected - Relatim AI Chat';
    const { timestamp, ip, userAgent } = loginInfo;
    
    const html = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #25D366, #075E54); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Login Detected</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #075E54;">Hello ${userName}!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            We detected a new login to your Relatim AI Chat account.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #25D366; margin-top: 0;">Login Details:</h3>
            <p style="color: #333; margin: 5px 0;"><strong>Time:</strong> ${timestamp}</p>
            <p style="color: #333; margin: 5px 0;"><strong>IP Address:</strong> ${ip}</p>
            <p style="color: #333; margin: 5px 0;"><strong>Device:</strong> ${userAgent}</p>
          </div>
          <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #155724; margin: 0; font-size: 14px;">
              <strong>Secure:</strong> If this was you, no action is needed.
            </p>
          </div>
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #721c24; margin: 0; font-size: 14px;">
              <strong>Suspicious Activity:</strong> If this wasn't you, please change your password immediately and contact support.
            </p>
          </div>
        </div>
        <div style="background: #075E54; padding: 15px; text-align: center; color: white; font-size: 12px;">
          © 2025 Relatim AI Chat. All rights reserved.
        </div>
      </div>
    `;
    
    const text = `
      New Login Detected - Relatim AI Chat
      
      Hello ${userName}!
      
      We detected a new login to your Relatim AI Chat account.
      
      Login Details:
      Time: ${timestamp}
      IP Address: ${ip}
      Device: ${userAgent}
      
      If this was you, no action is needed.
      If this wasn't you, please change your password immediately.
      
      © 2025 Relatim AI Chat. All rights reserved.
    `;

    return this.sendEmail({ to: userEmail, subject, html, text });
  }
}

module.exports = new EmailService();