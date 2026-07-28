# MongoDB Migration - Verification Checklist

Use this checklist to verify the migration was successful.

---

## Pre-Migration (Before npm install)

- [ ] Backup store.json: `cp data/store.json data/store.json.backup`
- [ ] Git commit current state: `git add . && git commit -m "Pre-MongoDB migration backup"`
- [ ] Verify store.json is readable and contains data

---

## Installation & Dependencies

```bash
# Install dependencies
npm install
```

Verify:
- [ ] `node_modules/mongoose` exists
- [ ] `npm ls mongoose` shows mongoose 8.0.0
- [ ] `npm ls` shows no errors

---

## MongoDB Setup

### Start MongoDB

Choose one option:

**Option A: Docker**
```bash
docker run -d --name mongo-pr-review -p 27017:27017 mongo:latest
```

**Option B: Local MongoDB**
```bash
mongod
```

Verify connection:
```bash
mongosh --eval "db.adminCommand('ping')"
```

Expected output:
```
{
  ok: 1
}
```

- [ ] MongoDB is running
- [ ] mongosh command works
- [ ] Ping returns ok: 1

### Verify .env Configuration

```bash
# Check .env has MONGODB_URI
grep MONGODB_URI .env
```

Expected output:
```
MONGODB_URI=mongodb://localhost:27017/pr-review-agent
```

- [ ] MONGODB_URI is set in .env
- [ ] Connection string is valid
- [ ] Port matches running MongoDB (27017 for local)

---

## Code Quality Checks

### Syntax Validation

```bash
# Check all modified files
node --check config/database.js
node --check models/User.js
node --check models/Review.js
node --check repositories/userRepository.js
node --check repositories/reviewRepository.js
node --check utils/session.js
node --check server.js
```

Expected output: No error messages (exit code 0)

- [ ] config/database.js - Syntax OK
- [ ] models/User.js - Syntax OK
- [ ] models/Review.js - Syntax OK
- [ ] repositories/userRepository.js - Syntax OK
- [ ] repositories/reviewRepository.js - Syntax OK
- [ ] utils/session.js - Syntax OK
- [ ] server.js - Syntax OK

### File Existence

```bash
# Verify new files exist
ls config/database.js
ls models/User.js
ls models/Review.js
ls scripts/migrateStoreToMongo.js
```

Expected: All files exist

- [ ] config/database.js exists
- [ ] models/User.js exists
- [ ] models/Review.js exists
- [ ] scripts/migrateStoreToMongo.js exists
- [ ] package.json has "mongoose" dependency
- [ ] package.json has "migrate" script

---

## Migration Execution

### Run Migration Script

```bash
npm run migrate
```

**Expected Output:**
```
===========================================
  MongoDB Migration Script
  store.json → MongoDB
===========================================

[info] MongoDB connected
[info] Reading data from: .../data/store.json
[info] Loaded: X users, Y reviews
-------------------------------------------
[info] User migration complete:
  ✓ Inserted: X
  ⊘ Skipped: 0
-------------------------------------------
[info] Review migration complete:
  ✓ Inserted: Y
  ⊘ Skipped: 0
-------------------------------------------

===========================================
  Migration Summary
===========================================
Users:   X inserted, 0 skipped
Reviews: Y inserted, 0 skipped
Status:  ✓ Success
===========================================
```

Verify:
- [ ] Script runs without errors
- [ ] MongoDB connected message appears
- [ ] Users and reviews counts match store.json
- [ ] Status shows ✓ Success
- [ ] No "Error" messages in output

### Check MongoDB Data

```bash
mongosh
use pr-review-agent
db.users.countDocuments()
db.reviews.countDocuments()
```

Verify counts match:
- [ ] User count matches store.json
- [ ] Review count matches store.json

---

## Application Startup

### Start Server

```bash
npm start
```

**Expected Output:**
```
[info] MongoDB connected successfully
[info] PR Review Agent UI running at http://localhost:3000
```

