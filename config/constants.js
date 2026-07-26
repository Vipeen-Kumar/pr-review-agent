/**
 * Application Constants
 *
 * Centralized constants used throughout the application.
 * Makes it easy to adjust behavior without changing code.
 */

// HTTP Methods
const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Content Types
const CONTENT_TYPE = {
  JSON: "application/json; charset=utf-8",
  HTML: "text/html; charset=utf-8",
  CSS: "text/css; charset=utf-8",
  JAVASCRIPT: "application/javascript; charset=utf-8",
  TEXT: "text/plain; charset=utf-8",
};

// Cookie Configuration
const COOKIE_CONFIG = {
  SESSION_NAME: "pr_review_session",
  MAX_AGE: 604800, // 7 days in seconds
  PATH: "/",
  SAME_SITE: "Lax",
  HTTP_ONLY: true,
};

// Auth Provider Types
const AUTH_PROVIDER = {
  EMAIL: "email",
  GOOGLE: "google",
};

// Validation Constraints
const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MIN_NAME_LENGTH: 2,
  MIN_EMAIL_LENGTH: 3,
};

// Session State Duration
const SESSION_STATE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

// API Response Defaults
const RESPONSE_DEFAULTS = {
  REVIEW_TIMEOUT: 30000, // 30 seconds
  GITHUB_TIMEOUT: 10000, // 10 seconds
};

export {
  HTTP_METHODS,
  HTTP_STATUS,
  CONTENT_TYPE,
  COOKIE_CONFIG,
  AUTH_PROVIDER,
  VALIDATION,
  SESSION_STATE_DURATION,
  RESPONSE_DEFAULTS,
};
