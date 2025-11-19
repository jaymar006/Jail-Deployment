# 🆓 Quick Free Domain Setup for Resend

Get a free domain in 5 minutes to send emails to any address!

## Why You Need Your Own Domain

- ❌ Render domains (`*.onrender.com`) can't be used - you don't own them
- ✅ You need a domain you own to add DNS records
- ✅ Free domains work perfectly with Resend

## Step 1: Get Free Domain (5 minutes)

### Option A: Freenom (Easiest)

1. **Go to**: https://www.freenom.com
2. **Search** for a domain name (e.g., `jailvisitation`, `bjmpjail`, `silangjail`)
3. **Select** a free TLD:
   - `.tk` (Tokelau) - Most popular
   - `.ml` (Mali)
   - `.ga` (Gabon)
   - `.cf` (Central African Republic)
   - `.gq` (Equatorial Guinea)
4. **Click** "Get it now!"
5. **Complete registration**:
   - No credit card needed
   - Just email verification
   - Takes 2 minutes

**Example**: You might get `jailvisitation.tk` or `bjmpjail.ml`

### Option B: Other Free Domain Services

- **Dot TK**: https://www.dot.tk (same as Freenom)
- **No-IP**: https://www.noip.com (free subdomain)

**Recommendation**: Use Freenom - it's the easiest and most reliable.

## Step 2: Verify Domain in Resend (15-30 minutes)

### 2.1 Add Domain in Resend

1. Go to **Resend Dashboard**: https://resend.com/domains
2. Click **"Add Domain"**
3. Enter your domain: `yourdomain.tk` (replace with your actual domain)
4. Click **"Add"**

### 2.2 Copy DNS Records

Resend will show you **3 DNS records** to add. They look like:

```
TXT Record:
Name: @
Value: v=spf1 include:resend.com ~all

CNAME Record 1:
Name: resend._domainkey
Value: [long-string].resend.com

CNAME Record 2:
Name: resend
Value: [verification-string].resend.com
```

**📋 Copy these exactly** - you'll need them!

### 2.3 Add DNS Records to Freenom

1. **Log in** to Freenom
2. Go to **"Services"** → **"My Domains"**
3. Click **"Manage Domain"** on your domain
4. Go to **"Management Tools"** → **"DNS Records"**
5. **Add the 3 records** from Resend:

**Record 1 - SPF (TXT):**
- **Type**: TXT
- **Name**: @ (or leave blank)
- **Value**: `v=spf1 include:resend.com ~all` (from Resend)
- **TTL**: 3600

**Record 2 - DKIM (CNAME):**
- **Type**: CNAME
- **Name**: `resend._domainkey`
- **Value**: `[long-string].resend.com` (from Resend)
- **TTL**: 3600

**Record 3 - Verification (CNAME):**
- **Type**: CNAME
- **Name**: `resend`
- **Value**: `[verification-string].resend.com` (from Resend)
- **TTL**: 3600

6. Click **"Save Changes"**

### 2.4 Wait for Verification

- **Usually takes**: 5-30 minutes
- **Check status**: Go back to Resend Dashboard → Domains
- **Status changes**: "Pending" → "Verified" ✅

**Tip**: Use https://dnschecker.org to check if DNS records are propagated globally.

## Step 3: Update Render Environment Variable

Once verified in Resend:

1. Go to **Render Dashboard** → Your Service → **Environment**
2. Add/Update:
   ```
   RESEND_FROM_EMAIL=noreply@yourdomain.tk
   ```
   (Replace `yourdomain.tk` with your actual domain)
3. Click **Save Changes**
4. Render will automatically redeploy

## Step 4: Test!

1. Try "Forgot Password" in your app
2. Use **any email address** (not just your account email!)
3. Check Render logs - should see:
   ```
   ✅ Password reset email sent successfully via Resend
   ```
4. Check recipient's inbox! 🎉

## Troubleshooting

### Domain Verification Stuck on "Pending"

- **Wait longer** - DNS can take up to 48 hours (usually 5-30 min)
- **Check DNS records** - Make sure they're exactly as Resend provided
- **Use DNS checker**: https://dnschecker.org
- **Double-check**: No typos in record values

### DNS Records Not Working

- **Check format**: Make sure record types are correct (TXT vs CNAME)
- **Check names**: `resend._domainkey` (with underscore) not `resend.domainkey`
- **Remove spaces**: Copy values exactly from Resend
- **Wait**: DNS propagation takes time

### Still Getting "Testing Emails" Error

- **Verify**: Domain shows "Verified" in Resend Dashboard
- **Check**: `RESEND_FROM_EMAIL` is set to `noreply@yourdomain.tk`
- **Format**: Must be `email@domain.tk` format (not just `domain.tk`)

## Quick Checklist

- [ ] Got free domain from Freenom (5 min)
- [ ] Added domain in Resend Dashboard
- [ ] Copied 3 DNS records from Resend
- [ ] Added DNS records to Freenom
- [ ] Waited for verification (5-30 min)
- [ ] Domain shows "Verified" in Resend ✅
- [ ] Set `RESEND_FROM_EMAIL=noreply@yourdomain.tk` in Render
- [ ] Tested - works! 🎉

## Total Time: ~30 minutes

- **Get domain**: 5 minutes
- **Add DNS records**: 5 minutes
- **Wait for verification**: 15-30 minutes
- **Set environment variable**: 2 minutes

**Then you can send emails to anyone!** 🚀

## Need Help?

- **Freenom Support**: https://www.freenom.com/contact.html
- **Resend Support**: https://resend.com/support
- **DNS Checker**: https://dnschecker.org



