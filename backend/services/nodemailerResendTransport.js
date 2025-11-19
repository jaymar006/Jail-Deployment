/**
 * Custom Nodemailer transport for Resend API
 * This allows using Nodemailer with Resend without needing a separate package
 */

const { Resend } = require('resend');

class ResendTransport {
  constructor(options) {
    if (!options || !options.apiKey) {
      throw new Error('Resend API key is required');
    }
    
    this.resend = new Resend(options.apiKey);
    this.name = 'Resend';
    this.version = '1.0.0';
  }

  /**
   * Send email using Resend API
   * @param {Object} mail - Nodemailer mail object
   * @param {Function} callback - Callback function
   */
  async send(mail, callback) {
    try {
      // Extract email data from Nodemailer mail.data object
      const mailData = mail.data;
      
      // Handle 'to' field - can be string, array, or object
      let toAddresses = [];
      if (Array.isArray(mailData.to)) {
        toAddresses = mailData.to.map(addr => typeof addr === 'string' ? addr : addr.address);
      } else if (typeof mailData.to === 'string') {
        toAddresses = [mailData.to];
      } else if (mailData.to && mailData.to.address) {
        toAddresses = [mailData.to.address];
      }
      
      // Handle 'from' field
      let fromAddress = mailData.from;
      if (typeof fromAddress === 'object' && fromAddress.address) {
        fromAddress = fromAddress.address;
      }
      
      // Prepare Resend API format
      const resendData = {
        from: fromAddress,
        to: toAddresses,
        subject: mailData.subject || '',
      };
      
      // Add HTML content if available
      if (mailData.html) {
        resendData.html = mailData.html;
      }
      
      // Add text content if available
      if (mailData.text) {
        resendData.text = mailData.text;
      }
      
      // Add reply-to if available
      if (mailData.replyTo) {
        let replyToAddress = mailData.replyTo;
        if (typeof replyToAddress === 'object' && replyToAddress.address) {
          replyToAddress = replyToAddress.address;
        }
        resendData.reply_to = replyToAddress;
      }
      
      // Send via Resend API
      const { data, error } = await this.resend.emails.send(resendData);
      
      if (error) {
        const err = new Error(error.message || 'Failed to send email via Resend');
        err.response = error;
        return callback(err);
      }
      
      // Return success in Nodemailer format
      const info = {
        messageId: data?.id || `<${Date.now()}@resend>`,
        response: `250 Message accepted for delivery (${data?.id || 'unknown'})`,
      };
      
      callback(null, info);
    } catch (error) {
      callback(error);
    }
  }

  /**
   * Verify connection (required by Nodemailer)
   */
  verify(callback) {
    // Resend doesn't need connection verification
    callback(null, true);
  }
}

module.exports = function(options) {
  return new ResendTransport(options);
};