Verify:
- [ ] No connection errors
- [ ] Server starts on port 3000
- [ ] Logs show "MongoDB connected successfully"
- [ ] No "EADDRINUSE" errors (port conflict)

### Health Check

Open in browser: http://localhost:3000

Expected:
- [ ] Page loads (no 500 errors)
- [ ] Homepage displays
- [ ] No console errors in browser DevTools

---

## Feature Testing

### 1. Signup (Email/Password)

1. Click "Create Account"
2. Enter:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "password123"
3. Click Sign Up

Verify:
- [ ] No error messages
- [ ] Redirects to homepage
- [ ] Username appears (logged in)
- [ ] Can see "Create Review" button

### 2. Logout

1. Click logout/profile menu
2. Click Logout

Verify:
- [ ] User is logged out
- [ ] Redirects to homepage
- [ ] Login button appears again
- [ ] Session is cleared

### 3. Login (Email/Password)

1. Click "Log In"
2. Enter:
   - Email: "test@example.com"
   - Password: "password123"
3. Click Log In

Verify:
- [ ] Login succeeds
- [ ] Redirects to homepage
- [ ] Username appears
- [ ] Previous data is loaded (if any)

### 4. Google OAuth

1. Click "Sign in with Google"

Verify:
- [ ] Redirects to Google login
- [ ] Can authenticate with Google
- [ ] User is created/updated in MongoDB
- [ ] Logged in successfully

### 5. Create Review

1. Fill in review form:
   - Issue/PR URL or text
   - Code samples (optional)
2. Click "Generate Review"

Verify:
- [ ] Review generates
- [ ] Appears in history
- [ ] Can view review details
- [ ] All fields display correctly

### 6. Review History

1. Look for "Review History" section
2. Should show previous reviews

Verify:
- [ ] All reviews display
- [ ] Sorted by date (newest first)
- [ ] Can click to view review
- [ ] All review data intact

### 7. GitHub Fetch

1. In review form, paste GitHub PR URL
2. Check "Fetch from GitHub"
3. Generate review

Verify:
- [ ] PR data fetches
- [ ] GitHub info displays in review
- [ ] No errors

---

## Data Integrity Tests

### User Uniqueness

```bash
mongosh
use pr-review-agent
db.users.find({email: "test@example.com"}).count()
```

Should be 1:
- [ ] Email is unique
- [ ] No duplicate users

### Review Data

```bash
mongosh
use pr-review-agent
db.reviews.findOne()
```

Verify fields:
- [ ] `id` field exists and is unique
- [ ] `userId` points to valid user
- [ ] `review` field has content
- [ ] `createdAt` is valid date
- [ ] `input` has review parameters
- [ ] `meta` has rating/summary

### Indexes

```bash
mongosh
use pr-review-agent
db.users.getIndexes()
db.reviews.getIndexes()
```

Verify indexes exist:
- [ ] `users` has index on `email`
- [ ] `users` has index on `id`
- [ ] `users` has index on `auth0Sub`
- [ ] `reviews` has index on `id`
- [ ] `reviews` has index on `userId`
- [ ] `reviews` has composite index on `userId, createdAt`

---

## Performance Tests

### Page Load Time

Using browser DevTools (F12 → Network tab):

1. Refresh homepage
2. Check load time

Verify:
- [ ] Page load < 500ms
- [ ] No 500 errors
- [ ] All resources load

### Review Creation Time

Using browser DevTools timing:

1. Create new review
2. Measure time to get results

Verify:
- [ ] Creation takes < 2 seconds
- [ ] No timeout errors
- [ ] Results display correctly

### Review History Load

Using browser DevTools:

1. View review history
2. Check load time

Verify:
- [ ] History loads < 500ms
- [ ] All reviews display
- [ ] Sorting is correct

---

## Session Management

### Session Persistence

1. Login with email/password
2. Refresh page (F5)

