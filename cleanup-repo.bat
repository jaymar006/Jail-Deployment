@echo off
echo ========================================
echo Cleaning Repository for Render Deployment
echo ========================================
echo.

echo Step 1: Removing tracked large files...
git rm -r --cached node_modules/ 2>nul
git rm -r --cached frontend/node_modules/ 2>nul
git rm -r --cached backend/node_modules/ 2>nul
git rm -r --cached frontend/build/ 2>nul
git rm --cached backend/data/*.sqlite 2>nul
git rm --cached *.sqlite 2>nul

echo Step 2: Checking .gitignore...
if exist .gitignore (
    echo .gitignore exists
) else (
    echo WARNING: .gitignore not found!
)

echo.
echo Step 3: Checking what large files are tracked...
echo.
echo Checking for node_modules:
git ls-files | findstr /i "node_modules" | find /c /v ""
echo files found

echo.
echo Checking for build folders:
git ls-files | findstr /i "build" | find /c /v ""
echo files found

echo.
echo Checking for sqlite files:
git ls-files | findstr /i "sqlite" | find /c /v ""
echo files found

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Review the changes above
echo 2. Run: git add .gitignore
echo 3. Run: git commit -m "Remove large files from git tracking"
echo 4. Run: git push origin main
echo 5. Try Render deployment again
echo.
pause

