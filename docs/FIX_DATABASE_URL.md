# 🔧 Fix: DATABASE_URL Connection Error

## The Error

```
❌ Database query error: getaddrinfo ENOTFOUND base
```

This means your `DATABASE_URL` environment variable in Render is **malformed or incomplete**.

---

## ✅ Quick Fix

### Step 1: Get Correct Neon Connection String

1. **Go to [Neon Console](https://console.neon.tech)**
2. **Select your project**
3. **Click "Connection Details"** or **"Connection String"**
4. **Copy the FULL connection string**

It should look like:
```
postgresql://username:password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Step 2: Update DATABASE_URL in Render

1. **Go to Render Dashboard**
2. **Your Service** → **Environment** tab
3. **Find `DATABASE_URL`** variable
4. **Click Edit**
5. **Paste the FULL connection string** from Neon
6. **Save Changes**

### Step 3: Redeploy

1. **Manual Deploy** → **Clear build cache & deploy**
2. **Wait for deployment**
3. **Check logs** - should see:
   ```
   🔌 Connecting to PostgreSQL:
      Host: ep-xxxx-xxxx.us-east-2.aws.neon.tech
      Database: neondb
      User: username
   ✅ Connected to PostgreSQL database
   ```

---

## 🔍 Common Issues

### Issue 1: Incomplete Connection String

**Wrong:**
```
postgresql://user:pass@host
```

**Correct:**
```
postgresql://user:pass@host.neon.tech/dbname?sslmode=require
```

### Issue 2: Missing Database Name

**Wrong:**
```
postgresql://user:pass@host.neon.tech
```

**Correct:**
```
postgresql://user:pass@host.neon.tech/neondb?sslmode=require
```

### Issue 3: Extra Spaces or Line Breaks

**Wrong:**
```
postgresql://user:pass@host/db
 (extra space or newline)
```

**Correct:**
```
postgresql://user:pass@host/db?sslmode=require
```
(No spaces, no line breaks)

### Issue 4: Using Wrong Connection String Type

**Wrong:** Using "Pooler" connection string when you need direct connection

**Solution:** Use the **"Connection String"** (not Pooler) from Neon Console

---

## 📋 Verify Your Connection String

Your `DATABASE_URL` should:

✅ Start with `postgresql://` or `postgres://`  
✅ Include username: `postgresql://username:...`  
✅ Include password: `postgresql://username:password@...`  
✅ Include host: `postgresql://username:password@host.neon.tech/...`  
✅ Include database name: `postgresql://username:password@host.neon.tech/dbname`  
✅ Include SSL mode: `postgresql://username:password@host.neon.tech/dbname?sslmode=require`  

---

## 🧪 Test Connection String Locally (Optional)

You can test your connection string before deploying:

```bash
# Install psql (PostgreSQL client)
# Windows: Download from postgresql.org
# Mac: brew install postgresql
# Linux: sudo apt install postgresql-client

# Test connection
psql "postgresql://username:password@host.neon.tech/dbname?sslmode=require"
```

If this works, the connection string is correct!

---

## 🔄 Alternative: Use Render PostgreSQL

If Neon is causing issues, you can use Render's PostgreSQL instead:

1. **Render Dashboard** → **New +** → **PostgreSQL**
2. **Create database**
3. **Copy connection string** from Render
4. **Set as `DATABASE_URL`** in your service

---

## 📞 Still Not Working?

### Check Render Logs

Look for these messages:
- ✅ `🔌 Connecting to PostgreSQL:` - Connection string parsed correctly
- ❌ `❌ Invalid DATABASE_URL format` - Format is wrong
- ❌ `getaddrinfo ENOTFOUND` - Hostname can't be resolved

### Double-Check in Render

1. **Environment** tab
2. **Find `DATABASE_URL`**
3. **Click "Show Value"** (eye icon)
4. **Verify it's complete** - no truncation, no extra spaces

### Regenerate in Neon

1. **Neon Console** → Your Project
2. **Settings** → **Connection String**
3. **Generate new connection string**
4. **Copy and update in Render**

---

## ✅ Success Indicators

After fixing, you should see in Render logs:

```
🔌 Using PostgreSQL database (Neon)
🔌 Connecting to PostgreSQL:
   Host: ep-xxxx-xxxx.us-east-2.aws.neon.tech
   Database: neondb
   User: username
✅ Connected to PostgreSQL database
✅ PostgreSQL schema initialized
```

---

That's it! Fix your `DATABASE_URL` and redeploy. 🚀

