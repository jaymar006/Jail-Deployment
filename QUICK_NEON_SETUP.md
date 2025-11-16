# ⚡ Quick Setup: Neon PostgreSQL with Render

## 🎯 3 Simple Steps

### Step 1: Get Neon Connection String

1. Go to [Neon Console](https://console.neon.tech)
2. Create/select your project
3. Copy the **Connection String** (looks like: `postgresql://user:pass@host.neon.tech/dbname?sslmode=require`)

### Step 2: Add to Render

1. **Render Dashboard** → Your Service → **Environment** tab
2. **Add new variable:**
   - **Key**: `DATABASE_URL`
   - **Value**: Paste your Neon connection string
3. **Save Changes**

### Step 3: Deploy

1. **Push code to GitHub** (if not already done)
2. **Render auto-deploys** OR
3. **Manual Deploy** → Clear build cache & deploy

---

## ✅ Done!

Your app now uses Neon PostgreSQL! Check Render logs to see:
```
🔌 Using PostgreSQL database (Neon)
✅ Connected to PostgreSQL database
✅ PostgreSQL schema initialized
```

---

## 🔍 Verify It Works

1. Visit your Render URL
2. Login with `admin` / `admin123`
3. Add some data
4. Data persists! ✅

---

## 📖 Full Guide

See `NEON_SETUP.md` for detailed instructions, troubleshooting, and migration guide.

---

That's it! 🚀

