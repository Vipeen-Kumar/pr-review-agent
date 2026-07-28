import mongoose from "mongoose";

/**
 * User Schema
 * 
 * Represents application users.
 * Stores authentication credentials and profile information.
 * Enforces data consistency through validation.
 */

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      description: "Application-generated ID (e.g., user_xxxxx)",
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      default: null,
      description: "Only set for email/password auth provider",
    },
    authProvider: {
      type: String,
      required: true,
      enum: ["email", "google"],
      default: "email",
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    auth0Sub: {
      type: String,
      default: null,
      sparse: true,
      unique: true,
      index: true,
      description: "Auth0 subject ID (only for Google OAuth)",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "users",
    strict: true,
  }
);

// Update updatedAt before saving
userSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

userSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
