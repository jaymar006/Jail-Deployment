# 🚀 Setting Up Neon PostgreSQL with Render

Complete guide to connect your Render deployment to Neon PostgreSQL database.

---

## 📋 Prerequisites

- Neon account (sign up at [neon.tech](https://neon.tech))
- Render account with deployed app
- `npx neonctl@latest init` command from Neon console

---

## 🔧 Step 1: Set Up Neon Database

### Option A: Using Neon Console (Recommended)

1. **Go to [Neon Console](https://console.neon.tech)**
2. **Create a new project:**
   - Click **"New Project"**
   - Name: `jail-information-system`
   - Region: Choose closest to your Render region
   - Click **"Create Project"**

3. **Get Connection String:**
   - Go to your project dashboard
   - Click **"Connection Details"**
   - Copy the **Connection String** (looks like: `postgresql://user:pass@host/dbname?sslmode=require`)

### Option B: Using Neon CLI

1. **Install Neon CLI:**
   ```bash
   npm install -g neonctl
   ```

2. **Login to Neon:**
   ```bash
   neonctl auth
   ```

3. **Initialize project:**
   ```bash
   npx neonctl@latest init
   ```
   Follow the prompts to create a new project.

4. **Get connection string:**
   ```bash
   neonctl connection-string
   ```

---

## 🔧 Step 2: Update Your Code

### ✅ Already Done!

The code has been updated to support PostgreSQL:
- ✅ `backend/config/db.postgres.js` - PostgreSQL configuration
- ✅ `backend/config/db.js` - Auto-detects PostgreSQL when `DATABASE_URL` is set
- ✅ `backend/package.json` - Includes `pg` package

### Install Dependencies Locally (for testing)

```bash
cd backend
npm install
```

---

## 🔧 Step 3: Configure Render

### Add Environment Variable in Render

1. **Go to Render Dashboard:**
   - Navigate to your service
   - Click **"Environment"** tab

2. **Add `DATABASE_URL` variable:**
   - **Key**: `DATABASE_URL`
   - **Value**: Your Neon connection string
     ```
     postgresql://user:password@host.neon.tech/dbname?sslmode=require
     ```
   - Click **"Save Changes"**

3. **Verify other variables are set:**
   - ✅ `NODE_ENV` = `production`
   - ✅ `PORT` = `3001`
   - ✅ `JWT_SECRET` = (your secret)
   - ✅ `REACT_APP_API_URL` = (your Render URL)
   - ✅ `FRONTEND_URL` = (your Render URL)
   - ✅ `DATABASE_URL` = (your Neon connection string) ← **NEW**

---

## 🔧 Step 4: Deploy

### Automatic Deployment

1. **Push changes to GitHub** (if not already done)
2. **Render will automatically detect and deploy**
3. **Wait for deployment** (5-10 minutes)

### Manual Deployment

1. Go to Render Dashboard → Your Service
2. Click **"Manual Deploy"** → **"Clear build cache & deploy"**
3. Wait for build to complete

---

## ✅ Step 5: Verify Connection

### Check Render Logs

In Render Dashboard → Logs, you should see:

```
🔌 Using PostgreSQL database (Neon)
✅ Connected to PostgreSQL database
✅ PostgreSQL schema initialized
🔐 No admin user found. Creating default admin user...
✅ Default admin user created successfully!
```

### Test the Application

1. **Visit your Render URL**
2. **Login with default credentials:**
   - Username: `admin`
   - Password: `admin123`
3. **Verify data persists** - Add some test data and check it's saved

---

## 🔄 Step 6: Migrate Existing Data (Optional)

If you have existing SQLite data you want to migrate:

### Export SQLite Data

```bash
npm run db:export
```

This creates `database_export.sql` with all your data.

### Import to Neon

1. **Connect to Neon using psql or Neon Console:**
   ```bash
   # Using Neon connection string
   psql "postgresql://user:pass@host.neon.tech/dbname?sslmode=require"
   ```

2. **Run SQL file:**
   ```sql
   \i database_export.sql
   ```

   Or copy/paste the SQL content into Neon Console SQL Editor.

### Alternative: Use Migration Script

Create a migration script to transfer data:

```javascript
// backend/scripts/migrateToNeon.js
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// Your Neon connection string
const neonUrl = process.env.DATABASE_URL;
const sqlitePath = path.join(__dirname, '..', 'data', 'jail_visitation.sqlite');

// Connect to both databases
const sqliteDb = new sqlite3.Database(sqlitePath);
const pgPool = new Pool({ connectionString: neonUrl });

// Migration logic here...
// (See full example in migration guide)
```

---

## 🎯 How It Works

### Automatic Database Selection

The app automatically chooses the database:

- **If `DATABASE_URL` is set** → Uses PostgreSQL (Neon)
- **If `DATABASE_URL` is NOT set** → Uses SQLite (local development)

### Local Development

```bash
# Uses SQLite (no DATABASE_URL needed)
cd backend
npm start
```

### Production (Render)

```bash
# Uses PostgreSQL (DATABASE_URL from environment)
# Render automatically sets this from environment variables
```

---

## 🔍 Troubleshooting

### Issue: "DATABASE_URL environment variable is required"

**Solution:**
- Make sure `DATABASE_URL` is set in Render environment variables
- Check the connection string is correct
- Redeploy after adding the variable

### Issue: "Connection timeout" or "SSL required"

**Solution:**
- Ensure connection string includes `?sslmode=require`
- Check Neon project is not paused (free tier pauses after inactivity)
- Verify firewall/network settings

### Issue: "Schema initialization failed"

**Solution:**
- Check Neon logs in Neon Console
- Verify connection string has correct permissions
- Try running schema manually in Neon SQL Editor

### Issue: Data not persisting

**Solution:**
- Verify `DATABASE_URL` is set correctly
- Check Render logs for database connection messages
- Ensure you're using PostgreSQL, not SQLite

---

## 📊 Benefits of Neon

✅ **Free Tier Available** - Generous free tier  
✅ **Serverless** - Auto-scales, no server management  
✅ **Persistent** - Data persists between deployments  
✅ **Fast** - Low latency, global distribution  
✅ **PostgreSQL** - Full-featured relational database  
✅ **Easy Setup** - Simple connection string  

---

## 🔒 Security Best Practices

1. **Never commit `DATABASE_URL` to Git**
   - Already in `.gitignore` ✅
   - Only set in Render environment variables ✅

2. **Use connection pooling**
   - Already configured in `db.postgres.js` ✅

3. **Enable SSL**
   - Already configured (`sslmode=require`) ✅

4. **Rotate credentials regularly**
   - Update in Neon Console
   - Update `DATABASE_URL` in Render

---

## 📝 Quick Reference

### Environment Variables

**Render Dashboard → Environment:**

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Neon connection string | ✅ Yes (for Neon) |
| `NODE_ENV` | `production` | ✅ Yes |
| `PORT` | `3001` | ✅ Yes |
| `JWT_SECRET` | Random string | ✅ Yes |
| `REACT_APP_API_URL` | Your Render URL | ✅ Yes |
| `FRONTEND_URL` | Your Render URL | ✅ Yes |

### Commands

```bash
# Export SQLite database
npm run db:export

# Test local PostgreSQL connection
DATABASE_URL="your-neon-url" npm start

# Check Neon connection
neonctl connection-string
```

---

## 🎉 Success!

Once configured:
- ✅ App uses Neon PostgreSQL in production
- ✅ Data persists between deployments
- ✅ No more database resets!
- ✅ Free tier available
- ✅ Scales automatically

---

## 📞 Next Steps

1. ✅ Set up Neon database
2. ✅ Add `DATABASE_URL` to Render
3. ✅ Deploy and verify
4. ✅ Migrate existing data (optional)
5. ✅ Enjoy persistent database! 🚀

---

Happy deploying! 🎉

