import mongoose from "mongoose";
import { info, error as logError } from "../utils/logger.js";

/**
 * Database Configuration & Connection
 * 
 * Handles MongoDB connection lifecycle.
 * Ensures connection is established before server starts.
 * Handles connection errors gracefully.
 */

async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      logError("MONGODB_URI not configured", new Error("Set MONGODB_URI in .env"));
      process.exit(1);
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    info("MongoDB connected successfully");
    return mongoose.connection;
  } catch (err) {
    logError("MongoDB connection failed", err);
    process.exit(1);
  }
}

async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    info("MongoDB disconnected");
  } catch (err) {
    logError("MongoDB disconnection error", err);
  }
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

export { connectDatabase, disconnectDatabase, isConnected };
