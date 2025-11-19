# 📧 Resend Setup (No Domain Required)

This guide shows you how to use Resend **without domain verification** for testing and development.

## Quick Setup (No Domain Needed)

### Step 1: Create Resend Account

1. Go to https://resend.com
2. Sign up for a free account using your email (e.g., `bjmpnoreply@gmail.com`)
3. Verify your email address

### Step 2: Get Your API Key

1. In Resend Dashboard → **API Keys**
2. Click **Create API Key**
3. Name it: `Render Password Reset`
4. Select permissions: **Sending access**
5. Click **Create**
6. **Copy the API key** (starts with `re_`) - you won't see it again!

### Step 3: Configure Render Environment Variables

Go to **Render Dashboard** → Your Service → **Environment** tab

**Required Variables:**

```
RESEND_API_KEY=re_your_api_key_here
```

**Optional (for better error messages):**

```
RESEND_ACCOUNT_EMAIL=bjmpnoreply@gmail.com
FRONTEND_URL=https://jail-deployment.onrender.com
```

**That's it!** The code will automatically use `onboarding@resend.dev` as the sender email, which doesn't require domain verification.

### Step 4: Save and Redeploy

1. Click **Save Changes**
2. Render will automatically redeploy
3. Wait for deployment to complete

## Important Limitation

⚠️ **Using `onboarding@resend.dev` (test domain):**
- ✅ **No domain verification needed**
- ✅ **Works immediately**
- ❌ **Can only send emails to your Resend account email** (the email you signed up with)

**Example:**
- If you signed up with `bjmpnoreply@gmail.com`
- You can only send password reset emails to `bjmpnoreply@gmail.com`
- Sending to other emails will fail

## Testing

1. Try the "Forgot Password" feature
2. **Important:** Use the email address that matches your Resend account email
3. Check Render logs - you should see:
   ```
   ✅ Resend email service initialized
   📧 Preparing to send password reset email to: bjmpnoreply@gmail.com
   📤 From email: onboarding@resend.dev
   ✅ Password reset email sent successfully via Resend: [id]
   ```
4. Check your email inbox!

## For Production (Sending to Any Email)

To send emails to **any email address**, you need to verify a domain:

1. Get a domain (free options available - see [FREE_DOMAIN_SETUP.md](./FREE_DOMAIN_SETUP.md))
2. In Resend Dashboard → **Domains** → **Add Domain**
3. Add the DNS records Resend provides
4. Wait for verification
5. Set in Render:
   ```
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

## Troubleshooting

### Error: "You can only send testing emails to your own email address"
- **Solution:** Make sure the recipient email matches your Resend account email
- Or verify a domain to send to any email address

### Error: "Resend not configured"
- **Solution:** Make sure `RESEND_API_KEY` is set in Render environment variables

### Emails not arriving
- Check that the recipient email matches your Resend account email
- Check spam folder
- Check Render logs for errors

## Summary

✅ **For Testing:** Just set `RESEND_API_KEY` - works immediately, but only to your account email  
✅ **For Production:** Verify a domain and set `RESEND_FROM_EMAIL` - works for any email address

