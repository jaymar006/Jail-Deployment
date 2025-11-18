# 🚨 Quick Fix: "Failed to Fetch" Error on Render

## The Problem

When you deployed to Render and tried to log in, you got a "Failed to fetch" error. This happens because the frontend was built with the wrong API URL (or no API URL).

## Why This Happens

React apps embed environment variables **at build time**, not runtime. When Docker builds your frontend, it needs to know what `REACT_APP_API_URL` should be. If it's not set correctly, the frontend tries to connect to the wrong URL.

## ✅ Solution (3 Steps)

### Step 1: Get Your Render URL

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your service
3. Copy the URL (looks like: `https://jail-information-system.onrender.com`)

### Step 2: Set Environment Variables in Render

1. In your Render service, go to **Environment** tab
2. Add/Update these variables:

   **REACT_APP_API_URL**
   - Value: `https://your-app-name.onrender.com` (use YOUR actual Render URL)
   - ⚠️ **This is critical** - must match your Render URL exactly

   **FRONTEND_URL**
   - Value: `https://your-app-name.onrender.com` (use YOUR actual Render URL)

   **Other required variables** (if not already set):
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `JWT_SECRET` = (generate a long random string)
   - `DB_PATH` = `./backend/data/jail_visitation.sqlite`

3. Click **"Save Changes"**

### Step 3: Rebuild with Build Arguments

Render needs to pass `REACT_APP_API_URL` as a Docker build argument. Here's how:

**Option A: Using Render Dashboard (Easiest)**

1. Go to **Settings** → **Build & Deploy**
2. Under **Build Command**, set:
   ```
   docker build --build-arg REACT_APP_API_URL=$REACT_APP_API_URL -t jail-system .
   ```
3. Under **Start Command**, set:
   ```
   node backend/server.js
   ```
4. Click **"Save Changes"**
5. Go to **Manual Deploy** → **Clear build cache & deploy**

**Option B: Using render.yaml (If you have it)**

If you're using `render.yaml`, make sure `REACT_APP_API_URL` is set in the environment variables, then:
1. Go to **Manual Deploy** → **Clear build cache & deploy**

### Step 4: Wait for Rebuild

- Build will take 5-10 minutes
- Watch the logs to ensure it completes successfully
- Look for: `Server running on port 3001`

### Step 5: Test

1. Visit your Render URL: `https://your-app-name.onrender.com`
2. Open browser DevTools (F12) → **Network** tab
3. Try to login
4. Check the login request - it should go to: `https://your-app-name.onrender.com/auth/login`
5. If it still shows `localhost` or wrong URL, the build argument wasn't passed correctly

---

## 🔍 Verify It's Fixed

### Check 1: Health Endpoint
Visit: `https://your-app-name.onrender.com/api/health`

Should return:
```json
{"status":"OK","message":"Server is running!","timestamp":"..."}
```

### Check 2: Network Request
1. Open DevTools → Network tab
2. Try login
3. The request URL should be: `https://your-app-name.onrender.com/auth/login`
4. ✅ If correct, login should work!

---

## 🐛 Still Not Working?

### Issue: Build argument not being passed

**Solution:** Make sure the build command includes `--build-arg REACT_APP_API_URL=$REACT_APP_API_URL`

In Render Dashboard → Settings → Build & Deploy:
```
docker build --build-arg REACT_APP_API_URL=$REACT_APP_API_URL -t jail-system .
```

### Issue: Environment variable not set

**Solution:** Double-check `REACT_APP_API_URL` is set in Environment tab and matches your Render URL exactly (including `https://`)

### Issue: Wrong URL format

**Solution:** Make sure:
- ✅ Starts with `https://` (not `http://`)
- ✅ Matches your Render URL exactly
- ✅ No trailing slash
- ✅ Example: `https://jail-information-system.onrender.com`

---

## 📝 Summary

The fix is simple:
1. ✅ Set `REACT_APP_API_URL` in Render environment variables to your Render URL
2. ✅ Configure build command to pass it as build argument
3. ✅ Rebuild with cleared cache
4. ✅ Test login

That's it! Your login should work now. 🎉

