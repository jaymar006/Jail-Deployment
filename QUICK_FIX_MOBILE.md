# 🚀 Quick Fix: Mobile Login "Failed to Fetch"

## Problem
Login fails with "Failed to fetch" when accessing from phones on the network.

## ✅ Solution (3 Steps)

### Step 1: Update `.env` File

**On your server, edit `.env`:**
```bash
ssh user@your-server-ip
cd ~/Jail-InformationSystem
nano .env
```

**Set these values (replace with YOUR server IP):**
```env
JWT_SECRET=<your_secret>
DB_PATH=./backend/data/jail_visitation.sqlite
PORT=3001
NODE_ENV=production

# IMPORTANT: Use your server's IP address
FRONTEND_URL=http://YOUR_SERVER_IP:3001
REACT_APP_API_URL=http://YOUR_SERVER_IP:3001
```

**Example:**
```env
FRONTEND_URL=http://192.168.1.100:3001
REACT_APP_API_URL=http://192.168.1.100:3001
```

### Step 2: Rebuild Docker Container

**On your server:**
```bash
cd ~/Jail-InformationSystem

# Stop container
docker compose down

# Rebuild with new settings (this rebuilds frontend with correct API URL)
docker compose build --no-cache

# Start container
docker compose up -d

# Check logs
docker compose logs -f app
```

**Wait for:** `Server running on port 3001`

### Step 3: Test from Phone

**On your phone's browser:**
1. Open: `http://YOUR_SERVER_IP:3001`
2. Try to login
3. Should work now! ✅

---

## 🔍 Verify It's Working

### Test 1: Check API Endpoint
**From phone browser, visit:**
```
http://YOUR_SERVER_IP:3001/api/health
```

**Should return:**
```json
{"status":"ok"}
```

### Test 2: Check Frontend API URL
**On your phone:**
1. Open browser developer tools (if available)
2. Go to Network tab
3. Try to login
4. Check the API request URL - should be `http://YOUR_SERVER_IP:3001/auth/login`

---

## 🐛 Still Not Working?

### Check 1: Firewall
```bash
# On server, allow port 3001
sudo ufw allow 3001/tcp
sudo ufw status
```

### Check 2: Container is Running
```bash
docker compose ps
# Should show: jail-system-app | Up
```

### Check 3: Port is Listening
```bash
sudo netstat -tlnp | grep 3001
# Should show: LISTEN on 0.0.0.0:3001
```

### Check 4: Test from Server Itself
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"ok"}
```

### Check 5: View Container Logs
```bash
docker compose logs app | tail -50
# Look for any errors
```

---

## 📝 What Changed

1. **CORS**: Now allows all origins in production (safe for local network)
2. **Frontend API URL**: Rebuilt with correct server IP
3. **Environment Variables**: Properly configured for mobile access

---

## ✅ Success Checklist

- [ ] Updated `.env` with server IP (not localhost)
- [ ] Rebuilt container: `docker compose build --no-cache`
- [ ] Restarted container: `docker compose up -d`
- [ ] Tested API: `http://SERVER_IP:3001/api/health` works
- [ ] Can login from phone ✅

---

## 💡 Pro Tip

If your server IP changes frequently, consider:
1. Setting up a static IP
2. Using a domain name with dynamic DNS
3. Or update `.env` and rebuild when IP changes

---

**After these steps, mobile login should work!** 🎉

