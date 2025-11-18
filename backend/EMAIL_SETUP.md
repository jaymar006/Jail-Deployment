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

## File Locations

- **Email Service**: `backend/services/emailService.js`
- **Password Reset Handler**: `backend/controllers/authController.js` (line 156-209)
- **Frontend**: `frontend/src/pages/Login.js` (line 203-261)

