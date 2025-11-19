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
    
    // Verify bot info on startup
    bot.getMe().then((botInfo) => {
      console.log('🤖 Bot Info:');
      console.log('   Username:', '@' + botInfo.username);
      console.log('   Name:', botInfo.first_name);
      console.log('   ID:', botInfo.id);
    }).catch((err) => {
      console.error('⚠️  Could not verify bot info:', err.message);
    });
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
    
    // Get bot info for better error messages (declare outside try block for scope)
    let botInfo;
    try {
      botInfo = await bot.getMe();
      console.log(`🤖 Sending from bot: @${botInfo.username} (${botInfo.first_name})`);
    } catch (botInfoError) {
      console.warn('⚠️  Could not get bot info:', botInfoError.message);
    }
    
    // IMPORTANT: Telegram bots can only send messages to users who have:
    // 1. Started the bot (clicked Start)
    // 2. Sent at least one message to the bot
    //
    // We need to get the chat_id (numeric ID) instead of using @username format
    // because @username format doesn't work reliably for private chats
    
    const message = `🔐 Password Reset Request - Silang Municipal Jail

Hello ${username},

We received a request to reset your password. Click the link below to reset your password:

${resetLink}

⚠️ This link will expire in 1 hour.

If you did not request this password reset, please ignore this message or contact the administrator immediately.

This is an automated message from Silang Municipal Jail Visitation Management System.`;

    // Try to get chat_id first - this is more reliable than using @username
    // NOTE: getChat with @username might not work for private chats even if user has started bot
    // It typically only works for groups/channels or if bot has received a message from user
    let chatId = null;
    try {
      console.log(`🔍 Attempting to get chat info for @${cleanTelegramUsername}...`);
      const chatInfo = await bot.getChat(`@${cleanTelegramUsername}`);
      chatId = chatInfo.id;
      console.log(`✅ Got chat ID for @${cleanTelegramUsername}: ${chatId} (Type: ${chatInfo.type})`);
    } catch (chatError) {
      const chatErrorCode = chatError.response?.body?.error_code;
      const chatErrorDesc = chatError.response?.body?.description || chatError.message;
      
      console.warn(`⚠️  Could not get chat ID for @${cleanTelegramUsername}`);
      console.warn(`   Error: ${chatErrorDesc} (Code: ${chatErrorCode})`);
      console.warn(`   Note: getChat() with @username may not work for private chats`);
      console.warn(`   This is OK - we'll try sending by username format instead`);
      
      // Don't treat this as fatal - continue to try sending by username
    }
    
    // Try sending message using chat_id first (most reliable)
    if (chatId) {
      try {
        console.log(`📤 Sending message using chat_id: ${chatId}`);
        const sentMessage = await bot.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          disable_web_page_preview: false
        });
        
        console.log('✅ Password reset message sent successfully via Telegram (using chat_id):', sentMessage.message_id);
        return { success: true, messageId: sentMessage.message_id };
      } catch (chatIdError) {
        console.warn(`⚠️  Failed to send using chat_id ${chatId}:`, chatIdError.message);
        console.warn(`   Falling back to username format...`);
        // Fall through to try username format
      }
    }
    
    // Fallback: Try sending by username (less reliable but sometimes works)
    try {
      console.log(`📤 Attempting to send message using @username format: @${cleanTelegramUsername}`);
      const sentMessage = await bot.sendMessage(`@${cleanTelegramUsername}`, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: false
      });
      
      console.log('✅ Password reset message sent successfully via Telegram (using @username):', sentMessage.message_id);
      return { success: true, messageId: sentMessage.message_id };
    } catch (telegramError) {
      // Log full error details for debugging
      console.error('❌ Telegram API Error Details:');
      console.error('   Error Code:', telegramError.response?.body?.error_code);
      console.error('   Error Description:', telegramError.response?.body?.description);
      console.error('   Full Error:', JSON.stringify(telegramError.response?.body, null, 2));
      
      // Common Telegram API errors:
      // 400: Bad Request (user not found, chat not found, etc.)
      // 403: Forbidden (bot blocked by user)
      // 429: Too Many Requests (rate limit)
      
      const errorCode = telegramError.response?.body?.error_code;
      const errorDescription = telegramError.response?.body?.description || telegramError.message;
      
      // Try without @ prefix as last resort
      if (errorCode === 400) {
        try {
          console.log(`📤 Attempting to send message without @ prefix: ${cleanTelegramUsername}`);
          const sentMessage = await bot.sendMessage(cleanTelegramUsername, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: false
          });
          
          console.log('✅ Password reset message sent successfully via Telegram (without @):', sentMessage.message_id);
          return { success: true, messageId: sentMessage.message_id };
        } catch (retryError) {
          const retryErrorCode = retryError.response?.body?.error_code;
          const retryErrorDesc = retryError.response?.body?.description || retryError.message;
          
          // All methods failed - provide detailed error message
          const botUsername = botInfo?.username || 'your bot';
          console.error(`❌ All send methods failed for @${cleanTelegramUsername}`);
          console.error(`   Last error: ${retryErrorDesc} (Code: ${retryErrorCode})`);
          
          if (retryErrorCode === 400 && retryErrorDesc?.includes('chat not found')) {
            throw new Error(`User @${cleanTelegramUsername} must interact with bot @${botUsername} first. They need to:\n1. Open Telegram\n2. Search for @${botUsername}\n3. Click "Start" button\n4. Send any message to the bot (e.g., "hello" or "/start")\n5. Then try password reset again\n\nNote: Just clicking "Start" is not enough - the user must send at least one message to the bot.`);
          } else if (retryErrorCode === 400 && retryErrorDesc?.includes('user not found')) {
            throw new Error(`Telegram username @${cleanTelegramUsername} not found. Please verify the username is correct and exists on Telegram.`);
          } else if (retryErrorCode === 403) {
            throw new Error(`User @${cleanTelegramUsername} has blocked your bot or bot cannot send messages`);
          } else {
            throw new Error(`Failed to send Telegram message to @${cleanTelegramUsername}. Error: ${retryErrorDesc} (Code: ${retryErrorCode})\n\nPossible causes:\n1. User hasn't started the bot\n2. User hasn't sent a message to the bot\n3. Username is incorrect\n4. Bot token doesn't match bot username`);
          }
        }
      }
      
      // Handle other specific error codes
      const botUsername = botInfo?.username || 'your bot';
      if (errorCode === 403) {
        throw new Error(`User @${cleanTelegramUsername} has blocked your bot or bot cannot send messages`);
      } else if (errorCode === 400 && errorDescription?.includes('chat not found')) {
        throw new Error(`User @${cleanTelegramUsername} must interact with bot @${botUsername} first. They need to:\n1. Open Telegram\n2. Search for @${botUsername}\n3. Click "Start" button\n4. Send any message to the bot (e.g., "hello" or "/start")\n5. Then try password reset again\n\nNote: Just clicking "Start" is not enough - the user must send at least one message to the bot.`);
      } else if (errorCode === 400 && errorDescription?.includes('user not found')) {
        throw new Error(`Telegram username @${cleanTelegramUsername} not found. Please verify the username is correct and exists on Telegram.`);
      }
      
      throw telegramError;
    }
  } catch (error) {
    console.error('❌ Error sending password reset message via Telegram:', error.message);
    console.error('   Full error stack:', error.stack);
    
    // Provide helpful error messages
    if (error.message.includes('not configured') || error.message.includes('TELEGRAM_BOT_TOKEN')) {
      console.error('   💡 Please set TELEGRAM_BOT_TOKEN environment variable.');
      console.error('   💡 Get your bot token from: https://t.me/BotFather');
    } else if (error.message.includes('must start your bot')) {
      console.error(`   💡 SOLUTION: User @${telegramUsername} needs to start your bot first.`);
      console.error('   💡 Instructions for user:');
      console.error('      1. Open Telegram');
      console.error('      2. Search for your bot username');
      console.error('      3. Click "Start" button');
      console.error('      4. Try password reset again');
    } else if (error.message.includes('blocked') || error.message.includes('cannot send messages')) {
      console.error(`   💡 User @${telegramUsername} has blocked your bot or bot permissions are restricted.`);
      console.error('   💡 User needs to unblock the bot or check bot settings.');
    } else if (error.message.includes('not found')) {
      console.error(`   💡 Telegram username @${telegramUsername} not found.`);
      console.error('   💡 Verify the username is correct and exists on Telegram.');
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

