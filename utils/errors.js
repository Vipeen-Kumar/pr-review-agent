/**
 * Error Classes
 *
 * Centralized error definitions for the application.
 * Each error class represents a specific failure scenario.
 * Controllers can catch these and respond appropriately.
 *
 * Base Error:
 * - status: HTTP status code
 * - message: user-friendly error message
 * - details: optional additional information
 */

class ApplicationError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApplicationError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

class AuthenticationError extends ApplicationError {
  constructor(message = "Authentication required", details = null) {
    super(message, 401, details);
  }
}

class AuthorizationError extends ApplicationError {
  constructor(message = "Access denied", details = null) {
    super(message, 403, details);
  }
}

class NotFoundError extends ApplicationError {
  constructor(message = "Resource not found", details = null) {
    super(message, 404, details);
  }
}

class ConflictError extends ApplicationError {
  constructor(message, details = null) {
    super(message, 409, details);
  }
}

class GitHubError extends ApplicationError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

class GeminiError extends ApplicationError {
  constructor(message, details = null) {
    super(message, 500, details);
  }
}

class ConfigurationError extends ApplicationError {
  constructor(message, details = null) {
    super(message, 500, details);
  }
}

class ServerError extends ApplicationError {
  constructor(message = "Internal server error", details = null) {
    super(message, 500, details);
  }
}

export {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  GitHubError,
  GeminiError,
  ConfigurationError,
  ServerError,
};
