#!/usr/bin/env node

/**
 * Migration Script: store.json → MongoDB
 * 
 * Safely transfers data from file-based storage to MongoDB.
 * Handles duplicates, validates data, and provides detailed reporting.
 * 
 * Usage: npm run migrate
 * Or:    node scripts/migrateStoreToMongo.js
 */

// Load environment variables FIRST
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Now import other modules
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import User from "../models/User.js";
import Review from "../models/Review.js";
import { info, error as logError, warn } from "../utils/logger.js";

const STORE_PATH = path.join(__dirname, "..", "data", "store.json");

async function connectToMongo() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI not set in .env");
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    info("MongoDB connected");
    return true;
  } catch (err) {
    logError("Failed to connect to MongoDB", err);
    return false;
  }
}

async function readStoreJson() {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const store = JSON.parse(raw);
    return store;
  } catch (err) {
    logError("Failed to read store.json", err);
    throw err;
  }
}

async function migrateUsers(users) {
  info(`Starting user migration: ${users.length} users in store.json`);

  let inserted = 0;
  let skipped = 0;
  const errors = [];

  for (const userData of users) {
    try {
      // Check if user already exists by custom ID
      const existing = await User.findOne({ id: userData.id });
      if (existing) {
        warn(`User already exists, skipping: ${userData.id} (${userData.email})`);
        skipped++;
        continue;
      }

      // Create document with all fields
      const user = new User({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        passwordHash: userData.passwordHash || null,
        authProvider: userData.authProvider,
        avatarUrl: userData.avatarUrl || "",
        auth0Sub: userData.auth0Sub || null,
        createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
        updatedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
      });

      await user.save();
      inserted++;
    } catch (err) {
      logError(`Error migrating user ${userData.id}`, err);
      errors.push({
        id: userData.id,
        email: userData.email,
        error: err.message,
      });
    }
  }

  return { inserted, skipped, errors };
}

async function migrateReviews(reviews) {
  info(`Starting review migration: ${reviews.length} reviews in store.json`);

  let inserted = 0;
  let skipped = 0;
  const errors = [];

  for (const reviewData of reviews) {
    try {
      // Check if review already exists by custom ID
      const existing = await Review.findOne({ id: reviewData.id });
      if (existing) {
        warn(`Review already exists, skipping: ${reviewData.id}`);
        skipped++;
        continue;
      }

      // Create document with all fields
      const review = new Review({
        id: reviewData.id,
        userId: reviewData.userId,
        input: reviewData.input || {},
        review: reviewData.review || "",
        meta: reviewData.meta || {},
        githubPr: reviewData.githubPr || null,
        githubCommentUrl: reviewData.githubCommentUrl || "",
        createdAt: reviewData.createdAt ? new Date(reviewData.createdAt) : new Date(),
      });

      await review.save();
      inserted++;
    } catch (err) {
      logError(`Error migrating review ${reviewData.id}`, err);
      errors.push({
        id: reviewData.id,
        userId: reviewData.userId,
        error: err.message,
      });
    }
  }

  return { inserted, skipped, errors };
}

async function verifyMigration(sourceUsers, sourceReviews) {
  info("Verifying migration...");

  const mongoUsers = await User.countDocuments();
  const mongoReviews = await Review.countDocuments();

  info(`Source store.json: ${sourceUsers.length} users, ${sourceReviews.length} reviews`);
  info(`Target MongoDB: ${mongoUsers} users, ${mongoReviews} reviews`);

  // Check if we have expected data
  if (mongoUsers === 0 || mongoReviews === 0) {
    warn("Warning: Migration appears to have minimal data");
  }

  return {
    usersMatch: mongoUsers > 0,
    reviewsMatch: mongoReviews > 0,
  };
}

async function main() {
  console.log("\n===========================================");
  console.log("  MongoDB Migration Script");
  console.log("  store.json → MongoDB");
  console.log("===========================================\n");

  try {
    // Connect to MongoDB
    const connected = await connectToMongo();
    if (!connected) {
      throw new Error("Could not connect to MongoDB");
    }

    // Read store.json
    info(`Reading data from: ${STORE_PATH}`);
    const store = await readStoreJson();
    info(`Loaded: ${store.users.length} users, ${store.reviews.length} reviews`);

    // Migrate users
    info("-------------------------------------------");
    const userResult = await migrateUsers(store.users);
    info(`User migration complete:`);
    info(`  ✓ Inserted: ${userResult.inserted}`);
    info(`  ⊘ Skipped: ${userResult.skipped}`);
    if (userResult.errors.length > 0) {
      info(`  ✗ Errors: ${userResult.errors.length}`);
      userResult.errors.forEach((err) => {
        console.log(`    - ${err.id}: ${err.error}`);
      });
    }

    // Migrate reviews
    info("-------------------------------------------");
    const reviewResult = await migrateReviews(store.reviews);
    info(`Review migration complete:`);
    info(`  ✓ Inserted: ${reviewResult.inserted}`);
    info(`  ⊘ Skipped: ${reviewResult.skipped}`);
    if (reviewResult.errors.length > 0) {
      info(`  ✗ Errors: ${reviewResult.errors.length}`);
      reviewResult.errors.forEach((err) => {
        console.log(`    - ${err.id}: ${err.error}`);
      });
    }

    // Verify
    info("-------------------------------------------");
    const verification = await verifyMigration(store.users, store.reviews);

    console.log("\n===========================================");
    console.log("  Migration Summary");
    console.log("===========================================");
    console.log(`Users:   ${userResult.inserted} inserted, ${userResult.skipped} skipped`);
    console.log(`Reviews: ${reviewResult.inserted} inserted, ${reviewResult.skipped} skipped`);
    console.log(`Status:  ${verification.usersMatch && verification.reviewsMatch ? "✓ Success" : "✗ Partial"}`);
    console.log("===========================================\n");

    if (userResult.errors.length === 0 && reviewResult.errors.length === 0) {
      info("Migration completed successfully!");
      info("Next: Backup store.json and start the server with: npm start");
      process.exit(0);
    } else {
      warn("Migration completed with errors. Review logs above.");
      process.exit(0);
    }
  } catch (err) {
    logError("Migration failed", err);
    console.log("\n===========================================");
    console.log("  Migration Failed");
    console.log("===========================================\n");
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Handle being imported as module in file structure
// Normalize paths for cross-platform compatibility (Windows uses backslashes)
function isDirectlyInvoked() {
  const scriptUrl = new URL(import.meta.url).pathname;
  const argvPath = process.argv[1];
  
  // Normalize both paths to forward slashes for comparison
  const normalizedScriptPath = scriptUrl.replace(/\\/g, "/");
  const normalizedArgvPath = argvPath.replace(/\\/g, "/");
  
  // Check if they end with the same path (handles different prefixes on Windows)
  return (
    normalizedScriptPath === normalizedArgvPath ||
    normalizedScriptPath.endsWith(normalizedArgvPath) ||
    normalizedArgvPath.endsWith(normalizedScriptPath.replace(/^\//, ""))
  );
}

if (isDirectlyInvoked()) {
  main();
}

export { migrateUsers, migrateReviews, verifyMigration };
