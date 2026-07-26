import { ApplicationError } from "./errors.js";
import { error as logError, warn as logWarn } from "./logger.js";

/**
 * Async Handler Wrapper
 *
 * Higher-order function that wraps async controller functions.
 * Automatically catches errors and sends appropriate responses.
 * Eliminates repetitive try-catch blocks in controllers.
 *
 * Usage:
 *   async function myHandler(req, res) {
 *     // Implementation
 *   }
 *   export const wrapped = asyncHandler(myHandler);
 */

function asyncHandler(fn) {
  return async (request, response, ...args) => {
    try {
      await fn(request, response, ...args);
    } catch (err) {
      // Log the error
      logError("Async handler caught error", err);

      // Handle known application errors
      if (err instanceof ApplicationError) {
        response.writeHead(err.status, {
          "Content-Type": "application/json; charset=utf-8",
        });
        response.end(JSON.stringify({ error: err.message }));
        return;
      }

      // Handle JSON parse errors
      if (err instanceof SyntaxError) {
        logWarn("JSON parse error", err.message);
        response.writeHead(400, {
          "Content-Type": "application/json; charset=utf-8",
        });
        response.end(JSON.stringify({ error: "Invalid request body" }));
        return;
      }

      // Handle unexpected errors
      logError("Unexpected error in async handler", err);
      response.writeHead(500, {
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify({ error: "Internal server error" }));
    }
  };
}

export { asyncHandler };
