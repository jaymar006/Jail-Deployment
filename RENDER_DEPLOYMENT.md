# 🚀 Render Deployment Guide

Complete guide for deploying your Jail Information System to Render.

## 📋 Prerequisites

- GitHub repository with your code
- Render account (sign up at [render.com](https://render.com))

---

## 🔧 Step-by-Step Deployment

### Step 1: Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your repository: `Jail-Deployment`

### Step 2: Configure the Service

**Basic Settings:**
- **Name**: `jail-information-system` (or your preferred name)
- **Environment**: `Docker`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your deployment branch)
- **Root Directory**: Leave empty (or `.` if needed)

**Build & Deploy:**
- **Dockerfile Path**: `Dockerfile`
- **Docker Context**: `.` (root directory)

### Step 3: Set Environment Variables

**CRITICAL:** Add these environment variables in Render's dashboard:

1. **NODE_ENV**
   - Value: `production`

2. **PORT**
   - Value: `3001`

3. **JWT_SECRET**
   - Generate a secure secret:
     ```bash
     node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
     ```
   - Copy the output and paste as the value

4. **DB_PATH**
   - Value: `./backend/data/jail_visitation.sqlite`

5. **FRONTEND_URL** ⚠️ **IMPORTANT**
   - **After deployment**, Render will give you a URL like: `https://jail-information-system.onrender.com`
   - Set this to: `https://your-app-name.onrender.com` (use YOUR actual Render URL)

6. **REACT_APP_API_URL** ⚠️ **CRITICAL FOR LOGIN**
   - **This must match your Render URL exactly**
   - Set this to: `https://your-app-name.onrender.com` (use YOUR actual Render URL)
   - **Note:** This is used as a Docker build argument, so you may need to set it before the first build

### Step 4: Advanced Settings (Optional)

**Build Command:**
```bash
docker build --build-arg REACT_APP_API_URL=$REACT_APP_API_URL -t jail-system .
```

**Start Command:**
```bash
node backend/server.js
```

**Health Check Path:**
```
/api/health
```

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will start building your Docker image
3. Wait for the build to complete (5-10 minutes)
4. Once deployed, Render will provide you with a URL like: `https://jail-information-system.onrender.com`

### Step 6: Update Environment Variables After First Deploy

**IMPORTANT:** After the first deployment, you'll get your Render URL. You MUST update:

1. Go to **Environment** tab in Render dashboard
2. Update `FRONTEND_URL` to your Render URL: `https://your-app-name.onrender.com`
3. Update `REACT_APP_API_URL` to your Render URL: `https://your-app-name.onrender.com`
4. Click **"Save Changes"**
5. Render will automatically redeploy with the new environment variables

**⚠️ Note:** If you already deployed and got the "failed to fetch" error, you need to:
1. Update `REACT_APP_API_URL` in Render environment variables
2. **Manually trigger a rebuild** (Render → Manual Deploy → Clear build cache & deploy)

---

## 🔍 Troubleshooting "Failed to Fetch" Error

### Problem
Login fails with "Failed to fetch" error after deployment.

### Root Cause
The `REACT_APP_API_URL` environment variable wasn't set correctly during the Docker build, so the frontend is trying to connect to the wrong URL.

### Solution

**Option 1: Update Environment Variables and Rebuild**

1. Go to Render Dashboard → Your Service → **Environment**
2. Set `REACT_APP_API_URL` to your Render URL: `https://your-app-name.onrender.com`
3. Set `FRONTEND_URL` to your Render URL: `https://your-app-name.onrender.com`
4. Go to **Manual Deploy** → **Clear build cache & deploy**
5. Wait for rebuild to complete

**Option 2: Use render.yaml (Recommended)**

If you have `render.yaml` in your repo:

1. Make sure `REACT_APP_API_URL` is set in Render dashboard
2. Render will automatically use it as a build argument
3. Redeploy: **Manual Deploy** → **Clear build cache & deploy**

**Option 3: Verify Current Configuration**

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Type: `console.log(process.env.REACT_APP_API_URL)`
4. If it shows `undefined` or wrong URL, the build argument wasn't passed correctly

---

## ✅ Verification Steps

### 1. Check Health Endpoint
Visit: `https://your-app-name.onrender.com/api/health`

Should return:
```json
{
  "status": "OK",
  "message": "Server is running!",
  "timestamp": "..."
}
```

### 2. Check Frontend Loads
Visit: `https://your-app-name.onrender.com`

Should see the login page.

### 3. Test Login
1. Open browser DevTools → **Network** tab
2. Try to login
3. Check the login request URL - it should be: `https://your-app-name.onrender.com/auth/login`
4. If it shows `localhost` or wrong URL, rebuild is needed

### 4. Check Environment Variables
In Render Dashboard → Environment tab, verify:
- ✅ `REACT_APP_API_URL` = `https://your-app-name.onrender.com`
- ✅ `FRONTEND_URL` = `https://your-app-name.onrender.com`
- ✅ `JWT_SECRET` is set (long random string)
- ✅ `NODE_ENV` = `production`
- ✅ `PORT` = `3001`

---

## 🔄 Updating Your Application

### After Code Changes

1. Push changes to GitHub
2. Render will automatically detect and deploy
3. **Important:** If you changed environment variables, make sure they're updated in Render dashboard first

### Manual Rebuild

If you need to force a rebuild:

1. Go to Render Dashboard → Your Service
2. Click **Manual Deploy** → **Clear build cache & deploy**
3. Wait for deployment to complete

---

## 💾 Database Persistence

**Important:** Render's free tier doesn't persist data between deployments. Your SQLite database will be reset if:
- The service goes to sleep (free tier)
- You redeploy
- The service restarts

**Solutions:**

1. **Upgrade to Paid Plan** - Provides persistent disk storage
2. **Use External Database** - Migrate to PostgreSQL (Render provides free PostgreSQL)
3. **Backup Before Deploy** - Export data before major changes

---

## 🔒 Security Checklist

- [ ] Strong `JWT_SECRET` set (64+ characters)
- [ ] `NODE_ENV` set to `production`
- [ ] HTTPS enabled (automatic on Render)
- [ ] Environment variables not committed to Git
- [ ] Database backups configured (if using paid plan)

---

## 📞 Support

If you're still experiencing issues:

1. Check Render logs: Dashboard → Your Service → **Logs**
2. Check build logs for errors
3. Verify all environment variables are set correctly
4. Try clearing build cache and redeploying

---

## 🎉 Success!

Once deployed and configured correctly:
- ✅ Application accessible at `https://your-app-name.onrender.com`
- ✅ Login works without "failed to fetch" error
- ✅ All features functional
- ✅ HTTPS automatically enabled

Happy deploying! 🚀

