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

## Step 2: Configure Environment Variables

### On Render:

1. Go to your Render dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add these environment variables:

   **Backend Variable:**
   - **Key**: `TELEGRAM_BOT_TOKEN`
   - **Value**: Your bot token from Step 1 (e.g., `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

   **Frontend Variable (for displaying bot username):**
   - **Key**: `REACT_APP_TELEGRAM_BOT_USERNAME`
   - **Value**: `BJMPnoreplybot` (your bot username without @)
   - ⚠️ **Important**: This must be set as a build-time variable. The Dockerfile is already configured to accept this as a build argument.
   
   **For Render Build Command:**
   If you're using a custom build command on Render, make sure to pass the build argument:
   ```
   docker build --build-arg REACT_APP_API_URL=$REACT_APP_API_URL --build-arg REACT_APP_TELEGRAM_BOT_USERNAME=BJMPnoreplybot -t jail-system .
   ```

5. Click **Save Changes**
6. Your service will automatically redeploy

### Local Development:

Add to your `.env` file:
```
TELEGRAM_BOT_TOKEN=your_bot_token_here
REACT_APP_TELEGRAM_BOT_USERNAME=BJMPnoreplybot
```

**Note**: The Dockerfile is already configured to accept `REACT_APP_TELEGRAM_BOT_USERNAME` as a build argument. When using `docker-compose`, it will automatically use the value from your `.env` file.

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

The signup form now collects Telegram username during registration.

**Important**: Users must:
1. Have a Telegram account
2. Have a Telegram username set (Settings → Username in Telegram)
3. **Start your bot** by searching for it on Telegram and clicking "Start"

### User Instructions:

When users request a password reset, they will see:
- Your bot username displayed prominently
- A direct link to open the bot in Telegram
- Clear instructions to click "Start" before requesting reset

This makes it easy for users to start the bot before requesting a password reset.

## Step 5: How It Works

1. User clicks "Forgot Password" on the login page
2. User sees bot information and instructions to start the bot first
3. User clicks "Open in Telegram" button to start the bot
4. User enters their Telegram username
5. System finds the user and creates a reset token
6. System sends a Telegram message to the user's Telegram username with the reset link
7. User clicks the link in Telegram → redirects to your app
8. User resets their password

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
4. You should see the bot information box with your bot username
5. Click "Open in Telegram" to verify the bot opens correctly
6. Enter your Telegram username
7. Check your Telegram for the reset link

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
- **Request Body**: `{ "telegramUsername": "telegram_username" }`
- **Response**: Success message (doesn't reveal if user exists)

## Frontend Features

The forgot password page now includes:
- **Bot Information Box**: Shows your bot username prominently with clear instructions
- **Direct Link**: "Open in Telegram" button that opens the bot directly in Telegram
- **Clear Instructions**: Tells users to start the bot before requesting reset
- **Telegram Username Input**: Only accepts Telegram username (not regular username)

This makes it much easier for users to start the bot before requesting a password reset.

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
3. Add `REACT_APP_TELEGRAM_BOT_USERNAME` to your build environment (for frontend)
4. Update existing users with their Telegram usernames
5. Test the password reset flow

## Environment Variables Summary

**Backend (Runtime):**
- `TELEGRAM_BOT_TOKEN` - Your bot token from @BotFather

**Frontend (Build-time):**
- `REACT_APP_TELEGRAM_BOT_USERNAME` - Your bot username without @ (e.g., `silang_jail_reset_bot`)

**Note**: `REACT_APP_TELEGRAM_BOT_USERNAME` must be available when building the frontend. If using Docker, pass it as a build argument. If using Render, add it to your build command or environment variables.

