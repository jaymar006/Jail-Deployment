# 🔌 Offline Database Synchronization & Backup Guide

This guide explains how to configure the Jail Information System to run using a **local SQLite database** as the primary storage inside your computer, while maintaining your **Neon PostgreSQL database** as a backup only.

---

## 🎯 System Architecture

- **Primary Application Database**: Local SQLite Database (runs 100% offline, stored inside your computer's AppData folder).
- **Remote Backup Database**: Neon PostgreSQL Database (used only to sync data to/from, serving as a secure cloud backup).

---

## ⚙️ Step 1: Configure Environment Variables

To force the application to run offline (using the local SQLite database) while still keeping the ability to sync with Neon, update your environment configuration.

Open your `backend/.env` file and modify it as follows:

1. **Comment out or delete** the `DATABASE_URL` variable. If this is not present, the app automatically switches to SQLite mode.
2. **Add a new variable** named `NEON_DATABASE_URL` with your Neon connection string. The sync script will use this to connect to Neon.

### Example `backend/.env` Settings:

```env
# ==========================================
# Database Configuration
# ==========================================

# 1. Comment out or delete DATABASE_URL to force the app to run on SQLite (Offline)
# DATABASE_URL=postgresql://neondb_owner:pass@ep-host.neon.tech/neondb?sslmode=require

# 2. Add NEON_DATABASE_URL for the sync and backup scripts to use
NEON_DATABASE_URL=postgresql://neondb_owner:pass@ep-host.neon.tech/neondb?sslmode=require
```

---

## 🗄️ Where is my Offline Database stored?

When running the Electron desktop app, the database is stored securely in your user profile:

- **Windows**: `C:\Users\<YourUsername>\AppData\Roaming\jail-information-system\data\jail_visitation.sqlite`
- **macOS**: `/Users/<YourUsername>/Library/Application Support/jail-information-system/data/jail_visitation.sqlite`
- **Linux**: `/home/<YourUsername>/.config/jail-information-system/data/jail_visitation.sqlite`

*Note: In local development mode without starting Electron, it defaults to your project workspace directory at `backend/data/jail_visitation.sqlite`.*

---

## 🔄 How to Synchronize Database Data

We have registered two easy-to-use npm commands in the project root directory.

### 📥 1. Download Neon Database to your Computer
If you want to copy all existing data from your Neon database into your computer's local SQLite database:

```bash
npm run db:sync-from-neon
```

**What it does:**
1. Connects to your Neon PostgreSQL database.
2. Connects to your local SQLite database (creating it and its folders if they don't exist).
3. Reads all tables from Neon.
4. Clears existing data in SQLite.
5. Populates the SQLite database with the downloaded Neon data.

---

### 📤 2. Backup Local Database to Neon
If you have made offline changes and want to upload them back to Neon as a cloud backup:

```bash
npm run db:sync-to-neon
```

**What it does:**
1. Connects to your local SQLite database.
2. Connects to your Neon PostgreSQL database.
3. Truncates/clears all existing tables in Neon.
4. Uploads all rows from your SQLite database into Neon.
5. Resets Neon's primary key sequences so that future cloud deployments do not cause duplicate key errors.

---

## 💡 Troubleshooting & Best Practices

- **Dynamic Schema Alignment**: The sync script automatically checks if Neon has any columns that are missing from your local SQLite database and adds them to SQLite on-the-fly. This prevents crashes if new fields are added during updates.
- **Connection Errors**: If you get a connection error, make sure your internet is working, your Neon database is active (not paused on the free tier), and your connection string in `NEON_DATABASE_URL` is correct.
