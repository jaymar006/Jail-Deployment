# 🌐 Resend Domain Verification Guide

This guide shows you how to verify a domain in Resend so you can send emails to **any email address**.

## Why Verify a Domain?

- ✅ Send emails to **any recipient** (not just your account email)
- ✅ Better email deliverability
- ✅ Professional sender address (e.g., `noreply@yourdomain.com`)
- ✅ Required for production use

## Step 1: Get a Free Domain

### Option A: Freenom (Free .tk, .ml, .ga domains)

1. Go to https://www.freenom.com
2. Search for a domain name (e.g., `jailvisitation`)
3. Select a free TLD (.tk, .ml, .ga, .cf, .gq)
4. Click **Get it now!**
5. Complete registration (no credit card needed)
6. You'll get a domain like: `jailvisitation.tk`

### Option B: Use Your Existing Domain

If you already have a domain, skip to Step 2.

## Step 2: Verify Domain in Resend

1. Go to https://resend.com/domains
2. Click **Add Domain**
3. Enter your domain (e.g., `jailvisitation.tk`)
4. Click **Add**
5. Resend will show you DNS records to add

## Step 3: Add DNS Records

You need to add these DNS records to your domain:

### For Freenom:

1. Log in to Freenom
2. Go to **Services** → **My Domains**
3. Click **Manage Domain** on your domain
4. Go to **Management Tools** → **Nameservers**
5. Use Freenom's default nameservers (or custom if you prefer)
6. Go to **Management Tools** → **DNS Records**
7. Add the records Resend provides:

**Example DNS Records:**
```
Type: TXT
Name: @
Value: [Resend's SPF record]

Type: CNAME
Name: resend._domainkey
Value: [Resend's DKIM record]

Type: CNAME
Name: resend
Value: [Resend's domain verification record]
```

8. Click **Save Changes**

### For Other Domain Providers:

- **GoDaddy**: DNS Management → Add Record
- **Namecheap**: Advanced DNS → Add New Record
- **Cloudflare**: DNS → Add Record

## Step 4: Wait for Verification

- Usually takes **5-30 minutes**
- Can take up to 48 hours (rare)
- Check Resend Dashboard → Domains for status
- Status will change from "Pending" to "Verified" ✅

## Step 5: Update Render Environment Variables

Once verified, update Render:

1. Go to **Render Dashboard** → Your Service → **Environment**
2. Add/Update:
   ```
   RESEND_FROM_EMAIL=noreply@yourdomain.tk
   ```
   (Replace `yourdomain.tk` with your actual domain)
3. Click **Save Changes**
4. Render will automatically redeploy

## Step 6: Test

1. Try the "Forgot Password" feature
2. Use **any email address** (not just your account email)
3. Check Render logs - you should see:
   ```
   ✅ Password reset email sent successfully via Resend
   ```
4. Check the recipient's inbox!

## Troubleshooting

### Domain Verification Stuck on "Pending"
- **Wait longer** - DNS propagation can take time
- **Check DNS records** - Make sure they're exactly as Resend provided
- **Use DNS checker** - https://dnschecker.org to verify records are propagated

### DNS Records Not Working
- **Double-check** the record values from Resend
- **Remove extra spaces** or characters
- **Wait 30 minutes** after adding records
- **Check TTL** - Some DNS providers cache records

### Still Getting "Testing Emails" Error
- **Verify** `RESEND_FROM_EMAIL` uses your verified domain
- **Format**: `noreply@yourdomain.tk` (not just `yourdomain.tk`)
- **Check** domain status in Resend Dashboard

## Alternative: Use Subdomain

You can also use a subdomain:

1. Add domain: `mail.yourdomain.tk`
2. Add DNS records for `mail.yourdomain.tk`
3. Use: `RESEND_FROM_EMAIL=noreply@mail.yourdomain.tk`

## Summary

✅ **Get free domain** → **Verify in Resend** → **Add DNS records** → **Wait** → **Set RESEND_FROM_EMAIL** → **Done!**

Now you can send emails to **any recipient**! 🎉

