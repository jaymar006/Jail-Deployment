# 🚀 Quick Setup Guide

## For New Users (First Time Setup)

### Option 1: Production Deployment (Recommended)
```bash
start_production.bat
```
This will automatically:
- ✅ Set up the `.env` file with secure JWT secret
- ✅ Install all dependencies
- ✅ Build the frontend
- ✅ Start both servers

### Option 2: Development Mode
```bash
start_servers.bat
```
This will:
- ✅ Set up the `.env` file with secure JWT secret
- ✅ Start development servers with hot reloading

## 🔧 Manual Setup (If Needed)

If you prefer to set up manually:

1. **Install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Set up environment:**
   ```bash
   node setup_env.js
   ```

3. **For production:**
   ```bash
   npm run build
   npm run serve
   ```

4. **Start backend:**
   ```bash
   cd backend && npm start
   ```

## 📁 Environment File

The `.env` file is automatically created from `env.example` with:
- 🔐 Secure JWT secret (auto-generated)
- 🗄️ Database path
- 🌐 Server configuration
- 🔒 CORS settings

**Note:** The `.env` file is not included in the repository for security reasons, but it's automatically created when you run the setup scripts.

## 🌐 Access Points

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

## 🆘 Troubleshooting

If you encounter issues:
1. Make sure Node.js is installed (version 16+)
2. Run `node setup_env.js` to recreate the `.env` file
3. Check that ports 3000 and 5000 are available
4. Ensure all dependencies are installed with `npm run install-all`
