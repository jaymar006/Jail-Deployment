# 🗄️ Database Backup & Google Drive Cleanup Guide

This guide explains how to set up the automated database backup and record cleanup system in the Jail Visitation Information System.

The backup system is implemented in [backupService.js](file:///c:/Users/MARTINJayMar/Documents/CodesVer/Jail-Deployment/backend/services/backupService.js). It performs three tasks:
1. **Backs up the database**:
   - **PostgreSQL (Neon)**: Programmatically exports all public tables (`pdls`, `visitors`, `scanned_visitors`, etc.) and formats them as standard SQL inserts.
   - **SQLite**: Performs a binary copy of the `.sqlite` database file directly.
2. **Uploads to Google Drive**: Uses a Google Cloud Service Account to securely upload the backup file to a specific Drive folder.
3. **Purges Old Records**: Deletes transactional log records (`scanned_visitors` check-ins and `denied_visitors` logs) older than **3 months** (configurable) to prevent database bloat, while preserving registration and user accounts.

---

## 🛠️ Prerequisites & Installation

To allow interaction with Google Drive API, install the `googleapis` library. Run this command in the `backend` directory:

```bash
cd backend
npm install googleapis
```

---

## 🔑 Step 1: Google Cloud Service Account Setup

Since the backup runs as a backend script without user interaction, you must use a **Google Cloud Service Account**.

1. **Create a Google Cloud Project**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/).
   - Click **Select a project** (top bar) and select **New Project**. Name it (e.g., `jail-system-backups`).

2. **Enable Google Drive API**:
   - In the sidebar, navigate to **APIs & Services** > **Library**.
   - Search for **Google Drive API** and click **Enable**.

3. **Create a Service Account**:
   - In the sidebar, go to **IAM & Admin** > **Service Accounts**.
   - Click **Create Service Account** at the top.
   - Name it (e.g., `backup-uploader`) and click **Create and Continue**.
   - Skip role assignment (click **Continue**) and click **Done**.

4. **Generate and Download JSON Key**:
   - Under the list of service accounts, click on your newly created service account email.
   - Go to the **Keys** tab.
   - Click **Add Key** > **Create new key**.
   - Select **JSON** format and click **Create**.
   - A `.json` file containing your credentials will download to your computer. Save it as:
     `backend/utils/service-account.json` (or any path specified in your `.env` file).
     
     > [!WARNING]
     > **NEVER commit the service-account.json credentials file to Git.** Make sure it is excluded in `.gitignore`.

5. **Get the Service Account Email**:
   - Find the email address of your service account (e.g. `backup-uploader@jail-system-backups.iam.gserviceaccount.com`). You will need this in the next step.

6. **Share Google Drive Folder**:
   - Go to your personal Google Drive and create a folder (e.g., `Jail System Backups`).
   - Right-click the folder, click **Share**, and enter the **Service Account Email** address.
   - Set the role to **Editor** and click **Send**.
   - Copy the **Folder ID** from the browser URL address bar:
     `https://drive.google.com/drive/folders/YOUR_FOLDER_ID` (you will need this for the `.env` settings).

---

## 📝 Step 2: Environment Variables Setup

Configure the environment variables in your `backend/.env` file:

```env
# Google Drive Backup & Cleanup Settings
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/utils/service-account.json
GOOGLE_DRIVE_FOLDER_ID=1S3gOxbCdDHgQ79hVfFqFwPj_jdxIYcT_  # Use your copied Folder ID here
RETENTION_MONTHS=3
```

### 🔒 Secure Production Setup (No Credentials File)
If you deploy to platforms like **Render** or **Railway**, upload of credential files to Git is restricted. You can pass the credentials securely as environment variables instead:

* **Option A**: Copy the entire contents of your downloaded `.json` credentials file, stringify it, and set it as an env variable named:
  `GOOGLE_SERVICE_ACCOUNT_JSON` (e.g., `{"type": "service_account", "project_id": ...}`)
* **Option B**: Add these individual variables in the Render environment panel:
  - `GOOGLE_CLIENT_EMAIL`: Your service account email address.
  - `GOOGLE_PRIVATE_KEY`: Your service account private key (including the `-----BEGIN PRIVATE KEY-----` header and footer. Replace newlines with `\n` if needed, the code automatically handles formatting).

---

## ⏰ Step 3: Scheduling the Backup & Cleanup

