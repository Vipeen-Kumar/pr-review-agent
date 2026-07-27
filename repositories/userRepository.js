import { readStore, writeStore } from "../storage/store.js";

/**
 * User Repository
 * 
 * Handles all user-related persistence operations.
 * Pure CRUD layer - no business logic.
 * Data access abstraction for users collection.
 */

async function findUserByEmail(email) {
  const store = await readStore();
  return store.users.find((user) => user.email === email.toLowerCase()) || null;
}

async function findUserById(userId) {
  const store = await readStore();
  return store.users.find((user) => user.id === userId) || null;
}

async function createUser(user) {
  const store = await readStore();
  store.users.push(user);
  await writeStore(store);
  return user;
}

async function updateUser(userId, updates) {
  const store = await readStore();
  const userIndex = store.users.findIndex((user) => user.id === userId);
  
  if (userIndex === -1) {
    return null;
  }

  const updatedUser = {
    ...store.users[userIndex],
    ...updates,
  };

  store.users[userIndex] = updatedUser;
  await writeStore(store);
  return updatedUser;
}

async function listUsers() {
  const store = await readStore();
  return store.users;
}

export {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  listUsers,
};
