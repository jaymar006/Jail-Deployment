# 📦 Migrate Your Existing SQLite Database to Render

## Overview

This guide shows you how to export your local SQLite database and use it on Render. However, **important limitations apply** on Render's free tier.

---

## ⚠️ Important Limitations

**Render Free Tier:**
- ❌ **Does NOT persist data** - Database resets when service sleeps or redeploys
- ❌ **Cannot upload files directly** - No persistent file storage
- ✅ **Default user auto-created** - Admin user recreated on each startup

**Solutions:**
1. **Upgrade to Render Starter** ($7/month) - Persistent disk storage
2. **Use Render PostgreSQL** (free tier) - Migrate from SQLite
3. **Use external database** - Supabase, Railway, Neon, etc.

---

## 📤 Step 1: Export Your Local Database

### Option A: Export to SQL File (Recommended)

1. **Run the export script:**
   ```bash
   cd backend
   node scripts/exportDatabase.js
   ```

2. **Output:**
   - Creates `database_export.sql` in the project root
   - Contains all tables and data

### Option B: Copy Database File Directly

```bash
# Windows
copy backend\data\jail_visitation.sqlite database_backup.sqlite

# Mac/Linux
cp backend/data/jail_visitation.sqlite database_backup.sqlite
```

---

## 🚀 Step 2: Use Database on Render

### Option 1: Import SQL on Render (Temporary - Free Tier)

**⚠️ Warning:** This will work, but data will be lost when service sleeps or redeploys.

1. **Add import script to your codebase:**
   - The `importDatabase.js` script is already created
   - Add `database_export.sql` to your repository (or use a data URL)

2. **Modify Dockerfile to import on build:**
   
   Add this to your `Dockerfile` before the server starts:
   ```dockerfile
   # Copy database export file
   COPY database_export.sql /app/database_export.sql
   
   # Import database on startup (optional - only if file exists)
   RUN if [ -f /app/database_export.sql ]; then \
       node backend/scripts/importDatabase.js /app/database_export.sql || true; \
     fi
   ```

3. **Deploy:**
   - Push `database_export.sql` to GitHub
   - Render will import it during build
   - ⚠️ Data will reset on sleep/redeploy

### Option 2: Use Render PostgreSQL (Recommended)

**Best long-term solution:**

1. **Create PostgreSQL Database on Render:**
   - Render Dashboard → **New +** → **PostgreSQL**
   - Name: `jail-system-db`
   - Plan: **Free** (or paid for better performance)

2. **Get Connection String:**
   - Copy **Internal Database URL**
   - Example: `postgresql://user:pass@host:5432/dbname`

3. **Migrate from SQLite to PostgreSQL:**
   ```bash
   # Install migration tool
   npm install -g pg-dump sqlite3-to-postgres
   
   # Export SQLite to SQL
   node backend/scripts/exportDatabase.js
   
   # Convert and import to PostgreSQL
   # (You'll need to adapt the SQL for PostgreSQL syntax)
   ```

4. **Update backend to use PostgreSQL:**
   - Install: `npm install pg`
   - Update `backend/config/db.js` to use PostgreSQL
   - Set `DATABASE_URL` environment variable in Render

### Option 3: Upgrade to Render Starter Plan

**For persistent SQLite storage:**

1. **Upgrade Plan:**
   - Render Dashboard → Your Service → **Change Plan**
   - Select **Starter** ($7/month)

2. **Upload Database File:**
   - Use Render Shell (SSH access)
   - Upload via SCP or Render's file upload feature
   - Place in `/app/backend/data/jail_visitation.sqlite`

3. **Data persists** between deployments! ✅

---

## 🔄 Step 3: Automated Import Script

Create a startup script that imports data if database is empty:

### Create `backend/scripts/initWithData.js`:

```javascript
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const initWithData = async () => {
  try {
    // Check if database has data
    const [users] = await db.query('SELECT COUNT(*) as count FROM users');
    
    if (users[0].count === 0) {
      console.log('📥 Database is empty, importing data...');
      
      const sqlPath = path.join(__dirname, '..', '..', 'database_export.sql');
      if (fs.existsSync(sqlPath)) {
        const importScript = require('./importDatabase');
        // Import logic here
        console.log('✅ Data imported successfully');
      }
    }
  } catch (error) {
    console.error('❌ Error importing data:', error);
  }
};

module.exports = initWithData;
```

---

## 📋 Quick Reference

### Export Database
```bash
cd backend
node scripts/exportDatabase.js
# Creates: database_export.sql
```

### Import Database (Local)
```bash
cd backend
node scripts/importDatabase.js ../database_export.sql
```

### Check Database Size
```bash
# Windows
dir backend\data\jail_visitation.sqlite

# Mac/Linux
ls -lh backend/data/jail_visitation.sqlite
```

### View Database Contents
```bash
# Install SQLite CLI if needed
# Windows: Download from sqlite.org
# Mac: Already installed
# Linux: sudo apt install sqlite3

sqlite3 backend/data/jail_visitation.sqlite
.tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM pdls;
SELECT COUNT(*) FROM visitors;
.quit
```

---

## 🎯 Recommended Approach

### For Development/Testing:
- ✅ Use default auto-created admin user
- ✅ Add data through the UI
- ✅ Accept that data resets on sleep (good for testing)

### For Production:
1. **Short term:** Use export/import script (data resets on sleep)
2. **Long term:** 
   - **Option A:** Upgrade to Render Starter ($7/month) for persistent SQLite
   - **Option B:** Migrate to PostgreSQL (free tier available)
   - **Option C:** Use external database service

---

## 🔍 Verify Migration

### Check Data Imported:

1. **Check Render Logs:**
   ```
   📥 Importing database...
   ✅ Import completed!
      Statements executed: 150
   ```

2. **Login and Check:**
   - Login with admin/admin123
   - Check if your data appears in the UI
   - Verify PDLs, visitors, etc. are present

3. **Check Database:**
   ```bash
   # If you have Render Shell access
   sqlite3 /app/backend/data/jail_visitation.sqlite
   SELECT COUNT(*) FROM pdls;
   SELECT COUNT(*) FROM visitors;
   ```

---

## 🐛 Troubleshooting

### Issue: Import fails silently

**Check:**
- SQL file syntax is correct
- Database file permissions
- Render logs for errors

### Issue: Data disappears after sleep

**This is expected on free tier.** Solutions:
- Upgrade to paid plan
- Use PostgreSQL
- Keep service awake (costs money)

### Issue: Import takes too long

**Large databases:**
- Consider splitting into smaller imports
- Use PostgreSQL for better performance
- Optimize SQL file (remove unnecessary statements)

---

## 💡 Pro Tips

1. **Backup regularly:**
   ```bash
   # Export before major changes
   node backend/scripts/exportDatabase.js
   git add database_export.sql
   git commit -m "Database backup"
   ```

2. **Version control:**
   - Don't commit large database files (>100MB)
   - Use `.gitignore` for `.sqlite` files
   - Commit SQL exports for reference

3. **Automate backups:**
   - Set up cron job to export daily
   - Store backups in cloud storage
   - Keep last 30 days of backups

---

## 📞 Next Steps

1. ✅ Export your local database
2. ✅ Choose migration strategy (PostgreSQL recommended)
3. ✅ Deploy and verify data
4. ⚠️ Plan for persistence (upgrade or migrate)

---

Happy migrating! 🚀

