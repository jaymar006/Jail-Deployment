const TelegramBot = require('node-telegram-bot-api');
const db = require('../config/db');

// Initialize Telegram Bot with error handling
let bot;
let botInfo = null;

// Store chat_id mappings in memory (fallback if database update fails)
const chatIdCache = new Map(); // telegram_username -> chat_id

try {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN not found. Telegram password reset will not work.');
    console.warn('⚠️  Password reset via Telegram will be disabled until TELEGRAM_BOT_TOKEN is configured.');
    console.warn('⚠️  Get your bot token from: https://t.me/BotFather');
  } else {
    // Initialize bot WITHOUT polling first to avoid conflicts
    // We'll enable polling only if needed and handle conflicts
    bot = new TelegramBot(botToken, { polling: false });
    console.log('✅ Telegram Bot service initialized');
    
    // Verify bot info on startup
    bot.getMe().then((info) => {
      botInfo = info;
      console.log('🤖 Bot Info:');
      console.log('   Username:', '@' + info.username);
      console.log('   Name:', info.first_name);
      console.log('   ID:', info.id);
    }).catch((err) => {
      console.error('⚠️  Could not verify bot info:', err.message);
    });
    
    // Try to start polling, but handle conflicts gracefully
    // Only start polling if TELEGRAM_ENABLE_POLLING is true (optional)
    const enablePolling = process.env.TELEGRAM_ENABLE_POLLING === 'true';
    
    if (enablePolling) {
      try {
        console.log('🔄 Starting Telegram bot polling...');
        bot.startPolling({
          interval: 2000,
          autoStart: true,
          params: {
            timeout: 10
          }
        });
        
        // Listen for messages to capture chat_ids
        bot.on('message', async (msg) => {
          try {
            const chatId = msg.chat.id;
            const username = msg.from?.username;
            
            if (username) {
              const cleanUsername = username.toLowerCase().replace('@', '');
              
              // Store in memory cache
              chatIdCache.set(cleanUsername, chatId);
              
              // Try to update database - try both lowercase and original casing
              try {
                const [result] = await db.query(
                  `UPDATE users SET telegram_chat_id = ? WHERE LOWER(REPLACE(telegram_username, '@', '')) = ?`,
                  [chatId, cleanUsername]
                );
                if (result.affectedRows > 0) {
                  // Only log once per unique chat_id to avoid spam
                  if (!chatIdCache.has(cleanUsername) || chatIdCache.get(cleanUsername) !== chatId) {
                    console.log(`✅ Stored chat_id ${chatId} for @${username}`);
                  }
                } else {
                  // Only log warning once
                  if (!chatIdCache.has(cleanUsername)) {
                    console.log(`⚠️  No user found with Telegram username matching @${username} (chat_id ${chatId} cached)`);
                    console.log(`   💡 User should update their Telegram username in Settings to match: ${username}`);
                  }
                }
              } catch (dbError) {
                // Database update might fail if column doesn't exist yet - that's OK
                console.log(`💾 Cached chat_id ${chatId} for @${username} (DB update skipped: ${dbError.message})`);
              }
            } else {
              // User doesn't have a username - we can't match them
              console.log(`⚠️  Received message from user without Telegram username (chat_id: ${chatId})`);
              console.log(`   💡 User needs to set a Telegram username in their Telegram settings`);
            }
          } catch (error) {
            console.error('❌ Error processing Telegram message:', error.message);
            console.error('   Stack:', error.stack);
          }
        });
        
        // Listen for /start command
        bot.onText(/\/start/, async (msg) => {
          const chatId = msg.chat.id;
          const username = msg.from?.username;
          
          if (username) {
            const cleanUsername = username.toLowerCase().replace('@', '');
            chatIdCache.set(cleanUsername, chatId);
            
            try {
              const [result] = await db.query(
                `UPDATE users SET telegram_chat_id = ? WHERE LOWER(REPLACE(telegram_username, '@', '')) = ?`,
                [chatId, cleanUsername]
              );
              if (result.affectedRows > 0) {
                // Only log once per unique chat_id
                if (!chatIdCache.has(cleanUsername) || chatIdCache.get(cleanUsername) !== chatId) {
                  console.log(`✅ Registered chat_id ${chatId} for @${username} via /start`);
                }
              } else {
                // Only log warning once
                if (!chatIdCache.has(cleanUsername)) {
                  console.log(`⚠️  No user found with Telegram username matching @${username} (chat_id ${chatId} cached)`);
                  console.log(`   💡 User should update their Telegram username in Settings to match: ${username}`);
                }
              }
            } catch (dbError) {
              console.log(`✅ Cached chat_id ${chatId} for @${username} via /start (DB error: ${dbError.message})`);
            }
          } else {
            console.log(`⚠️  /start received from user without Telegram username (chat_id: ${chatId})`);
            console.log(`   💡 User needs to set a Telegram username in their Telegram settings`);
          }
          
          // Send welcome message
          try {
            await bot.sendMessage(chatId, 
              `👋 Hello! I'm the password reset bot for Silang Municipal Jail.\n\n` +
              `When you request a password reset, I'll send you a secure link here.\n\n` +
              `You're all set! ✅`
            );
          } catch (sendError) {
            console.error(`❌ Failed to send welcome message to chat_id ${chatId}:`, sendError.message);
          }
        });
        
        console.log('👂 Telegram bot polling enabled - listening for messages to capture chat_ids');
      } catch (pollingError) {
        if (pollingError.message && pollingError.message.includes('409')) {
          console.warn('⚠️  Polling conflict detected - another bot instance may be running');
          console.warn('⚠️  Polling disabled. Chat IDs will be captured when users send messages.');
          console.warn('💡 To enable polling, set TELEGRAM_ENABLE_POLLING=true and ensure only one instance runs');
        } else {
          console.error('❌ Failed to start polling:', pollingError.message);
        }
      }
    } else {
      console.log('ℹ️  Polling disabled (set TELEGRAM_ENABLE_POLLING=true to enable)');
      console.log('ℹ️  Chat IDs will be captured via getChat() when users request password reset');
      console.log('⚠️  WARNING: Without polling, chat_ids may not be captured reliably');
      console.log('⚠️  Users must send a message to the bot AFTER setting their Telegram username in Settings');
      console.log('💡 RECOMMENDED: Set TELEGRAM_ENABLE_POLLING=true in environment variables');
    }
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
    
    // Use cached botInfo or get it
    if (!botInfo) {
      try {
        botInfo = await bot.getMe();
      } catch (botInfoError) {
        console.warn('⚠️  Could not get bot info:', botInfoError.message);
      }
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

    // Try to get chat_id from database or cache first
    // This is the most reliable method - we store chat_ids when users send messages
    let chatId = null;
    const cleanUsernameLower = cleanTelegramUsername.toLowerCase();
    
    // Check memory cache first
    if (chatIdCache.has(cleanUsernameLower)) {
      chatId = chatIdCache.get(cleanUsernameLower);
    } else {
      // Check database
      try {
        // First check if user exists with this Telegram username
        const [userRows] = await db.query(
          `SELECT id, username, telegram_username, telegram_chat_id FROM users WHERE LOWER(REPLACE(telegram_username, '@', '')) = ?`,
          [cleanUsernameLower]
        );
        
        if (userRows.length === 0) {
          console.log(`⚠️  No user found with Telegram username: @${cleanTelegramUsername}`);
        } else {
          const user = userRows[0];
          
          if (user.telegram_chat_id) {
            chatId = user.telegram_chat_id;
            // Cache it
            chatIdCache.set(cleanUsernameLower, chatId);
            console.log(`💾 Found chat_id ${chatId} for @${cleanTelegramUsername} in database`);
          } else {
            console.log(`⚠️  User ${user.username} found but no chat_id. User needs to send a message to @${botInfo?.username || 'your bot'}`);
          }
        }
      } catch (dbError) {
        // Column might not exist yet - that's OK, we'll add it via migration
        console.log(`ℹ️  Could not check database for chat_id: ${dbError.message}`);
        console.log(`   💡 This might be normal if the database schema hasn't been updated yet`);
      }
    }
    
    // If we don't have chat_id, try getChat (less reliable)
    if (!chatId) {
      try {
        const chatInfo = await bot.getChat(`@${cleanTelegramUsername}`);
        chatId = chatInfo.id;
        // Cache it
        chatIdCache.set(cleanUsernameLower, chatId);
        // Try to save to database
        try {
          await db.query(
            `UPDATE users SET telegram_chat_id = ? WHERE LOWER(REPLACE(telegram_username, '@', '')) = ?`,
            [chatId, cleanUsernameLower]
          );
        } catch (dbError) {
          // Column might not exist - that's OK
        }
      } catch (chatError) {
        // User needs to send a message to the bot first - error will be shown later
      }
    }
    
    // Try sending message using chat_id first (most reliable)
    if (chatId) {
      try {
        const sentMessage = await bot.sendMessage(chatId, message, {
          parse_mode: 'HTML',
          disable_web_page_preview: false
        });
        
        console.log(`✅ Password reset message sent to @${cleanTelegramUsername} via Telegram`);
        return { success: true, messageId: sentMessage.message_id };
      } catch (chatIdError) {
        console.warn(`⚠️  Failed to send using chat_id ${chatId}:`, chatIdError.message);
        console.warn(`   Falling back to username format...`);
        // Fall through to try username format
      }
    }
    
    // Fallback: Try sending by username (less reliable but sometimes works)
    try {
      const sentMessage = await bot.sendMessage(`@${cleanTelegramUsername}`, message, {
        parse_mode: 'HTML',
        disable_web_page_preview: false
      });
      
      console.log(`✅ Password reset message sent to @${cleanTelegramUsername} via Telegram`);
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
          const sentMessage = await bot.sendMessage(cleanTelegramUsername, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: false
          });
          
          console.log(`✅ Password reset message sent to @${cleanTelegramUsername} via Telegram`);
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

