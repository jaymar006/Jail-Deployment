# 🌐 Verify bjmpnoreply.com in Resend

Step-by-step guide to verify your `bjmpnoreply.com` domain in Resend for email sending.

## Prerequisites

✅ You own the domain `bjmpnoreply.com`  
✅ Domain is configured/pointing to Render (already done)  
✅ You have a Resend account with API key set up

## Step 1: Add Domain in Resend

1. Go to **Resend Dashboard**: https://resend.com/domains
2. Click **Add Domain** button
3. Enter your domain: `bjmpnoreply.com`
4. Click **Add**
5. Resend will show you **3 DNS records** to add

## Step 2: Get DNS Records from Resend

After adding the domain, Resend will display something like:

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

**📋 Copy these records** - you'll need them in the next step!

## Step 3: Add DNS Records to Your Domain

You need to add these DNS records wherever you manage your domain DNS (not in Render).

### Where is your domain registered?

**If registered with:**
- **GoDaddy**: DNS Management → Add Record
- **Namecheap**: Advanced DNS → Add New Record  
- **Cloudflare**: DNS → Add Record
- **Google Domains**: DNS → Custom Records
- **Other registrar**: Look for "DNS Management" or "DNS Records"

### Add These 3 Records:

**Record 1 - SPF (TXT):**
```
Type: TXT
Name: @ (or leave blank, or use "bjmpnoreply.com")
Value: [The SPF value from Resend - starts with "v=spf1"]
TTL: 3600 (or default)
```

**Record 2 - DKIM (CNAME):**
```
Type: CNAME
Name: resend._domainkey
Value: [The DKIM value from Resend - ends with .resend.com]
TTL: 3600 (or default)
```

**Record 3 - Domain Verification (CNAME):**
```
Type: CNAME
Name: resend
Value: [The verification value from Resend - ends with .resend.com]
TTL: 3600 (or default)
```

**💡 Important Notes:**
- The `Name` field might be `@` or blank for the root domain
- Some providers use `bjmpnoreply.com` instead of `@`
- Copy the **exact values** from Resend (no extra spaces)

## Step 4: Wait for DNS Propagation

- **Usually takes**: 5-30 minutes
- **Can take up to**: 48 hours (rare)
- **Check status**: Go back to Resend Dashboard → Domains
- **Status will change**: "Pending" → "Verified" ✅

### How to Check DNS Propagation:

1. Go to https://dnschecker.org
2. Select **CNAME** record type
3. Enter: `resend.bjmpnoreply.com`
4. Click **Search**
5. Wait until you see the Resend value propagated globally

## Step 5: Verify Domain Status in Resend

1. Go back to https://resend.com/domains
2. Check your domain `bjmpnoreply.com`
3. Status should show: **✅ Verified** (green checkmark)

If still "Pending":
- Wait longer (up to 48 hours)
- Double-check DNS records are correct
- Use DNS checker to verify propagation

## Step 6: Update Render Environment Variable

Once verified in Resend:

1. Go to **Render Dashboard** → Your Service → **Environment**
2. Add or update this variable:
   ```
   RESEND_FROM_EMAIL=noreply@bjmpnoreply.com
   ```
   **Important:** Use `noreply@bjmpnoreply.com` (not just `bjmpnoreply.com`)
3. Click **Save Changes**
4. Render will automatically redeploy

## Step 7: Test Email Sending

1. Try the "Forgot Password" feature in your app
2. Use **any email address** (not just your account email!)
3. Check Render logs - you should see:
   ```
   ✅ Password reset email sent successfully via Resend
   ```
4. Check the recipient's inbox!

## Troubleshooting

### Domain Still Shows "Pending" After 30 Minutes

**Check DNS Records:**
- Go to https://dnschecker.org
- Verify all 3 records are propagated
- Make sure values match exactly (no typos)

**Common Issues:**
- ❌ Wrong record type (using TXT instead of CNAME)
- ❌ Wrong name (using `resend` instead of `resend._domainkey`)
- ❌ Extra spaces in values
- ❌ DNS not propagated yet (wait longer)

### Getting "Domain Not Verified" Error

- **Check**: Resend Dashboard → Domains → Status
- **Verify**: `RESEND_FROM_EMAIL` is set to `noreply@bjmpnoreply.com`
- **Format**: Must be `email@domain.com` format

### DNS Records Not Showing Up

- **Wait**: DNS can take time to propagate
- **Check**: Your domain registrar's DNS settings
- **Verify**: Records are saved correctly
- **Try**: Using a DNS checker tool

## Alternative: Use Subdomain

If you prefer, you can verify a subdomain instead:

1. In Resend, add: `mail.bjmpnoreply.com`
2. Add DNS records for `mail.bjmpnoreply.com`
3. Set: `RESEND_FROM_EMAIL=noreply@mail.bjmpnoreply.com`

## Summary Checklist

- [ ] Domain added in Resend Dashboard
- [ ] 3 DNS records copied from Resend
- [ ] DNS records added to domain registrar
- [ ] Waited for DNS propagation (5-30 min)
- [ ] Domain shows "Verified" in Resend
- [ ] `RESEND_FROM_EMAIL=noreply@bjmpnoreply.com` set in Render
- [ ] Tested email sending - works! ✅

## Need Help?

- **Resend Support**: https://resend.com/support
- **Resend Docs**: https://resend.com/docs
- **DNS Checker**: https://dnschecker.org

Once verified, you can send emails to **any recipient**! 🎉

