import User from "../models/User.js";

/**
 * User Repository
 * 
 * Handles all user-related persistence operations.
 * Pure CRUD layer - no business logic.
 * Data access abstraction for users collection.
 * Uses Mongoose for MongoDB operations.
 */

async function findUserByEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  return user || null;
}

async function findUserById(userId) {
  const user = await User.findOne({ id: userId }).lean();
  return user || null;
}

async function createUser(user) {
  const newUser = new User(user);
  const saved = await newUser.save();
  return saved.toObject();
}

async function updateUser(userId, updates) {
  const updated = await User.findOneAndUpdate(
    { id: userId },
    updates,
    { new: true, runValidators: true }
  ).lean();
  return updated || null;
}

async function listUsers() {
  const users = await User.find({}).lean();
  return users;
}

export {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  listUsers,
};
