const TelegramBot = require('node-telegram-bot-api');

// Initialize Telegram Bot with error handling
let bot;
try {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not found. Telegram password reset will not work.');
    console.warn('⚠️  Password reset via Telegram will be disabled until TELEGRAM_BOT_TOKEN is configured.');
    console.warn('⚠️  Get your bot token from: https://t.me/BotFather');
  } else {
    // Use polling mode (simpler, works on Render without webhook setup)
    bot = new TelegramBot(botToken, { polling: false });
    console.log('✅ Telegram Bot service initialized');
  }
} catch (error) {
  console.error('❌ Failed to initialize Telegram Bot:', error.message);
  console.error('❌ Error details:', error);
  console.warn('⚠️  Telegram sending will be disabled. Make sure "node-telegram-bot-api" package is installed.');
  console.warn('⚠️  Run: npm install node-telegram-bot-api');
  bot = null;
}

// Send password reset link via Telegram
const sendPasswordResetLink = async (telegramUsername, username, resetToken) => {
  try {
    // Validate telegram username
    if (!telegramUsername || !telegramUsername.trim()) {
      throw new Error('Invalid Telegram username');
    }
    
    // Remove @ if present
    const cleanTelegramUsername = telegramUsername.replace('@', '').trim();
    
    // Check if Telegram Bot is configured
    if (!bot || !process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('Telegram Bot not configured. Please set TELEGRAM_BOT_TOKEN environment variable.');
    }
    
    // Get the frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    console.log(`📱 Preparing to send password reset message to Telegram user: @${cleanTelegramUsername}`);
    console.log(`🔗 Reset link: ${resetLink}`);
    
    // Get chat ID from username (we need to find the user's chat ID)
    // First, try to send a message to the username
    // Note: Telegram bots can only send messages to users who have started the bot
    const message = `🔐 Password Reset Request - Silang Municipal Jail

Hello ${username},

We received a request to reset your password. Click the link below to reset your password:

${resetLink}

⚠️ This link will expire in 1 hour.

If you did not request this password reset, please ignore this message or contact the administrator immediately.

This is an automated message from Silang Municipal Jail Visitation Management System.`;

    // Try to send message to username
    // Note: Telegram API requires chat_id, which can be username with @ prefix or numeric ID
    try {
      const sentMessage = await bot.sendMessage(`@${cleanTelegramUsername}`, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: false
      });
      
      console.log('✅ Password reset message sent successfully via Telegram:', sentMessage.message_id);
      return { success: true, messageId: sentMessage.message_id };
    } catch (telegramError) {
      // If username doesn't work, try without @
      if (telegramError.response?.body?.error_code === 400) {
        try {
          const sentMessage = await bot.sendMessage(cleanTelegramUsername, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: false
          });
          
          console.log('✅ Password reset message sent successfully via Telegram:', sentMessage.message_id);
          return { success: true, messageId: sentMessage.message_id };
        } catch (retryError) {
          throw new Error(`Failed to send Telegram message. Make sure the user @${cleanTelegramUsername} has started your bot. Error: ${retryError.message}`);
        }
      }
      throw telegramError;
    }
  } catch (error) {
    console.error('❌ Error sending password reset message via Telegram:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('not configured') || error.message.includes('TELEGRAM_BOT_TOKEN')) {
      console.error('   💡 Please set TELEGRAM_BOT_TOKEN environment variable.');
      console.error('   💡 Get your bot token from: https://t.me/BotFather');
    } else if (error.message.includes('chat not found') || error.message.includes('user not found')) {
      console.error(`   💡 User @${telegramUsername} must start your bot first.`);
      console.error('   💡 Tell users to search for your bot on Telegram and click "Start"');
    } else if (error.message.includes('bot was blocked')) {
      console.error(`   💡 User @${telegramUsername} has blocked your bot.`);
    }
    
    return { success: false, error: error.message };
  }
};

// Send password reset confirmation via Telegram
const sendPasswordResetConfirmation = async (telegramUsername, username) => {
  try {
    // Check if Telegram Bot is configured
    if (!bot || !process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('Telegram Bot not configured. Please set TELEGRAM_BOT_TOKEN environment variable.');
    }
    
    // Remove @ if present
    const cleanTelegramUsername = telegramUsername.replace('@', '').trim();
    
    const message = `✅ Password Reset Confirmation - Silang Municipal Jail

Hello ${username},

Your password has been successfully reset.

If you did not request this password reset, please contact the administrator immediately.

This is an automated message from Silang Municipal Jail Visitation Management System.`;

    try {
      const sentMessage = await bot.sendMessage(`@${cleanTelegramUsername}`, message, {
        parse_mode: 'HTML'
      });
      
      console.log('✅ Password reset confirmation sent via Telegram:', sentMessage.message_id);
      return { success: true, messageId: sentMessage.message_id };
    } catch (telegramError) {
      // Try without @ prefix
      if (telegramError.response?.body?.error_code === 400) {
        const sentMessage = await bot.sendMessage(cleanTelegramUsername, message, {
          parse_mode: 'HTML'
        });
        
        console.log('✅ Password reset confirmation sent via Telegram:', sentMessage.message_id);
        return { success: true, messageId: sentMessage.message_id };
      }
      throw telegramError;
    }
  } catch (error) {
    console.error('❌ Error sending password reset confirmation via Telegram:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetLink,
  sendPasswordResetConfirmation,
};

