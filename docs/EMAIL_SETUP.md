# Email Setup for Password Reset

This guide explains how to configure email sending for the password reset functionality.

## Installation

First, install the required package:

```bash
cd backend
npm install nodemailer
```

## Configuration

Add the following environment variables to your `.env` file in the `backend` directory:

### For Gmail:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

**Important for Gmail:**
- You need to use an **App Password**, not your regular Gmail password
- Enable 2-Step Verification on your Google account
- Generate an App Password: https://myaccount.google.com/apppasswords
- Use the 16-character app password (no spaces) as `SMTP_PASSWORD`

### For Outlook/Hotmail:

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@outlook.com
```

### For SendGrid:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@yourdomain.com
```

### For AWS SES:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

## Customizing Email Content

To customize the email template, edit `backend/services/emailService.js`:

- Modify the `subject` field to change the email subject
- Modify the `html` field to change the email body (HTML format)
- Modify the `text` field to change the plain text version

## Testing

After setting up your email configuration:

1. Start your backend server
2. Try the "Forgot Password" feature on the login page
3. Check the server logs for email sending status
4. Check the user's email inbox for the confirmation email

## Troubleshooting

- **Email not sending**: Check your SMTP credentials and ensure the port is not blocked by firewall
- **Gmail "Less secure app" error**: Use App Passwords instead of regular password
- **Connection timeout**: Verify SMTP_HOST and SMTP_PORT are correct for your provider
- **Authentication failed**: Double-check SMTP_USER and SMTP_PASSWORD

## 🚨 Render/Cloud Platform Issues

### Problem: Connection Timeout (ETIMEDOUT)

Render and many cloud platforms **block outbound SMTP connections** on port 587. This is a security measure.

### Solutions:

#### Option 1: Use Port 465 (SSL) - Quick Fix

Try using port 465 instead of 587:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

**Note:** Port 465 uses SSL/TLS, so set `secure: true` (this is automatic when port is 465).

#### Option 2: Use SendGrid (Recommended for Render)

SendGrid works well with cloud platforms:

1. **Sign up**: https://sendgrid.com (free tier: 100 emails/day)
2. **Create API Key**: Dashboard → Settings → API Keys → Create API Key
3. **Set environment variables in Render**:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key-here
SMTP_FROM=noreply@yourdomain.com
```

#### Option 3: Use Mailgun (Also Good for Cloud)

1. **Sign up**: https://www.mailgun.com (free tier: 5,000 emails/month)
2. **Get SMTP credentials**: Dashboard → Sending → Domain Settings → SMTP credentials
3. **Set environment variables in Render**:

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

#### Option 4: Use AWS SES

1. **Set up AWS SES**: https://aws.amazon.com/ses/
2. **Get SMTP credentials**: AWS Console → SES → SMTP Settings
3. **Set environment variables in Render**:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM=noreply@yourdomain.com
```

### Setting Environment Variables in Render

1. Go to **Render Dashboard** → Your Service → **Environment**
2. Add the SMTP variables listed above
3. Click **Save Changes**
4. Render will automatically redeploy

### Testing After Fix

After updating your SMTP settings:
1. Check server logs for connection verification
2. Try the "Forgot Password" feature
3. Look for these log messages:
   - `✅ SMTP connection verified` (connection successful)
   - `✅ Password reset email sent` (email sent successfully)

## File Locations

- **Email Service**: `backend/services/emailService.js`
- **Password Reset Handler**: `backend/controllers/authController.js` (line 156-209)
- **Frontend**: `frontend/src/pages/Login.js` (line 203-261)

