import { readStore, writeStore } from "../storage/store.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createId, sanitizeUser } from "../utils/helpers.js";

/**
 * Auth Service
 * 
 * Handles all user authentication and account management logic.
 * Does not know about HTTP requests or responses.
 * Returns plain objects or throws errors.
 */

async function findUserByEmail(email) {
  const store = await readStore();
  return store.users.find((user) => user.email === email.toLowerCase()) || null;
}

async function findUserById(userId) {
  const store = await readStore();
  return store.users.find((user) => user.id === userId) || null;
}

async function createUser(name, email, password) {
  const trimmedName = (name || "").trim();
  const trimmedEmail = (email || "").trim().toLowerCase();
  const trimmedPassword = password || "";

  if (!trimmedName || !trimmedEmail || !trimmedPassword) {
    throw new Error("Name, email, and password are required.");
  }

  const existing = await findUserByEmail(trimmedEmail);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const user = {
    id: createId("user"),
    name: trimmedName,
    email: trimmedEmail,
    passwordHash: hashPassword(trimmedPassword),
    authProvider: "email",
    avatarUrl: "",
    createdAt: new Date().toISOString(),
  };

  const store = await readStore();
  store.users.push(user);
  await writeStore(store);

  return sanitizeUser(user);
}

async function verifyUser(email, password) {
  const trimmedEmail = (email || "").trim().toLowerCase();
  const trimmedPassword = password || "";

  const user = await findUserByEmail(trimmedEmail);

  if (!user || user.authProvider !== "email" || !verifyPassword(trimmedPassword, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  return sanitizeUser(user);
}

async function findOrCreateGoogleUser(auth0User) {
  const store = await readStore();
  let user = store.users.find(
    (entry) => entry.auth0Sub === auth0User.sub || entry.email === auth0User.email,
  );

  if (!user) {
    user = {
      id: createId("user"),
      name: auth0User.name || auth0User.email,
      email: auth0User.email,
      authProvider: "google",
      avatarUrl: auth0User.picture || "",
      auth0Sub: auth0User.sub,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
  } else {
    user.name = auth0User.name || user.name;
    user.avatarUrl = auth0User.picture || user.avatarUrl || "";
    user.auth0Sub = auth0User.sub || user.auth0Sub;
    user.authProvider = "google";
  }

  await writeStore(store);
  return sanitizeUser(user);
}

async function getUserReviews(userId) {
  const store = await readStore();
  return store.reviews
    .filter((review) => review.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export {
  findUserByEmail,
  findUserById,
  createUser,
  verifyUser,
  findOrCreateGoogleUser,
  getUserReviews,
};
