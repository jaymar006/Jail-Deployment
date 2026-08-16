const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const logger = require('../utils/logger');

// Lazy-load googleapis to prevent crash if npm package is not installed yet
let google;
try {
  google = require('googleapis').google;
} catch (e) {
  logger.warn('⚠️ googleapis package is not installed. Google Drive uploads will fail until you run: npm install googleapis');
}

// Path to the OAuth token generated once by scripts/authorizeGoogleDrive.js.
// On a VPS this file lives on the persistent disk, so it survives restarts
// and redeploys as long as the disk itself isn't wiped.
const OAUTH_TOKEN_PATH = process.env.GOOGLE_OAUTH_TOKEN_PATH || path.join(__dirname, '..', 'google-drive-token.json');

/**
 * Finds an existing Google Drive folder by name (reusing it if present) or
 * creates a new one. Returns the folder ID.
 * @param {object} drive - Google Drive API client
 * @param {string} folderName - Name of the folder to find or create
 * @param {string|null} parentId - ID of the parent folder, or null for root
 * @returns {Promise<string>} Folder ID
 */
async function ensureDriveFolder(drive, folderName, parentId = null) {
  const escapedName = folderName.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    spaces: 'drive',
    fields: 'files(id)',
  });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  const createRes = await drive.files.create({
    resource: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: 'id',
  });
  return createRes.data.id;
}

/**
 * 1. BACKUP DATABASE
 * Programmatically generates database export based on active engine (SQLite or PostgreSQL)
 * @returns {Promise<{filePath: string, fileName: string, type: 'sqlite'|'postgres'}>}
 */
async function backupDatabase(excludeTables = []) {
  const usePostgres = !!process.env.DATABASE_URL;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (usePostgres) {
    logger.info('📦 Starting programmatical PostgreSQL (Neon) export...');

    // Get all tables in the public schema
    const [tablesRows] = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );
    const tables = tablesRows.map(r => r.table_name).filter(t => !excludeTables.includes(t));

    let sqlOutput = `-- PostgreSQL Database Backup\n`;
    sqlOutput += `-- Generated: ${new Date().toISOString()}\n\n`;
    sqlOutput += `BEGIN;\n\n`;

    for (const tableName of tables) {
      // Fetch table data
      const [rows] = await db.query(`SELECT * FROM "${tableName}"`);
      if (rows.length === 0) continue;

      sqlOutput += `-- Data for Table: ${tableName}\n`;
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return val;
        });

        sqlOutput += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      sqlOutput += '\n';
    }

    sqlOutput += `COMMIT;\n`;

    // Save to temp sql file
    const fileName = `jail_backup_${timestamp}.sql`;
    const filePath = path.join(__dirname, '..', 'data', fileName);

    // Ensure data directory exists
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(filePath, sqlOutput, 'utf8');
    logger.info(`✅ PostgreSQL export completed successfully: ${fileName}`);
    return { filePath, fileName, type: 'postgres' };
  } else {
    logger.info('📦 Starting SQLite database backup...');

    // Use configured DB path or default
    const dbPath = process.env.DB_PATH
      ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(__dirname, '..', '..', process.env.DB_PATH))
      : path.join(__dirname, '..', 'data', 'jail_visitation.sqlite');

    if (!fs.existsSync(dbPath)) {
      throw new Error(`SQLite database file not found at path: ${dbPath}`);
    }

    const fileName = `jail_backup_${timestamp}.sqlite`;
    const filePath = path.join(__dirname, '..', 'data', fileName);

    // Ensure data directory exists
    const dataDir = path.dirname(filePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Perform standard binary copy for SQLite database files
    fs.copyFileSync(dbPath, filePath);
    logger.info(`✅ SQLite backup completed successfully: ${fileName}`);
    return { filePath, fileName, type: 'sqlite' };
  }
}

/**
 * 2. UPLOAD TO GOOGLE DRIVE
 * Authenticates using Service Account credentials and uploads the backup file.
 * @param {string} filePath - Local path to the file to upload
 * @param {string} fileName - Destination name in Google Drive
 */
