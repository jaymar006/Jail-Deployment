# Telegram Bot Setup for Password Reset

This guide explains how to set up Telegram Bot API for password reset functionality.

## Overview

The password reset system now uses Telegram instead of email. Users receive password reset links via Telegram messages.

## Prerequisites

- A Telegram account
- Access to create a Telegram bot via @BotFather

## Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Start a conversation with BotFather
3. Send the command: `/newbot`
4. Follow the prompts:
   - Choose a name for your bot (e.g., "Silang Jail Password Reset Bot")
   - Choose a username (must end with "bot", e.g., "silang_jail_reset_bot")
5. BotFather will give you a **Bot Token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
6. **Save this token** - you'll need it for the next step

## Step 2: Configure Environment Variable

### On Render:

1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add a new environment variable:
   - **Key**: `TELEGRAM_BOT_TOKEN`
   - **Value**: Your bot token from Step 1 (e.g., `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Click **Save Changes**
6. Your service will automatically redeploy

### Local Development:

Add to your `.env` file:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## Step 3: Install Dependencies

The `node-telegram-bot-api` package is already added to `package.json`. Run:

```bash
cd backend
npm install
```

## Step 4: User Setup

### For Existing Users:

Users need to add their Telegram username to their account. You can:

1. **Manual Update**: Update the `telegram_username` column in the database for each user
2. **User Profile**: Add a feature in your app for users to set their Telegram username

### For New Users:

Update your signup form to optionally collect Telegram username, or add it to user profiles.

**Important**: Users must:
1. Have a Telegram account
2. Have a Telegram username set (Settings → Username in Telegram)
3. **Start your bot** by searching for it on Telegram and clicking "Start"

## Step 5: How It Works

1. User clicks "Forgot Password" on the login page
2. User enters their username or Telegram username
3. System finds the user and creates a reset token
4. System sends a Telegram message to the user's Telegram username with the reset link
5. User clicks the link in Telegram → redirects to your app
6. User resets their password

## Troubleshooting

### Bot Not Sending Messages

**Error**: "chat not found" or "user not found"

**Solution**: The user must start your bot first:
1. User searches for your bot on Telegram (using the username you set)
2. User clicks "Start" button
3. Now the bot can send messages to that user

### Bot Token Not Working

**Error**: "Unauthorized" or "Invalid token"

**Solution**: 
- Double-check your `TELEGRAM_BOT_TOKEN` environment variable
- Make sure there are no extra spaces or quotes
- Regenerate token from @BotFather if needed

### User Doesn't Receive Message

**Possible Causes**:
1. User hasn't started the bot
2. User has blocked the bot
3. Telegram username is incorrect in database
4. Bot token is invalid

**Check Logs**: Look for error messages in your Render logs or console

## Testing

1. Create a test user with a Telegram username
2. Make sure you've started your bot on Telegram
3. Go to login page → "Forgot Password"
4. Enter your username or Telegram username
5. Check your Telegram for the reset link

## Security Notes

- Bot tokens are sensitive - keep them secret
- Never commit bot tokens to Git
- Use environment variables for all tokens
- Reset tokens expire after 1 hour
- Users must have started the bot to receive messages

## Database Changes

The following changes were made:

1. **Added**: `telegram_username` column to `users` table
2. **Removed**: `security_question_1`, `security_answer_1`, `security_question_2`, `security_answer_2` columns

The database migration runs automatically when the server starts.

## API Changes

- **Endpoint**: `/auth/request-password-reset`
- **Request Body**: `{ "usernameOrTelegram": "username_or_telegram_username" }`
- **Response**: Success message (doesn't reveal if user exists)

## Files Modified

- `backend/services/telegramService.js` - New Telegram service
- `backend/controllers/authController.js` - Updated to use Telegram
- `backend/models/userModel.js` - Added Telegram username lookup
- `backend/models/passwordResetModel.js` - Updated to use Telegram username
- `backend/config/db.postgres.js` - Updated schema
- `backend/config/db.js` - Updated SQLite schema
- `frontend/src/pages/Login.js` - Updated UI for Telegram

## Next Steps

1. Set up your Telegram bot
2. Add `TELEGRAM_BOT_TOKEN` to Render environment variables
3. Update existing users with their Telegram usernames
4. Test the password reset flow

