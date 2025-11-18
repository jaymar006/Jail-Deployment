# 🔗 Your Neon Connection String

## ✅ Correct Format for Render

Use this **exact** string in Render's `DATABASE_URL` environment variable:

```
postgresql://neondb_owner:npg_MnaGcPeFg1l8@ep-old-mud-aeg50w31-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Important:**
- ❌ Don't include `psql` command
- ❌ Don't include single quotes `'`
- ✅ Use the connection string directly
- ✅ Make sure there are NO spaces or line breaks

---

## 📋 Step-by-Step: Add to Render

### Step 1: Copy Connection String

Copy this (without quotes):
```
postgresql://neondb_owner:npg_MnaGcPeFg1l8@ep-old-mud-aeg50w31-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Step 2: Add to Render

1. **Render Dashboard** → Your Service
2. **Environment** tab
3. **Click "Add Environment Variable"** (if `DATABASE_URL` doesn't exist)
   OR
   **Click Edit** on existing `DATABASE_URL`
4. **Key**: `DATABASE_URL`
5. **Value**: Paste the connection string (no quotes, no spaces)
6. **Save Changes**

### Step 3: Verify

After saving, click the **eye icon** 👁️ to show the value and verify:
- ✅ Starts with `postgresql://`
- ✅ Contains your username
- ✅ Contains hostname `ep-old-mud-aeg50w31-pooler...`
- ✅ Contains database name `neondb`
- ✅ No extra spaces or quotes

### Step 4: Redeploy

1. **Manual Deploy** → **Clear build cache & deploy**
2. **Wait for deployment**
3. **Check logs** - should see:
   ```
   🔌 Connecting to PostgreSQL:
      Host: ep-old-mud-aeg50w31-pooler.c-2.us-east-2.aws.neon.tech
      Database: neondb
      User: neondb_owner
   ✅ Connected to PostgreSQL database
   ```

---

## 🔍 Troubleshooting

### Issue: Still Getting "ENOTFOUND base"

**Possible causes:**
1. Connection string got truncated in Render
2. Extra spaces or line breaks added
3. Quotes included accidentally

**Solution:**
1. Delete the `DATABASE_URL` variable completely
2. Add it again fresh
3. Copy-paste directly (don't type manually)
4. Make sure no spaces before/after

### Issue: Connection Timeout

**If using pooler connection:**
- Try the **direct connection** string instead (without `-pooler`)
- Get it from Neon Console → Connection Details → Direct Connection

### Issue: SSL Error

**If SSL issues:**
- Make sure `?sslmode=require` is included
- The connection string already has this ✅

---

## 🧪 Test Connection Locally (Optional)

You can test the connection string works:

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://neondb_owner:npg_MnaGcPeFg1l8@ep-old-mud-aeg50w31-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
cd backend
node -e "require('./config/db.postgres.js')"
```

If this works locally, the connection string is correct!

---

## ✅ Success!

After fixing, your app will:
- ✅ Connect to Neon PostgreSQL
- ✅ Create tables automatically
- ✅ Create default admin user
- ✅ Work without database resets!

---

That's it! Make sure the connection string in Render is exactly as shown above (no quotes, no spaces). 🚀

