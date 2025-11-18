# 🚨 Render Email Connection Timeout Fix

## Problem
You're seeing this error in Render logs:
```
❌ Error sending password reset email: Connection timeout
❌ Failed to send password reset email: Connection timeout
```

## Root Cause
**Render blocks outbound SMTP connections on port 587** as a security measure. This is why Gmail SMTP (port 587) times out.

## ✅ Solution: Use SendGrid (Recommended)

SendGrid is specifically designed for cloud platforms and works perfectly with Render.

### Step 1: Create SendGrid Account
1. Go to https://sendgrid.com
2. Sign up for free account (100 emails/day free)
3. Verify your email address

### Step 2: Create API Key
1. In SendGrid Dashboard → **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `Render Password Reset`
4. Select **Full Access** or **Mail Send** permissions
5. Click **Create & View**
6. **Copy the API key** (starts with `SG.`) - you won't see it again!

### Step 3: Configure Render Environment Variables
1. Go to **Render Dashboard** → Your Service → **Environment** tab
2. Add/Update these variables:

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-actual-api-key-here
SMTP_FROM=noreply@yourdomain.com
```

**Important Notes:**
- `SMTP_USER` must be exactly `apikey` (not your SendGrid username)
- `SMTP_PASSWORD` is your API key (the `SG.xxxxx` you copied)
- `SMTP_FROM` can be any email (doesn't need to be verified for testing)

### Step 4: Save and Redeploy
1. Click **Save Changes**
2. Render will automatically redeploy
3. Wait for deployment to complete

### Step 5: Test
1. Try "Forgot Password" on your app
2. Check Render logs - you should see:
   ```
   ✅ SMTP connection verified
   ✅ Password reset email sent: [message-id]
   ```
3. Check your email inbox!

## 🔄 Alternative: Try Port 465 (Gmail)

If you prefer to stick with Gmail:

1. In Render Dashboard → Environment
2. Change `SMTP_PORT` from `587` to `465`
3. Keep everything else the same
4. Save and redeploy

**Note:** Port 465 uses SSL/TLS and might work better with Render, but SendGrid is still more reliable.

## ✅ Success Indicators

After fixing, you should see in Render logs:
- `📧 Preparing to send password reset email to: [email]`
- `🔗 Reset link: https://...`
- `✅ SMTP connection verified`
- `✅ Password reset email sent: [message-id]`

## 🆘 Still Having Issues?

1. **Double-check API key**: Make sure you copied the full key starting with `SG.`
2. **Verify SMTP_USER**: Must be exactly `apikey` (lowercase)
3. **Check SendGrid dashboard**: Look for email activity
4. **Check spam folder**: Emails might go to spam initially
5. **Verify SMTP_FROM**: Use a valid email format

## 📚 Related Documentation

- [EMAIL_SETUP.md](./EMAIL_SETUP.md) - Complete email setup guide
- [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) - Render deployment guide

