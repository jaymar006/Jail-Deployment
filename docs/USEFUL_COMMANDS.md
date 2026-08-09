# 🛠️ Useful Commands Reference

This document serves as a quick reference for the most commonly used commands and scripts in the **Jail Information System** workspace.

---

## 🚀 One-Click Quick Start (Windows Batch Scripts)

For convenience, there are pre-configured batch scripts in the root directory to run the application without manual terminal commands:

| Script Name | Purpose | Action |
| :--- | :--- | :--- |
| [`start_servers.bat`](file:///c:/Users/Jei/Documents/codeVer/start_servers.bat) | Development Mode | Generates `.env`, starts backend (node) & frontend (development hot-reload) in separate terminal windows. |
| [`start_production.bat`](file:///c:/Users/Jei/Documents/codeVer/start_production.bat) | Production Mode (Local) | Generates `.env`, installs all dependencies, builds frontend, and runs both backend and served production frontend. |
| [`cleanup-repo.bat`](file:///c:/Users/Jei/Documents/codeVer/cleanup-repo.bat) | Repository Cleanup | Removes build artifacts, temporary log files, and cleans workspace environment. |
| [`docker-start.bat`](file:///c:/Users/Jei/Documents/codeVer/docker-start.bat) | Docker Development | Starts the application inside containerized Docker environment. |

---

## 📦 Dependency & Setup Commands

Run these commands from the root directory to set up the environment and install dependencies:

### 1. Generate Environment Files
To automatically generate a secure `.env` file containing database configurations and a strong random JWT secret:
```bash
node setup_env.js
```
*(This is mapped to `npm run setup`)*

### 2. Install All Dependencies
To install dependencies for both the backend and frontend simultaneously:
```bash
npm run install-all
```
This runs the helper commands:
* Install backend dependencies: `npm run install-backend`
* Install frontend dependencies: `npm run install-frontend`

---

## 💻 Application Execution Commands

These commands can be run via npm from the root directory or inside individual subfolders:

### Development Mode
* **Backend Development Server** (from [`backend`](file:///c:/Users/Jei/Documents/codeVer/backend) folder):
  ```bash
  npm start
  ```
* **Frontend Development Server** (from [`frontend`](file:///c:/Users/Jei/Documents/codeVer/frontend) folder):
  ```bash
  npm start
  ```
* **Run App dev environment via root**:
  ```bash
  npm start
  ```

### Production Build & Serve
To build the frontend assets and host them locally using a static server:
```bash
# Build frontend and serve production files locally
npm run start-prod
```
Under the hood, this executes:
1. Build frontend: `npm run build`
2. Serve build folder: `npm run serve` (Serves on port `3000` via `serve -s build`)

---

## 🖥️ Electron App Commands (Desktop Application)

To package or develop the application as a standalone desktop executable:

* **Start Electron in Development Mode**:
  ```bash
  npm run electron:dev
  ```
* **Pack Electron (Directory format, local testing)**:
  ```bash
  npm run electron:pack
  ```
* **Build Electron (Compile installers, e.g. `.exe`)**:
  ```bash
  npm run electron:build
  ```

---

## 🗄️ Database Utility Scripts

Database backup and restore scripts are configured to import/export SQLite database files:

* **Export Database** (Backup database to SQL format):
  ```bash
  npm run db:export
  ```
  *(Runs `node backend/scripts/exportDatabase.js`)*

* **Import Database** (Restore database from SQL format):
  ```bash
  npm run db:import
  ```
  *(Runs `node backend/scripts/importDatabase.js`)*

---

## 🐳 Docker Commands

If you are using Docker to deploy or test the environment:

* **Run Development Container Stack**:
  ```bash
  docker-compose -f docker-compose.dev.yml up --build
  ```
* **Run Production Container Stack**:
  ```bash
  docker-compose -f docker-compose.prod.yml up --build
  ```
* **Stop and Remove Containers**:
  ```bash
  docker-compose down
  ```

---

## 🆘 Port Cleanup Utilities (Windows)

If you get a `Port already in use` error (usually on port `3000` or `5000`), run the following commands in **Command Prompt** (Admin) or **PowerShell**:

1. **Find the Process ID (PID)** using the port:
   ```cmd
   # Check Port 3000
   netstat -ano | findstr :3000
   
   # Check Port 5000
   netstat -ano | findstr :5000
   ```
2. **Terminate the process** using its PID:
   ```cmd
   taskkill /PID <PID_NUMBER> /F
   ```
