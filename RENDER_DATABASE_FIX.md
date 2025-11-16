# 🔧 Fix: Empty Database on Render

## The Problem

After deploying to Render, the database is empty - no users, no data. This happens for two reasons:

1. **No default user is created** - The database schema is created, but no initial admin user exists
2. **Render Free Tier doesn't persist data** - SQLite database files are wiped when:
   - The service goes to sleep (after 15 minutes of inactivity on free tier)
   - You redeploy the service
   - The container restarts

## ✅ Solution 1: Default User Auto-Creation (Implemented)

I've added a script that automatically creates a default admin user when the server starts if no users exist.

**Default Credentials:**
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change this password immediately after first login!

### How It Works

The server now automatically:
1. Checks if an admin user exists on startup
2. Creates one with default credentials if none exists
3. Logs the credentials to the console

### After Deployment

1. **Redeploy your service** (to get the updated code)
2. **Check Render logs** - You should see:
   ```
   🔐 No admin user found. Creating default admin user...
   ✅ Default admin user created successfully!
      Username: admin
      Password: admin123
   ```
3. **Login** with the default credentials
4. **Change the password** immediately in Settings

---

## ⚠️ Solution 2: Database Persistence on Render

### The Issue

Render's **free tier** doesn't persist disk storage. Your SQLite database will be reset:
- When the service sleeps (15 min inactivity)
- On every redeploy
- On container restart

### Options

#### Option A: Upgrade to Paid Plan ($7/month)

Render's paid plans include persistent disk storage:
1. Go to Render Dashboard → Your Service
2. Click **"Change Plan"**
3. Select **Starter** plan ($7/month)
4. Your database will persist between deployments

#### Option B: Use Render PostgreSQL (Free Tier Available)

Migrate from SQLite to PostgreSQL for persistent storage:

1. **Create PostgreSQL Database:**
   - Render Dashboard → **New +** → **PostgreSQL**
   - Name it: `jail-system-db`
   - Plan: **Free** (or paid for better performance)

2. **Get Connection String:**
   - Copy the **Internal Database URL** from Render
   - Example: `postgresql://user:pass@host:5432/dbname`

3. **Update Your Code:**
   - Install PostgreSQL driver: `npm install pg`
   - Update `backend/config/db.js` to use PostgreSQL instead of SQLite
   - Update connection logic

4. **Set Environment Variable:**
   - In Render → Environment tab
   - Add: `DATABASE_URL` = (your PostgreSQL connection string)

#### Option C: Use External Database Service

Use a managed database service that persists:
- **Supabase** (free tier available)
- **Railway PostgreSQL** (free tier)
- **Neon** (free tier)
- **PlanetScale** (free tier for MySQL)

#### Option D: Backup Before Deploy (Temporary Solution)

Export your data before redeploying:

1. **Export data** from local database
2. **Import after deploy** using SQL scripts
3. **Not recommended** for production - data will still be lost on sleep

---

## 🔄 Quick Fix: Redeploy to Get Default User

1. **Push the updated code** to GitHub (if you haven't already)
2. **In Render Dashboard:**
   - Go to your service
   - Click **Manual Deploy** → **Clear build cache & deploy**
3. **Wait for deployment** (5-10 minutes)
4. **Check logs** - Look for default user creation message
5. **Login** with `admin` / `admin123`
6. **Change password** immediately

---

## 📝 Verify It's Working

### Check 1: Server Logs

In Render Dashboard → Logs, you should see:
```
✅ SQLite database initialized at /app/backend/data/jail_visitation.sqlite
🔐 No admin user found. Creating default admin user...
✅ Default admin user created successfully!
   Username: admin
   Password: admin123
Server running on port 3001
```

### Check 2: Login

1. Visit your Render URL
2. Try to login with:
   - Username: `admin`
   - Password: `admin123`
3. Should work! ✅

### Check 3: After Sleep

⚠️ **On Render Free Tier:**
- If service sleeps, database resets
- Default user will be recreated on next startup
- You'll need to login again with `admin` / `admin123`

---

## 🎯 Recommended Solution

For production use, I recommend:

1. **Short term**: Use the auto-created default user (already implemented)
2. **Long term**: Upgrade to Render Starter plan ($7/month) for persistent storage, OR migrate to PostgreSQL

---

## 🔍 Troubleshooting

### Issue: Still can't login after redeploy

**Check:**
1. Look at Render logs - is default user being created?
2. Try clearing browser cache/cookies
3. Check if service is actually running (not sleeping)

### Issue: Database resets every time

**This is expected on Render Free Tier.** Solutions:
- Upgrade to paid plan
- Migrate to PostgreSQL
- Keep service awake (not recommended - costs money)

### Issue: Want to keep existing data

**Options:**
1. Export data before deploy
2. Use persistent storage (paid plan or PostgreSQL)
3. Set up automated backups

---

## 📞 Next Steps

1. ✅ Redeploy to get default user creation
2. ✅ Login with `admin` / `admin123`
3. ✅ Change password immediately
4. ⚠️ Consider upgrading to paid plan or PostgreSQL for persistence
5. ✅ Start adding your data!

---

## 💡 Pro Tip

If you're testing/developing:
- The default user will be recreated each time the database resets
- This is actually helpful for testing - fresh start each time
- For production, definitely use persistent storage

---

Happy deploying! 🚀

