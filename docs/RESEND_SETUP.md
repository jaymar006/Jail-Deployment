# 📧 Resend Email Setup Guide

This guide explains how to configure Resend for sending emails in your application.

## Why Resend?

- ✅ **Works perfectly with Render** - No SMTP port blocking issues
- ✅ **Simple API** - No SMTP configuration needed
- ✅ **Free tier** - 3,000 emails/month free
- ✅ **Fast & Reliable** - Built for modern applications
- ✅ **Easy setup** - Just need an API key

## Step 1: Create Resend Account

1. Go to https://resend.com
2. Sign up for a free account
3. Verify your email address

## Step 2: Get Your API Key

1. In Resend Dashboard → **API Keys**
2. Click **Create API Key**
3. Name it: `Render Password Reset`
4. Select permissions: **Sending access**
5. Click **Create**
6. **Copy the API key** (starts with `re_`) - you won't see it again!

## Step 3: Verify Your Domain (Required)

Resend requires you to verify a domain to send emails.

### Option A: Use Resend's Test Domain (Quick Start)

For testing, you can use Resend's test domain:
- `onboarding@resend.dev` (for testing only)

### Option B: Verify Your Own Domain (Production)

1. In Resend Dashboard → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records Resend provides to your domain
5. Wait for verification (usually a few minutes)

**Note:** For Render deployments, you can use a subdomain like `noreply@yourdomain.com`

## Step 4: Configure Render Environment Variables

Go to **Render Dashboard** → Your Service → **Environment** tab

### Required Variables:

```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Important:**
- `RESEND_API_KEY` - Your Resend API key (starts with `re_`)
- `RESEND_FROM_EMAIL` - Must use a verified domain in Resend
  - For testing: `onboarding@resend.dev`
  - For production: `noreply@yourdomain.com` (must be verified)

### Optional Variables:

```
FRONTEND_URL=https://your-app.onrender.com
```

This is used to generate the reset password link.

## Step 5: Save and Redeploy

1. Click **Save Changes**
2. Render will automatically redeploy
3. Wait for deployment to complete

## Step 6: Test

1. Try the "Forgot Password" feature
2. Check Render logs - you should see:
   ```
   ✅ Resend email service initialized
   📧 Preparing to send password reset email to: [email]
   ✅ Password reset email sent successfully via Resend: [id]
   ```
3. Check your email inbox!

## Troubleshooting

### Error: "Resend not configured"
- **Solution:** Make sure `RESEND_API_KEY` is set in Render environment variables

### Error: "Domain not verified"
- **Solution:** Verify your domain in Resend Dashboard → Domains
- Or use `onboarding@resend.dev` for testing

### Error: "Invalid from address"
- **Solution:** Make sure `RESEND_FROM_EMAIL` uses a verified domain
- Format: `name@domain.com` or `noreply@domain.com`

### Emails going to spam
- **Solution:** Verify your domain with SPF/DKIM records (Resend provides these)
- Use a proper domain instead of `resend.dev` for production

## Free Tier Limits

- **3,000 emails/month** free
- **100 emails/day** free
- Perfect for most applications!

## Migration from SMTP

If you were using SMTP (Gmail, SendGrid, etc.), you can remove these variables:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM` (replace with `RESEND_FROM_EMAIL`)

## Related Documentation

- [EMAIL_SETUP.md](./EMAIL_SETUP.md) - General email setup guide
- [RENDER_EMAIL_FIX.md](./RENDER_EMAIL_FIX.md) - Render-specific email issues

## Support

- Resend Docs: https://resend.com/docs
- Resend Support: https://resend.com/support