async function uploadToGoogleDrive(filePath, fileName) {
  if (!google) {
    throw new Error("Cannot upload to Google Drive: 'googleapis' npm package is not installed.");
  }

  // Get credentials configuration
  let auth;

  // Resolve an OAuth refresh token: prefer the env var (works on Render's
  // ephemeral disk — nothing is written to disk, ever), fall back to a local
  // token file for local development convenience. See scripts/authorizeGoogleDrive.js.
  let oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!oauthRefreshToken && fs.existsSync(OAUTH_TOKEN_PATH)) {
    try {
      oauthRefreshToken = JSON.parse(fs.readFileSync(OAUTH_TOKEN_PATH, 'utf8')).refresh_token;
    } catch (e) {
      logger.warn(`⚠️ Could not read local OAuth token file at ${OAUTH_TOKEN_PATH}: ${e.message}`);
    }
  }

  // Method A: OAuth (personal Gmail account). Required when the target Drive
  // folder lives on a regular (non-Workspace) account — service accounts have
  // no storage quota of their own on normal "My Drive", only on Shared Drives.
  // Run scripts/authorizeGoogleDrive.js once to get the refresh token.
  if (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && oauthRefreshToken) {
    logger.debug('Authenticating to Google Drive using OAuth refresh token...');
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ refresh_token: oauthRefreshToken });
    // googleapis fetches a fresh access_token on demand using this refresh
    // token and holds it in memory only — nothing is written back to disk,
    // so this survives Render restarts/redeploys with no extra work.
    auth = oAuth2Client;
  }
  // Method B: Credentials stored in env as an entire JSON string (Workspace service account)
  else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    logger.debug('Authenticating to Google Drive using GOOGLE_SERVICE_ACCOUNT_JSON env string...');
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
  }
  // Method C: Individual environment variables (Workspace service account)
  else if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    logger.debug('Authenticating to Google Drive using client email & private key env variables...');
    const credentials = {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newline characters
    };
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
  }
  // Method D: Local service-account.json file (Workspace service account)
  else {
    let keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || '/utils/service-account.json';

    // Resolve path relative to backend directory if the configured path does not exist as-is
    let resolvedKeyPath = keyPath;
    if (!fs.existsSync(resolvedKeyPath)) {
      const cleanPath = keyPath.replace(/^[./\\]+/, '');
      resolvedKeyPath = path.join(__dirname, '..', cleanPath);
    }

    if (fs.existsSync(resolvedKeyPath)) {
      logger.debug(`Authenticating to Google Drive using credentials file at: ${resolvedKeyPath}`);
      auth = new google.auth.GoogleAuth({
        keyFile: resolvedKeyPath,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });
    } else {
      throw new Error(
        `Google credentials not configured. For a personal Gmail account, run scripts/authorizeGoogleDrive.js ` +
        `once to create ${OAUTH_TOKEN_PATH}. Otherwise supply GOOGLE_SERVICE_ACCOUNT_JSON or place a service-account file at: ${resolvedKeyPath}`
      );
    }
  }

  // Define Google Drive API client
  const drive = google.drive({ version: 'v3', auth });

  let parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!parentFolderId) {
    const parentFolderName = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_NAME || 'Jail Backups';
    parentFolderId = await ensureDriveFolder(drive, parentFolderName);
    logger.info(`📁 Parent backup folder: ${parentFolderName} (${parentFolderId})`);
  }
  const now = new Date();
  const dateFolderName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const folderId = await ensureDriveFolder(drive, dateFolderName, parentFolderId);
  logger.info(`📁 Backups folder: ${parentFolderId}/${dateFolderName} (${folderId})`);

  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : []
  };

  const media = {
    mimeType: fileName.endsWith('.sql') ? 'text/plain' : 'application/octet-stream',
    body: fs.createReadStream(filePath),
  };

  logger.info(`📤 Uploading ${fileName} to Google Drive...`);

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink',
  });

  logger.info(`✅ Uploaded to Google Drive successfully. File ID: ${response.data.id}`);
  return response.data;
}

/**
 * 3. CLEAN UP OLD RECORDS
 * Automatically deletes history/log records that are older than the specified months.
 * We preserve core tables (pdls, users, cells, visitors accounts) and purge logs.
 * @param {number} months - Age threshold for deletion (default: 3 months)
 * @returns {Promise<{scanCleanup: number, deniedCleanup: number}>}
 */
