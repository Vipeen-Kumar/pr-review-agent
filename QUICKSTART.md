# Quick Start: MongoDB Migration

**Status: Ready to Migrate** ✓

All code implementation is complete. Follow these steps to migrate.

---

## 1. Install Dependencies (2 minutes)

```bash
npm install
```

This installs Mongoose and all dependencies. You'll see:
```
added X packages
```

---

## 2. Start MongoDB (2 minutes)

**Option A: Docker (Recommended - Simplest)**
```bash
docker run -d --name mongo-pr-review -p 27017:27017 mongo:latest
```

**Option B: Already have MongoDB installed?**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
# Service auto-starts
```

**Verify MongoDB is running:**
```bash
mongosh --eval "db.adminCommand('ping')"
```

Should output: `{ ok: 1 }`

---

## 3. Run Migration (1 minute)

```bash
npm run migrate
```

**Expected output:**
```
===========================================
  MongoDB Migration Script
  store.json → MongoDB
===========================================

[info] MongoDB connected
[info] Loaded: X users, Y reviews
[info] User migration complete: X inserted, 0 skipped
[info] Review migration complete: Y inserted, 0 skipped

Status: ✓ Success
```

If you get errors, see "Troubleshooting" below.

---

## 4. Start Application (1 minute)

```bash
npm start
```

**Expected output:**
```
[info] MongoDB connected successfully
[info] PR Review Agent UI running at http://localhost:3000
```

---

## 5. Test Features (5 minutes)

Open in browser: http://localhost:3000

Test these:
- [ ] Signup with email/password
- [ ] Login with same credentials
- [ ] Google OAuth (if configured)
- [ ] Create a review
- [ ] View review history
- [ ] Logout

All should work normally.

---

## Troubleshooting

### MongoDB Not Running
```bash
# Check if Docker container is running
docker ps | grep mongo

# If not, start it
docker start mongo-pr-review
```

### MongoDB Not Installed
```bash
# macOS - Install with Homebrew
brew install mongodb-community

# Windows - Download from https://www.mongodb.com/try/download/community

# Linux (Ubuntu) - Use apt
sudo apt-get install mongodb-server
```

### Migration Script Fails
1. Verify MongoDB is running: `mongosh --eval "db.adminCommand('ping')"`
2. Check .env has MONGODB_URI: `grep MONGODB_URI .env`
3. Try migration again: `npm run migrate`

### Application Won't Start
1. Check MongoDB connection: `mongosh`
2. Verify port 3000 is free: `netstat -ano | findstr :3000`
3. Check logs for errors in console

### Port 3000 Already in Use
```bash
# Find and kill process using port 3000
netstat -ano | findstr :3000
# Then: taskkill /PID <PID> /F
```

---

## What Changed

**New Files:**
- ✅ `config/database.js` - MongoDB connection
- ✅ `models/User.js` - User schema
- ✅ `models/Review.js` - Review schema
- ✅ `scripts/migrateStoreToMongo.js` - Migration script
- ✅ `MONGODB_MIGRATION.md` - Complete guide
- ✅ `MIGRATION_SUMMARY.md` - Detailed changes
- ✅ `VERIFY_MIGRATION.md` - Verification checklist

**Modified Files:**
- ✅ `repositories/userRepository.js` - Now uses Mongoose
- ✅ `repositories/reviewRepository.js` - Now uses Mongoose
- ✅ `utils/session.js` - Uses repository instead of storage
- ✅ `server.js` - Connects to MongoDB on startup
- ✅ `package.json` - Added mongoose, migrate script
- ✅ `.env` - Added MONGODB_URI

**Unchanged:**
- ✅ Services (authService, reviewService, etc.)
- ✅ Controllers (all files)
- ✅ Routes (all files)
- ✅ Frontend (public/)
- ✅ API endpoints
- ✅ Business logic

---

## Timeline

| Step | Time | Command |
|------|------|---------|
| 1. Install | 2 min | `npm install` |
| 2. Start MongoDB | 2 min | `docker run ...` or `brew services start ...` |
| 3. Run Migration | 1 min | `npm run migrate` |
| 4. Start App | 1 min | `npm start` |
| 5. Test Features | 5 min | Browser tests |
| **Total** | **~11 minutes** | **Ready!** |

---

## After Migration

**Optional - After 7+ days of successful operation:**

```bash
# Archive the backup
cp data/store.json data/store.json.archive

# Delete original (optional - keep for 30 days initially)
rm data/store.json
```

---

## Need More Help?

Read the detailed guides:

1. **MONGODB_MIGRATION.md** - Complete setup and production guide
2. **MIGRATION_SUMMARY.md** - Detailed implementation summary
3. **VERIFY_MIGRATION.md** - Step-by-step verification checklist
4. **IMPLEMENTATION_COMPLETE.md** - What was implemented and why

---

## Rollback (If Needed)

If critical issues occur:

```bash
# Stop the application (Ctrl+C)

# Optional: Clear MongoDB data
mongosh
use pr-review-agent
db.users.deleteMany({})
db.reviews.deleteMany({})
exit

# Revert code
git checkout HEAD~1

# Start with file-based storage
npm start
```

Takes ~5 minutes to complete.

---

## Success Indicators

✓ MongoDB connection shows in logs
✓ Migration script shows "Status: ✓ Success"
✓ App starts without errors
✓ Features work normally
✓ Review history displays
✓ Can create new reviews

---

## Commands Reference

```bash
# Full installation & migration
npm install
docker run -d --name mongo-pr-review -p 27017:27017 mongo:latest
npm run migrate
npm start

# Check MongoDB data
mongosh
use pr-review-agent
db.users.countDocuments()
db.reviews.countDocuments()
exit

# Stop server
# Press Ctrl+C

# Stop MongoDB
docker stop mongo-pr-review

# Clear MongoDB collections
mongosh
use pr-review-agent
db.users.deleteMany({})
db.reviews.deleteMany({})
exit
```

---

**You're ready to go! Start with Step 1 above.** ✓

