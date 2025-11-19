# Render Environment Variables Check

## Issue: Telegram Bot Not Working

If you're experiencing "chat not found" errors even after users start the bot, check the following:

## 1. Verify Environment Variables in Render Dashboard

Go to your Render service → **Environment** tab and verify these are set:

### Required Variables:

✅ **Backend Runtime Variables:**
- `TELEGRAM_BOT_TOKEN` = `7033316443:AAERMPja_IXaRRyIf3BJrrxgezU-eA4v8mY`
- `DATABASE_URL` = Your Neon PostgreSQL connection string
- `JWT_SECRET` = Your JWT secret
- `NODE_ENV` = `production`
- `PORT` = `10000` (or your port)
- `FRONTEND_URL` = `https://jail-deployment.onrender.com`

✅ **Frontend Build Variables (CRITICAL):**
- `REACT_APP_API_URL` = `https://jail-deployment.onrender.com`
- `REACT_APP_TELEGRAM_BOT_USERNAME` = `BJMPnoreplybot` ⚠️ **Must be set BEFORE build**

## 2. Important: Build-Time vs Runtime Variables

`REACT_APP_TELEGRAM_BOT_USERNAME` is a **build-time** variable. It must be available during the Docker build process.

### On Render:

1. **Set in Dashboard**: Add `REACT_APP_TELEGRAM_BOT_USERNAME` to your environment variables in Render dashboard
2. **Redeploy**: After adding, trigger a new deployment so the build picks it up
3. **Verify**: Check build logs to ensure the variable is being passed

### How Render Passes Build Args:

Render automatically passes environment variables that match Dockerfile `ARG` declarations as build arguments. Since your Dockerfile has:

```dockerfile
ARG REACT_APP_TELEGRAM_BOT_USERNAME
ENV REACT_APP_TELEGRAM_BOT_USERNAME=${REACT_APP_TELEGRAM_BOT_USERNAME}
```

Render should automatically pass `REACT_APP_TELEGRAM_BOT_USERNAME` if it's set in the environment variables.

## 3. Verify Bot Token Matches Bot Username

The bot token `7033316443:AAERMPja_IXaRRyIf3BJrrxgezU-eA4v8mY` should belong to the bot `@BJMPnoreplybot`.

### To Verify:

1. Check your Render logs on startup - you should see:
   ```
   🤖 Bot Info:
      Username: @BJMPnoreplybot
      Name: [Bot Name]
      ID: [Bot ID]
   ```

2. If the username doesn't match `BJMPnoreplybot`, then:
   - Either update `REACT_APP_TELEGRAM_BOT_USERNAME` to match the actual bot username
   - Or get a new token for the correct bot from @BotFather

## 4. Common Issues

### Issue: "chat not found" even after user starts bot

**Possible Causes:**
1. User hasn't sent a message to the bot (just clicking Start isn't enough)
2. Bot token doesn't match the bot username
3. User's Telegram username in database doesn't match their actual Telegram username
4. Bot privacy settings prevent messaging

**Solution:**
- Ensure user sends at least one message to the bot (e.g., "/start" or "hello")
- Verify bot token matches bot username
- Check that user's Telegram username in database is correct (case-insensitive, but must match)

### Issue: Bot info box not showing on frontend

**Cause:** `REACT_APP_TELEGRAM_BOT_USERNAME` not set during build

**Solution:**
1. Add `REACT_APP_TELEGRAM_BOT_USERNAME` to Render environment variables
2. Redeploy the service
3. Check build logs to verify it's being passed

## 5. Testing Checklist

- [ ] `TELEGRAM_BOT_TOKEN` is set in Render environment variables
- [ ] `REACT_APP_TELEGRAM_BOT_USERNAME` is set in Render environment variables
- [ ] Service has been redeployed after adding variables
- [ ] Bot token matches bot username (check startup logs)
- [ ] User has started the bot AND sent a message
- [ ] User's Telegram username in database matches their actual Telegram username

## 6. Debugging Steps

1. **Check Build Logs:**
   - Look for: `REACT_APP_TELEGRAM_BOT_USERNAME` being passed
   - Look for any build errors

2. **Check Runtime Logs:**
   - Look for: `🤖 Bot Info:` on startup
   - Verify bot username matches `BJMPnoreplybot`

3. **Test Bot Directly:**
   - Open Telegram
   - Search for `@BJMPnoreplybot`
   - Start the bot
   - Send a message (e.g., "hello")
   - Try password reset again

4. **Verify Database:**
   - Check that user's `telegram_username` in database matches their actual Telegram username
   - Username should be without `@` symbol (e.g., `Unlibengbang` not `@Unlibengbang`)

## Your Current Configuration

Based on your environment variables:

✅ `TELEGRAM_BOT_TOKEN` = Set correctly
✅ `REACT_APP_TELEGRAM_BOT_USERNAME` = `BJMPnoreplybot` (should be correct)

**Action Required:**
1. Verify `REACT_APP_TELEGRAM_BOT_USERNAME` is set in Render dashboard
2. Redeploy the service
3. Check startup logs to verify bot username matches