async function cleanupOldRecords(months = 3) {
  const usePostgres = !!process.env.DATABASE_URL;
  logger.info(`🧹 Starting automatic database cleanup (records older than ${months} months)...`);

  let scanCleanupQuery;
  let deniedCleanupQuery;

  if (usePostgres) {
    scanCleanupQuery = `DELETE FROM scanned_visitors WHERE scan_date < NOW() - INTERVAL '${months} months'`;
    deniedCleanupQuery = `DELETE FROM denied_visitors WHERE time_in < NOW() - INTERVAL '${months} months'`;
  } else {
    scanCleanupQuery = `DELETE FROM scanned_visitors WHERE datetime(scan_date) < datetime('now', '-${months} months')`;
    deniedCleanupQuery = `DELETE FROM denied_visitors WHERE datetime(time_in) < datetime('now', '-${months} months')`;
  }

  // Execute scan logs cleanup
  const [scanResult] = await db.query(scanCleanupQuery);
  const scanAffected = usePostgres ? (scanResult.affectedRows || 0) : (scanResult.changes || 0);

  // Execute denied logs cleanup
  const [deniedResult] = await db.query(deniedCleanupQuery);
  const deniedAffected = usePostgres ? (deniedResult.affectedRows || 0) : (deniedResult.changes || 0);

  logger.info(`✅ Cleanup completed. Deleted ${scanAffected} visitor scan logs and ${deniedAffected} denial logs.`);
  return { scanAffected, deniedAffected };
}

/**
 * 2.5 UPLOAD TO TELEGRAM
 * Sends the backup file as a document via the Telegram Bot API.
 * @param {string} filePath - Local path to the file to upload
 * @param {string} fileName - Destination name of the file
 */
async function uploadToTelegram(filePath, fileName) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_BACKUP_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error('Telegram credentials not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_BACKUP_CHAT_ID in env.');
  }

  // Use node-telegram-bot-api (which is already a dependency)
  const ntba = require('node-telegram-bot-api');
  const TelegramBot = ntba.TelegramBot || ntba.default || ntba;
  const botInstance = new TelegramBot(botToken, { polling: false });

  logger.info(`📤 Sending backup ${fileName} to Telegram chat ${chatId}...`);

  const response = await botInstance.sendDocument(chatId, filePath, {}, {
    filename: fileName,
    contentType: fileName.endsWith('.sql') ? 'text/plain' : 'application/octet-stream'
  });

  logger.info(`✅ Uploaded to Telegram successfully. Message ID: ${response.message_id}`);
  return response;
}

/**
 * ORCHESTRATION FUNCTION
 * Integrates database backup, upload (Google Drive / Telegram), and database records cleanup.
 */
