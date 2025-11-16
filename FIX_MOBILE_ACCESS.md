# 🔧 Fix: "Failed to Fetch" on Mobile/Phone Access

## Problem
When accessing your deployed app from a phone using the server IP, you get "Failed to fetch" errors on login.

## Root Cause
1. **Frontend API URL**: Built with `localhost` instead of server IP
2. **CORS Configuration**: Not allowing requests from your phone's origin
3. **Environment Variables**: Not set correctly for mobile access

---

## ✅ Solution

### Step 1: Update `.env` File on Server

**SSH into your server:**
```bash
ssh user@your-server-ip
cd ~/Jail-InformationSystem
nano .env
```

**Update these values:**
```env
# Replace YOUR_SERVER_IP with your actual server IP (e.g., 123.45.67.89)
JWT_SECRET=<your_secret>
DB_PATH=./backend/data/jail_visitation.sqlite
PORT=3001
NODE_ENV=production

# IMPORTANT: Use your server IP address
FRONTEND_URL=http://YOUR_SERVER_IP:3001
REACT_APP_API_URL=http://YOUR_SERVER_IP:3001
```

**Example:**
```env
JWT_SECRET=a1b2c3d4e5f6...
DB_PATH=./backend/data/jail_visitation.sqlite
PORT=3001
NODE_ENV=production
FRONTEND_URL=http://192.168.1.100:3001
REACT_APP_API_URL=http://192.168.1.100:3001
```

### Step 2: Rebuild Frontend with Correct API URL

**On your server:**
```bash
cd ~/Jail-InformationSystem

# Stop the container
docker compose down

# Rebuild (this rebuilds frontend with new REACT_APP_API_URL)
docker compose build --no-cache

# Start again
docker compose up -d

# Check logs
docker compose logs -f app
```

### Step 3: Update CORS to Allow Multiple Origins (Optional but Recommended)

If you want to allow access from multiple IPs/domains, update the backend CORS configuration.

**Create/update `backend/server.js` CORS section:**

The current CORS only allows one origin. For mobile access, you might want to allow multiple origins or use a more flexible approach.

**Option A: Allow Multiple Specific Origins (Recommended)**
```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001',
      // Add your server IP
      `http://${process.env.SERVER_IP || 'localhost'}:3001`,
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};
```

**Option B: Allow All Origins (Development Only - NOT for Production)**
```javascript
const corsOptions = {
  origin: '*',  // ⚠️ Only for development!
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};
```

**After updating server.js, rebuild:**
```bash
docker compose down
docker compose build
docker compose up -d
```

---

## 🔍 Verify the Fix

### Test 1: Check API URL in Browser Console

**On your phone:**
1. Open the app: `http://YOUR_SERVER_IP:3001`
2. Open browser developer tools (if possible) or check Network tab
3. Look for API requests - they should go to `http://YOUR_SERVER_IP:3001/api/...`

### Test 2: Test API Directly

**From your phone's browser:**
```
http://YOUR_SERVER_IP:3001/api/health
```

Should return:
```json
{"status":"ok"}
```

### Test 3: Check CORS Headers

**From your computer (using curl):**
```bash
curl -H "Origin: http://YOUR_SERVER_IP:3001" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://YOUR_SERVER_IP:3001/auth/login \
     -v
```

Look for `Access-Control-Allow-Origin` header in response.

---

## 🐛 Troubleshooting

### Issue 1: Still Getting "Failed to Fetch"

**Check:**
1. Is the server IP correct in `.env`?
2. Did you rebuild after changing `.env`?
3. Is port 3001 accessible from your phone's network?

**Test connectivity:**
```bash
# From your phone, try accessing:
http://YOUR_SERVER_IP:3001/api/health

# If this doesn't work, check firewall
sudo ufw status
sudo ufw allow 3001/tcp
```

### Issue 2: CORS Error in Browser Console

**Error:** `Access to fetch at 'http://...' from origin 'http://...' has been blocked by CORS policy`

**Solution:** Update CORS configuration (see Step 3 above)

### Issue 3: API Calls Still Going to localhost

**Problem:** Frontend was built with wrong `REACT_APP_API_URL`

**Solution:** 
1. Make sure `.env` has correct `REACT_APP_API_URL`
2. Rebuild: `docker compose build --no-cache`
3. Restart: `docker compose up -d`

### Issue 4: Network Error (Not CORS)

**Possible causes:**
- Firewall blocking port 3001
- Server not accessible from phone's network
- Wrong IP address

**Check:**
```bash
# On server, check if port is listening
sudo netstat -tlnp | grep 3001

# Check firewall
sudo ufw status

# Test from server itself
curl http://localhost:3001/api/health
```

---

## 📱 Quick Fix Checklist

- [ ] Updated `.env` with server IP (not localhost)
- [ ] Set `FRONTEND_URL=http://YOUR_SERVER_IP:3001`
- [ ] Set `REACT_APP_API_URL=http://YOUR_SERVER_IP:3001`
- [ ] Rebuilt Docker image: `docker compose build --no-cache`
- [ ] Restarted container: `docker compose up -d`
- [ ] Tested API directly: `http://YOUR_SERVER_IP:3001/api/health`
- [ ] Checked firewall allows port 3001
- [ ] Verified phone can reach server IP

---

## 🎯 Expected Result

After fixing:
- ✅ Phone can access: `http://YOUR_SERVER_IP:3001`
- ✅ Login form loads correctly
- ✅ Login requests go to: `http://YOUR_SERVER_IP:3001/auth/login`
- ✅ No "Failed to fetch" errors
- ✅ API calls succeed

---

## 💡 Pro Tip: Use Domain Name Instead of IP

For better mobile access, consider:
1. Setting up a domain name (e.g., `jailsystem.yourdomain.com`)
2. Using HTTPS with Let's Encrypt
3. This avoids IP address changes and looks more professional

See `SERVER_DEPLOYMENT.md` for domain setup instructions.

