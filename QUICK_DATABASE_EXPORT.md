# 🚀 Quick Guide: Export Your Database

## Export Your Local Database

### Simple Method (Recommended)

```bash
npm run db:export
```

This creates `database_export.sql` in the project root with all your data.

### Manual Method

```bash
cd backend
node scripts/exportDatabase.js
```

---

## What Gets Exported?

- ✅ All tables (users, pdls, visitors, cells, etc.)
- ✅ All data (rows from every table)
- ✅ Table schemas (CREATE TABLE statements)

**Output:** `database_export.sql` file

---

## Using the Export on Render

### ⚠️ Important Limitation

**Render Free Tier:** Database resets when service sleeps or redeploys. Your exported data will be lost.

### Options:

1. **Import on Build** (Temporary - data resets)
   - Add `database_export.sql` to your repo
   - Modify Dockerfile to import on startup
   - See `MIGRATE_DATABASE_TO_RENDER.md` for details

2. **Upgrade to Paid Plan** ($7/month)
   - Persistent storage
   - Upload database file via Render Shell
   - Data persists! ✅

3. **Use PostgreSQL** (Free tier available)
   - Create Render PostgreSQL database
   - Migrate SQLite to PostgreSQL
   - Data persists! ✅

---

## Verify Export

Check the file was created:

```bash
# Windows
dir database_export.sql

# Mac/Linux
ls -lh database_export.sql
```

View contents (first 20 lines):

```bash
# Windows
type database_export.sql | more

# Mac/Linux
head -20 database_export.sql
```

---

## Next Steps

1. ✅ Export database: `npm run db:export`
2. 📖 Read: `MIGRATE_DATABASE_TO_RENDER.md` for full migration guide
3. 🚀 Choose: Import script, upgrade plan, or PostgreSQL migration

---

That's it! Your database is exported. 🎉

