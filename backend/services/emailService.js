const { Resend } = require('resend');

// Initialize Resend client with error handling
let resend;
try {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  RESEND_API_KEY not found. Email sending will not work.');
    console.warn('⚠️  Password reset emails will be disabled until RESEND_API_KEY is configured.');
  } else {
    resend = new Resend(apiKey);
    console.log('✅ Resend email service initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize Resend:', error.message);
  console.error('❌ Error details:', error);
  console.warn('⚠️  Email sending will be disabled. Make sure "resend" package is installed.');
  console.warn('⚠️  Run: npm install resend');
  resend = null;
}

// Send password reset link email
const sendPasswordResetLink = async (toEmail, username, resetToken) => {
  try {
    // Validate email
    if (!toEmail || !toEmail.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    // Check if Resend is configured
    if (!resend || !process.env.RESEND_API_KEY) {
      throw new Error('Resend not configured. Please set RESEND_API_KEY environment variable.');
    }
    
    // Get the frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    // Get sender email - uses Resend's test domain by default (no domain verification needed)
    // Note: onboarding@resend.dev can only send to your Resend account email address
    // For production, set RESEND_FROM_EMAIL to use a verified domain
    let fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || 'onboarding@resend.dev';
    
    // Validate email format - must contain @ symbol
    if (!fromEmail.includes('@')) {
      console.warn(`⚠️  Invalid RESEND_FROM_EMAIL format: "${fromEmail}" - missing @ symbol`);
      console.warn(`⚠️  Falling back to test domain: onboarding@resend.dev`);
      fromEmail = 'onboarding@resend.dev';
    }
    
    // Additional validation: ensure it's a proper email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail) && !fromEmail.includes('<')) {
      // Allow format like "Name <email@example.com>" but if it's just a domain, fix it
      if (fromEmail.includes('.') && !fromEmail.includes('@')) {
        console.warn(`⚠️  Invalid RESEND_FROM_EMAIL format: "${fromEmail}" - appears to be missing @ symbol`);
        console.warn(`⚠️  Falling back to test domain: onboarding@resend.dev`);
        fromEmail = 'onboarding@resend.dev';
      }
    }
    
    console.log(`📧 Preparing to send password reset email to: ${toEmail}`);
    console.log(`🔗 Reset link: ${resetLink}`);
    console.log(`📤 From email: ${fromEmail}`);
    
    // Warn if using test domain and sending to different email
    if (fromEmail === 'onboarding@resend.dev') {
      const resendAccountEmail = process.env.RESEND_ACCOUNT_EMAIL;
      if (resendAccountEmail && toEmail.toLowerCase() !== resendAccountEmail.toLowerCase()) {
        console.warn(`⚠️  Using test domain - emails can only be sent to your Resend account email (${resendAccountEmail})`);
        console.warn(`⚠️  This email will be sent to: ${toEmail} but may fail if it doesn't match your account email`);
      }
    }
    
    // Send email using Resend API
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Password Reset Request - Silang Municipal Jail',
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
      text: `
        Password Reset Request
        
        Hello ${username},
        
        We received a request to reset your password. Please click the link below to reset your password:
        
        ${resetLink}
        
        This link will expire in 1 hour.
        
        If you did not request this password reset, please ignore this email or contact the administrator immediately.
        
        This is an automated message from Silang Municipal Jail Visitation Management System.
      `,
    });
    
    if (error) {
      console.error('❌ Resend API error:', error);
      
      // Check for the specific "testing emails" error
      if (error.message && error.message.includes('You can only send testing emails')) {
        const accountEmailMatch = error.message.match(/\(([^)]+)\)/);
        const accountEmail = accountEmailMatch ? accountEmailMatch[1] : 'your Resend account email';
        
        console.error('');
        console.error('⚠️  RESEND TEST DOMAIN LIMITATION DETECTED');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error(`📧 You're using Resend's test domain (onboarding@resend.dev)`);
        console.error(`📧 This can ONLY send emails to: ${accountEmail}`);
        console.error(`📧 You tried to send to: ${toEmail}`);
        console.error('');
        console.error('🔧 SOLUTIONS:');
        console.error('');
        console.error('Option 1: Verify a Domain (Recommended for Production)');
        console.error('   1. Get a free domain from: https://www.freenom.com');
        console.error('   2. In Resend Dashboard → Domains → Add Domain');
        console.error('   3. Add the DNS records Resend provides');
        console.error('   4. Wait for verification (usually 5-30 minutes)');
        console.error('   5. Set RESEND_FROM_EMAIL=noreply@yourdomain.tk in Render');
        console.error('');
        console.error('Option 2: Use Account Email for Testing');
        console.error(`   - For testing, use ${accountEmail} as the recipient email`);
        console.error(`   - Or temporarily change user emails to ${accountEmail} for testing`);
        console.error('');
        console.error('📚 See docs/RESEND_NO_DOMAIN.md for more details');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('');
      }
      
      throw new Error(error.message || 'Failed to send email via Resend');
    }
    
    console.log('✅ Password reset email sent successfully via Resend:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('not configured') || error.message.includes('RESEND_API_KEY')) {
      console.error('   💡 Please set RESEND_API_KEY environment variable.');
      console.error('   💡 Get your API key from: https://resend.com/api-keys');
    } else if (error.message.includes('domain') || error.message.includes('from') || error.message.includes('testing emails')) {
      // This is already handled above with detailed message
    }
    
    return { success: false, error: error.message };
  }
};

// Send password reset confirmation email
const sendPasswordResetConfirmation = async (toEmail, username) => {
  try {
    // Check if Resend is configured
    if (!resend || !process.env.RESEND_API_KEY) {
      throw new Error('Resend not configured. Please set RESEND_API_KEY environment variable.');
    }
    
    // Get sender email - uses Resend's test domain by default (no domain verification needed)
    // Note: onboarding@resend.dev can only send to your Resend account email address
    let fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || 'onboarding@resend.dev';
    
    // Validate email format - must contain @ symbol
    if (!fromEmail.includes('@')) {
      console.warn(`⚠️  Invalid RESEND_FROM_EMAIL format: "${fromEmail}" - missing @ symbol`);
      console.warn(`⚠️  Falling back to test domain: onboarding@resend.dev`);
      fromEmail = 'onboarding@resend.dev';
    }
    
    // Send email using Resend API
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: 'Password Reset Confirmation - Silang Municipal Jail',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
    });
    
    if (error) {
      console.error('❌ Resend API error:', error);
      throw new Error(error.message || 'Failed to send email via Resend');
    }
    
    console.log('✅ Password reset confirmation email sent via Resend:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('❌ Error sending password reset confirmation email:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetLink,
  sendPasswordResetConfirmation,
};
