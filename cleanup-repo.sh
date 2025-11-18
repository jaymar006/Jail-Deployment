#!/bin/bash

echo "========================================"
echo "Cleaning Repository for Render Deployment"
echo "========================================"
echo ""

echo "Step 1: Removing tracked large files..."
git rm -r --cached node_modules/ 2>/dev/null || true
git rm -r --cached frontend/node_modules/ 2>/dev/null || true
git rm -r --cached backend/node_modules/ 2>/dev/null || true
git rm -r --cached frontend/build/ 2>/dev/null || true
git rm --cached backend/data/*.sqlite 2>/dev/null || true
git rm --cached *.sqlite 2>/dev/null || true

echo "Step 2: Checking .gitignore..."
if [ -f .gitignore ]; then
    echo ".gitignore exists"
else
    echo "WARNING: .gitignore not found!"
fi

echo ""
echo "Step 3: Checking what large files are tracked..."
echo ""
echo "Checking for node_modules:"
git ls-files | grep -i "node_modules" | wc -l | xargs echo "files found"

echo ""
echo "Checking for build folders:"
git ls-files | grep -i "build" | wc -l | xargs echo "files found"

echo ""
echo "Checking for sqlite files:"
git ls-files | grep -i "sqlite" | wc -l | xargs echo "files found"

echo ""
echo "========================================"
echo "Next Steps:"
echo "========================================"
echo "1. Review the changes above"
echo "2. Run: git add .gitignore"
echo "3. Run: git commit -m 'Remove large files from git tracking'"
echo "4. Run: git push origin main"
echo "5. Try Render deployment again"
echo ""