There are two primary ways to run the service:

### Option A: Internal Scheduling using `node-cron` (Already Configured!)
The daily midnight scheduler is already integrated into [server.js](file:///c:/Users/MARTINJayMar/Documents/CodesVer/Jail-Deployment/backend/server.js). It runs automatically inside your Express server process at 12:00 AM (midnight) every day.

#### 🚀 How to Test Immediately:
You do not need to wait until midnight to verify if the Google Drive connection and cleanup routines are working. Set the following environment variable in your local `.env` file or in the Render environment panel:
```env
RUN_BACKUP_ON_STARTUP=true
```
When this is set to `true`, the server will trigger a database backup and cleanup cycle **5 seconds after startup**. You can monitor the logs to verify everything succeeds and check your Google Drive folder for the uploaded backup file! (Remember to set it back to `false` or remove it after testing so it doesn't run backups on every server restart in production).

### Option B: External Webhook (Recommended for Render free tier)
Render's free tier puts applications to sleep after 15 minutes of inactivity. When asleep, `node-cron` jobs will not execute. 
Instead, we expose a secure endpoint that you can trigger externally (using free pingers like [cron-job.org](https://cron-job.org/)).

1. **Create Route**: Create a route at `backend/routes/backupRoutes.js`:
   ```javascript
   const express = require('express');
   const router = express.Router();
   const backupService = require('../services/backupService');
   const logger = require('../utils/logger');

   router.post('/run', async (req, res) => {
     // Secure endpoint using a simple secret key header
     const backupSecret = req.headers['x-backup-secret'];
     if (!backupSecret || backupSecret !== process.env.BACKUP_WEBHOOK_SECRET) {
       return res.status(403).json({ error: 'Unauthorized backup request' });
     }

     try {
       logger.info('Triggering backup via webhook...');
       const report = await backupService.runScheduledBackup();
       res.json({ message: 'Backup and cleanup completed!', report });
     } catch (err) {
       res.status(500).json({ error: 'Backup failed', details: err.message });
     }
   });

   module.exports = router;
   ```

2. **Register Route in `backend/server.js`**:
   ```javascript
   const backupRoutes = require('./routes/backupRoutes');
   app.use('/api/backup', backupRoutes);
   ```

3. **Define Secret Key in `.env`**:
   ```env
   BACKUP_WEBHOOK_SECRET=your_super_secret_token_here
   ```

4. **Configure cron-job.org**:
   - Create a free account at [cron-job.org](https://cron-job.org/).
   - Add a cron job that targets: `https://your-app.onrender.com/api/backup/run`.
   - Set request method to `POST`.
   - Add a request header: `x-backup-secret: your_super_secure_secret_here`.
   - Set execution schedule (e.g., daily or weekly).
   - This request will wake up your Render app, run the backup, upload it to Google Drive, delete old database records, and complete!

---

## 🔍 Code Anatomy & How It Works

### Database Backup
The backup script checks the active connection. If PostgreSQL is active (signaled by `DATABASE_URL`), it programmatically inspects the schema, gets list of tables, constructs sql strings containing insert scripts for all records, and writes them to a file. If SQLite is active, it copies the sqlite file directly:

```javascript
// From backupService.js
if (usePostgres) {
  // Queries public tables, writes SQL INSERT INTO commands
} else {
  // Direct file copy of SQLite DB file
}
```

### Google Drive Uploader
The upload uses Google JWT authentication. It reads the service account information from multiple fallbacks (to support local file or production environment variables):

```javascript
const drive = google.drive({ version: 'v3', auth });
await drive.files.create({
  resource: {
    name: fileName,
    parents: [folderId]
  },
  media: {
    mimeType: 'text/plain',
    body: fs.createReadStream(filePath)
  }
});
```

### Auto-Cleanup (3 Months Data Retention)
We perform cleanup only on the growth-heavy historical logging tables (`scanned_visitors` and `denied_visitors`) to avoid breaking visitor profiles or PDL information. Different queries are executed depending on Postgres vs SQLite syntax:

```javascript
// Postgres syntax
const query = "DELETE FROM scanned_visitors WHERE scan_date < NOW() - INTERVAL '3 months'";

// SQLite syntax
const query = "DELETE FROM scanned_visitors WHERE datetime(scan_date) < datetime('now', '-3 months')";
```