async function runScheduledBackup() {
  let tempFilePath = null;
  const retentionMonths = parseInt(process.env.RETENTION_MONTHS || '3', 10);

  try {
    // 1. Export database to a local file
    const { filePath, fileName } = await backupDatabase();
    tempFilePath = filePath;

    let uploadResult = null;
    let uploadedTo = [];

    const keyPath = path.join(__dirname, '..', 'utils', 'service-account.json');
    const hasOAuth = !!(
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      (process.env.GOOGLE_OAUTH_REFRESH_TOKEN || fs.existsSync(OAUTH_TOKEN_PATH))
    );
    const hasGoogleDrive = !!(
      hasOAuth ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) ||
      fs.existsSync(keyPath)
    );
    const hasTelegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BACKUP_CHAT_ID);

    // 2a. Upload to Telegram (if configured)
    if (hasTelegram) {
      try {
        const telegramRes = await uploadToTelegram(filePath, fileName);
        uploadResult = {
          name: fileName,
          id: telegramRes.message_id,
          webViewLink: `Sent to Telegram Chat ${process.env.TELEGRAM_BACKUP_CHAT_ID}`
        };
        uploadedTo.push('Telegram');
      } catch (tgError) {
        logger.error(`⚠️ Telegram upload failed: ${tgError.message}`);
        if (!hasGoogleDrive) throw tgError; // Throw if no fallback
      }
    }

    // 2b. Upload to Google Drive (if configured and Telegram hasn't already handled it, or as parallel)
    if (hasGoogleDrive) {
      try {
        const driveRes = await uploadToGoogleDrive(filePath, fileName);
        // Only override uploadResult if Telegram didn't write it, but log success
        if (!uploadResult) {
          uploadResult = driveRes;
        }
        uploadedTo.push('Google Drive');
      } catch (driveError) {
        logger.error(`⚠️ Google Drive upload failed: ${driveError.message}`);
        // If we successfully uploaded to Telegram, do not fail the backup cycle
        if (uploadedTo.includes('Telegram')) {
          logger.warn('🔔 Continuing backup cycle because Telegram backup was successful.');
        } else {
          throw driveError; // No successful upload, fail the backup cycle
        }
      }
    }

    if (uploadedTo.length === 0) {
      throw new Error('No upload destination is successfully configured. Set up either Google Drive credentials or Telegram credentials.');
    }

    // 3. Purge history records older than retention months
    const cleanupResult = await cleanupOldRecords(retentionMonths);

    // 4. Delete local temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      logger.debug(`Removed temporary local backup file: ${tempFilePath}`);
    }

    logger.info(`🎉 Database Backup and Cleanup cycle completed successfully! (Uploaded to: ${uploadedTo.join(', ')})`);
    return {
      success: true,
      backupFile: uploadResult.name,
      fileId: uploadResult.id,
      link: uploadResult.webViewLink,
      uploadedTo,
      cleanup: cleanupResult
    };
  } catch (error) {
    logger.error('❌ Failed to run Database Backup and Cleanup cycle:', error.message);

    // Attempt local cleanup on failure
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        logger.debug(`Cleaned up temp backup file after failure: ${tempFilePath}`);
      } catch (cleanupErr) {
        logger.error('Failed to remove temp backup file on recovery:', cleanupErr.message);
      }
    }

    throw error;
  }
}

/**
 * ORCHESTRATION FUNCTION (MANUAL)
 * One-shot backup from the Settings UI: exports the database, uploads to
 * Telegram and/or Google Drive (whichever are configured), and removes the
 * local temp file. Unlike runScheduledBackup it performs NO record cleanup.
 */
async function runManualBackup() {
  let tempFilePath = null;

  try {
    // 1. Export database to a local file
    const { filePath, fileName } = await backupDatabase(['account_lockouts']);
    tempFilePath = filePath;

    const uploadedTo = [];
    let fileId = null;
    let link = null;

    // 2a. Upload to Telegram (if configured)
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BACKUP_CHAT_ID) {
      try {
        const telegramRes = await uploadToTelegram(filePath, fileName);
        uploadedTo.push('Telegram');
        fileId = fileId || telegramRes.message_id;
        link = link || `Sent to Telegram Chat ${process.env.TELEGRAM_BACKUP_CHAT_ID}`;
      } catch (tgError) {
        logger.error(`⚠️ Manual backup Telegram upload failed: ${tgError.message}`);
      }
    }

    // 2b. Upload to Google Drive (if configured)
    try {
      const driveRes = await uploadToGoogleDrive(filePath, fileName);
      uploadedTo.push('Google Drive');
      fileId = fileId || driveRes.id;
      link = link || driveRes.webViewLink || null;
    } catch (driveError) {
      logger.error(`⚠️ Manual backup Google Drive upload failed: ${driveError.message}`);
    }

    if (uploadedTo.length === 0) {
      throw new Error('Backup upload failed: neither Google Drive nor Telegram is configured or reachable.');
    }

    logger.info(`🎉 Manual backup completed successfully! (Uploaded to: ${uploadedTo.join(', ')})`);
    return {
      success: true,
      fileName,
      fileId,
      link,
      uploadedTo,
    };
  } finally {
    // 3. Delete local temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      logger.debug(`Removed temporary local backup file: ${tempFilePath}`);
    }
  }
}

module.exports = {
  backupDatabase,
  uploadToTelegram,
  uploadToGoogleDrive,
  cleanupOldRecords,
  runScheduledBackup,
  runManualBackup
};