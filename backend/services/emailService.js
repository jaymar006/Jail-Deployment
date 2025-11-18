const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.');
  }
  
  // You can configure this based on your email provider
  // Common options: Gmail, Outlook, SendGrid, AWS SES, etc.
  
  // Example for Gmail (you'll need to use an App Password)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER, // Your email address
      pass: process.env.SMTP_PASSWORD, // Your email password or app password
    },
  });

  // Example for SendGrid:
  // return nodemailer.createTransport({
  //   host: 'smtp.sendgrid.net',
  //   port: 587,
  //   auth: {
  //     user: 'apikey',
  //     pass: process.env.SENDGRID_API_KEY,
  //   },
  // });

  // Example for Outlook:
  // return nodemailer.createTransport({
  //   host: 'smtp-mail.outlook.com',
  //   port: 587,
  //   secure: false,
  //   auth: {
  //     user: process.env.SMTP_USER,
  //     pass: process.env.SMTP_PASSWORD,
  //   },
  // });
};

// Send password reset link email
const sendPasswordResetLink = async (toEmail, username, resetToken) => {
  try {
    // Validate email
    if (!toEmail || !toEmail.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    const transporter = createTransporter();
    
    // Get the frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    console.log(`📧 Preparing to send password reset email to: ${toEmail}`);
    console.log(`🔗 Reset link: ${resetLink}`);
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER, // Sender address
      to: toEmail, // Recipient email
      subject: 'Password Reset Request - Silang Municipal Jail', // Subject line
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4b5563;">Password Reset Request</h2>
          <p>Hello ${username},</p>
          <p>We received a request to reset your password. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4b5563; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
          </p>
          <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">
            <strong>This link will expire in 1 hour.</strong>
          </p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            If you did not request this password reset, please ignore this email or contact the administrator immediately.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from Silang Municipal Jail Visitation Management System.
          </p>
        </div>
      `,
      // Plain text version
      text: `
        Password Reset Request
        
        Hello ${username},
        
        We received a request to reset your password. Please click the link below to reset your password:
        
        ${resetLink}
        
        This link will expire in 1 hour.
        
        If you did not request this password reset, please ignore this email or contact the administrator immediately.
        
        This is an automated message from Silang Municipal Jail Visitation Management System.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset confirmation email
const sendPasswordResetConfirmation = async (toEmail, username) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: 'Password Reset Confirmation - Silang Municipal Jail',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4b5563;">Password Reset Confirmation</h2>
          <p>Hello ${username},</p>
          <p>Your password has been successfully reset.</p>
          <p>If you did not request this password reset, please contact the administrator immediately.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from Silang Municipal Jail Visitation Management System.
          </p>
        </div>
      `,
      text: `
        Password Reset Confirmation
        
        Hello ${username},
        
        Your password has been successfully reset.
        
        If you did not request this password reset, please contact the administrator immediately.
        
        This is an automated message from Silang Municipal Jail Visitation Management System.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset confirmation email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetLink,
  sendPasswordResetConfirmation,
};

