import * as userRepository from "../repositories/userRepository.js";
import * as reviewRepository from "../repositories/reviewRepository.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createId, sanitizeUser } from "../utils/helpers.js";

/**
 * Auth Service
 * 
 * Handles all user authentication and account management logic.
 * Orchestrates repository calls with business logic.
 * Does not know about HTTP requests or responses.
 * Returns plain objects or throws errors.
 */

async function findUserByEmail(email) {
  return userRepository.findUserByEmail(email);
}

async function findUserById(userId) {
  return userRepository.findUserById(userId);
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

  await userRepository.createUser(user);
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
  let user = await userRepository.findUserByEmail(auth0User.email);

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
    await userRepository.createUser(user);
  } else {
    const updates = {
      name: auth0User.name || user.name,
      avatarUrl: auth0User.picture || user.avatarUrl || "",
      auth0Sub: auth0User.sub || user.auth0Sub,
      authProvider: "google",
    };
    user = await userRepository.updateUser(user.id, updates);
  }

  return sanitizeUser(user);
}

async function getUserReviews(userId) {
  return reviewRepository.findReviewsByUserId(userId);
}

export {
  findUserByEmail,
  findUserById,
  createUser,
  verifyUser,
  findOrCreateGoogleUser,
  getUserReviews,
}