Verify:
- [ ] Still logged in
- [ ] Session persists
- [ ] No automatic logout

### Session Expiry

1. Login
2. Close browser tab (not window)
3. Open new tab
4. Go to http://localhost:3000

Verify:
- [ ] Session is maintained in new tab
- [ ] User still logged in

### Multiple Logins

1. Login with email
2. Open new browser window
3. Login with Google

Verify:
- [ ] Both sessions work independently
- [ ] No conflicts
- [ ] Both can create reviews

---

## Error Recovery

### Connection Loss

1. Start application: `npm start`
2. Stop MongoDB: `docker stop mongo-pr-review`
3. Try to login

Verify:
- [ ] Clear error message
- [ ] Server doesn't crash
- [ ] Graceful failure

### Invalid Data

1. Manually insert invalid document in MongoDB:
```javascript
db.users.insertOne({id: "test_invalid"})
```

2. Try to query users

Verify:
- [ ] Application handles it
- [ ] No crashes
- [ ] Logging shows error

---

## Security Tests

### Password Hashing

1. Login with credentials
2. Check MongoDB:
```javascript
db.users.findOne({email: "test@example.com"})
```

Verify:
- [ ] Password is NOT stored in plain text
- [ ] `passwordHash` is a hash
- [ ] Hash is different from password

### Unique Email Constraint

1. Try to register twice with same email

Verify:
- [ ] Second registration fails
- [ ] Error message: "email already exists"
- [ ] Database enforces uniqueness

---

## Cleanup & Finalization

### Verify store.json Backup

```bash
ls -la data/store.json*
```

- [ ] Original `data/store.json` still exists (backup)
- [ ] Can be restored if needed

### Check Disk Space

```bash
du -sh data/
du -sh *
```

Note:
- [ ] MongoDB uses local disk (if not Atlas)
- [ ] Adequate disk space for growth

### Document Status

- [ ] MONGODB_MIGRATION.md created ✓
- [ ] MIGRATION_SUMMARY.md created ✓
- [ ] VERIFY_MIGRATION.md created ✓
- [ ] All new files documented

---

## Final Checklist

Before declaring migration complete:

- [ ] All syntax checks pass
- [ ] MongoDB migration runs successfully
- [ ] Application starts without errors
- [ ] All features work (signup, login, reviews, etc.)
- [ ] Data is intact in MongoDB
- [ ] Indexes are created
- [ ] Backup of store.json exists
- [ ] Performance is acceptable
- [ ] Error handling works
- [ ] Security constraints enforced
- [ ] Documentation is complete

---

## Rollback Procedure (If Needed)

If critical issues found:

1. **Stop application:** Press Ctrl+C
2. **Revert code:** `git checkout HEAD~1`
3. **Clear MongoDB:** `mongosh` → `use pr-review-agent` → `db.users.deleteMany({})` → `db.reviews.deleteMany({})`
4. **Restart:** `npm start` (will use store.json)

Recovery time: ~5 minutes

---

## Success Criteria

✅ Migration is successful if:

1. Zero errors in migration script
2. MongoDB contains all users and reviews
3. Application starts and connects to MongoDB
4. All features work (signup, login, reviews, history)
5. Data integrity is maintained
6. Performance is acceptable (no timeouts)
7. Can login with existing credentials
8. Can create new reviews
9. Session management works
10. No critical errors in logs

---

## Next Steps After Verification

1. Run application for 7+ days in production
2. Monitor logs for any errors
3. Collect performance metrics
4. After verification period, optionally:
   - Archive store.json.backup
   - Set up MongoDB backups
   - Scale MongoDB if needed

---

## Support Resources

- MongoDB Documentation: https://docs.mongodb.com/
- Mongoose Documentation: https://mongoosejs.com/
- Application logs: Check console output
- MongoDB shell: `mongosh` command
- Check .env configuration: `grep MONGODB_URI .env`

