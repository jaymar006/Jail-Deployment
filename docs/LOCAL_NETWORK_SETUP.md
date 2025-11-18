# 📱 Accessing from Phone on Same Network

## Quick Setup for Local Network Access

### Step 1: Find Your PC's IP Address

**Windows:**
```bash
ipconfig
```

Look for **IPv4 Address** under your active network adapter (usually WiFi or Ethernet):
```
IPv4 Address. . . . . . . . . . . . : 192.168.1.100
```

**Mac/Linux:**
```bash
ifconfig
# or
ip addr show
```

Look for `inet` address (usually starts with `192.168.x.x` or `10.x.x.x`)

### Step 2: Update `.env` File

**On your PC**, edit `.env` in the project root:

```env
JWT_SECRET=<your_secret>
DB_PATH=./backend/data/jail_visitation.sqlite
PORT=3001
NODE_ENV=production

# Use your PC's IP address (from ipconfig)
FRONTEND_URL=http://192.168.1.100:3001
REACT_APP_API_URL=http://192.168.1.100:3001
```

**Replace `192.168.1.100` with YOUR actual IP address!**

### Step 3: Rebuild Docker Container

**Important:** You MUST rebuild after changing `.env`:

```bash
# Stop container
docker compose down

# Rebuild (this rebuilds frontend with correct API URL)
docker compose build --no-cache

# Start container
docker compose up -d

# Check logs
docker compose logs -f app
```

### Step 4: Allow Firewall Access (Windows)

**Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" → Specific local ports: `3001` → Next
6. Select "Allow the connection" → Next
7. Check all profiles → Next
8. Name: "Jail System Port 3001" → Finish

**Or use PowerShell (as Administrator):**
```powershell
New-NetFirewallRule -DisplayName "Jail System Port 3001" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

### Step 5: Test from Phone

**On your phone (connected to same WiFi):**
1. Open browser
2. Go to: `http://YOUR_PC_IP:3001`
   - Example: `http://192.168.1.100:3001`
3. Should see login page ✅

---

## 🔍 Troubleshooting

### Issue 1: Can't Access from Phone

**Check 1: Verify IP Address**
```bash
# Windows
ipconfig

# Make sure you're using the correct IP (not 127.0.0.1)
# Should be something like 192.168.x.x or 10.x.x.x
```

**Check 2: Test from PC First**
```bash
# On your PC, test if it works locally
curl http://localhost:3001/api/health
# Should return: {"status":"ok"}
```

**Check 3: Test with PC's IP**
```bash
# On your PC, test with your IP
curl http://YOUR_PC_IP:3001/api/health
# Should return: {"status":"ok"}
```

**Check 4: Firewall**
- Windows: Make sure port 3001 is allowed (see Step 4)
- Make sure Windows Firewall isn't blocking Docker

**Check 5: Same Network**
- Phone and PC must be on the SAME WiFi network
- Can't access from different networks without port forwarding

### Issue 2: "Failed to Fetch" on Login

**This means frontend wasn't rebuilt with correct API URL:**

1. **Verify `.env` has correct IP:**
   ```bash
   cat .env | grep REACT_APP_API_URL
   ```

2. **Rebuild container:**
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

3. **Wait for build to complete** (takes 5-10 minutes)

4. **Test again from phone**

### Issue 3: IP Address Changes

**If your PC's IP changes frequently:**

**Option A: Set Static IP (Recommended)**
1. Open Network Settings
2. Change adapter options
3. Right-click your WiFi/Ethernet → Properties
4. Internet Protocol Version 4 (TCP/IPv4) → Properties
5. Select "Use the following IP address"
6. Set static IP (e.g., 192.168.1.100)
7. Set Subnet mask: 255.255.255.0
8. Set Default gateway: 192.168.1.1 (check your router)

**Option B: Use Hostname (Advanced)**
- Set up mDNS/Bonjour
- Access via `http://your-pc-name.local:3001`

---

## ✅ Quick Checklist

- [ ] Found PC's IP address (from `ipconfig`)
- [ ] Updated `.env` with PC's IP (not localhost)
- [ ] Set `FRONTEND_URL=http://YOUR_PC_IP:3001`
- [ ] Set `REACT_APP_API_URL=http://YOUR_PC_IP:3001`
- [ ] Rebuilt Docker: `docker compose build --no-cache`
- [ ] Restarted Docker: `docker compose up -d`
- [ ] Allowed firewall port 3001
- [ ] Phone on same WiFi network
- [ ] Can access: `http://YOUR_PC_IP:3001` from phone ✅

---

## 🎯 Expected Result

After setup:
- ✅ Can access `http://YOUR_PC_IP:3001` from phone
- ✅ Login page loads
- ✅ Login works (no "Failed to fetch")
- ✅ All features work from phone

---

## 💡 Pro Tips

1. **Keep IP Static**: Set a static IP so you don't have to update `.env` every time
2. **Bookmark on Phone**: Save `http://YOUR_PC_IP:3001` as a bookmark
3. **PC Must Stay On**: Docker container runs on your PC, so PC must be on
4. **Same Network Only**: Can't access from outside your home/office network

---

## 🚀 Next Steps

Once working locally, you can:
1. Deploy to a real server for 24/7 access
2. Set up port forwarding for external access (not recommended for security)
3. Use a VPN for secure remote access

