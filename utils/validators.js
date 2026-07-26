import { ValidationError } from "./errors.js";
import { parseGitHubPullUrl } from "./helpers.js";

/**
 * Request Validators
 *
 * Centralized validation functions for request inputs.
 * Each validator checks a specific request type and throws ValidationError if invalid.
 * Controllers call these to ensure data quality before processing.
 */

function validateEmail(email) {
  const trimmed = (email || "").trim().toLowerCase();
  if (!trimmed || trimmed.length < 3 || !trimmed.includes("@")) {
    throw new ValidationError("Please enter a valid email address.");
  }
  return trimmed;
}

function validatePassword(password) {
  if (!password || typeof password !== "string" || password.length < 6) {
    throw new ValidationError("Password must be at least 6 characters long.");
  }
  return password;
}

function validateName(name) {
  const trimmed = (name || "").trim();
  if (!trimmed || trimmed.length < 2) {
    throw new ValidationError("Name must be at least 2 characters long.");
  }
  return trimmed;
}

function validateSignup(body) {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body is required.");
  }

  const name = validateName(body.name);
  const email = validateEmail(body.email);
  const password = validatePassword(body.password);

  return { name, email, password };
}

function validateLogin(body) {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body is required.");
  }

  const email = validateEmail(body.email);
  const password = body.password || "";

  if (!password) {
    throw new ValidationError("Password is required.");
  }

  return { email, password };
}

function validateReview(body) {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body is required.");
  }

  const prUrl = (body.prUrl || "").trim();
  const issueUrl = (body.issueUrl || "").trim();
  const companyName = (body.companyName || "").trim();

  if (!prUrl && !issueUrl) {
    throw new ValidationError("Please provide either a PR URL or issue URL.");
  }

  return {
    companyName: companyName || "Not specified",
    issueUrl,
    prUrl,
    fetchFromGitHub: Boolean(body.fetchFromGitHub),
    postComment: Boolean(body.postComment),
  };
}

function validateGitHubUrl(prUrl) {
  if (!prUrl || typeof prUrl !== "string") {
    throw new ValidationError("Pull request URL is required.");
  }

  const parsed = parseGitHubPullUrl(prUrl.trim());
  if (!parsed) {
    throw new ValidationError("Enter a valid GitHub pull request URL.");
  }

  return parsed;
}

export {
  validateEmail,
  validatePassword,
  validateName,
  validateSignup,
  validateLogin,
  validateReview,
  validateGitHubUrl,
};
