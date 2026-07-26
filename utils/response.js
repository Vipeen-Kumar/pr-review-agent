import { HTTP_STATUS, CONTENT_TYPE } from "../config/constants.js";

/**
 * Central HTTP Response Helpers
 *
 * Provides consistent response formatting across the application.
 * Controllers use these instead of manually calling response.writeHead/end.
 * Ensures uniform response structure and headers.
 */

function sendJsonResponse(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": CONTENT_TYPE.JSON,
  });
  response.end(JSON.stringify(data));
}

function ok(response, data = null) {
  sendJsonResponse(response, HTTP_STATUS.OK, data || { success: true });
}

function created(response, data) {
  sendJsonResponse(response, HTTP_STATUS.CREATED, data);
}

function badRequest(response, error) {
  sendJsonResponse(response, HTTP_STATUS.BAD_REQUEST, {
    error: error instanceof Error ? error.message : error,
  });
}

function unauthorized(response, error = "Authentication required") {
  sendJsonResponse(response, HTTP_STATUS.UNAUTHORIZED, {
    error: error instanceof Error ? error.message : error,
  });
}

function forbidden(response, error = "Access denied") {
  sendJsonResponse(response, HTTP_STATUS.FORBIDDEN, {
    error: error instanceof Error ? error.message : error,
  });
}

function notFound(response, error = "Not found") {
  sendJsonResponse(response, HTTP_STATUS.NOT_FOUND, {
    error: error instanceof Error ? error.message : error,
  });
}

function conflict(response, error) {
  sendJsonResponse(response, HTTP_STATUS.CONFLICT, {
    error: error instanceof Error ? error.message : error,
  });
}

function serverError(response, error = "Internal server error") {
  sendJsonResponse(response, HTTP_STATUS.INTERNAL_SERVER_ERROR, {
    error: error instanceof Error ? error.message : error,
  });
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function methodNotAllowed(response) {
  response.writeHead(HTTP_STATUS.OK, {
    "Content-Type": CONTENT_TYPE.TEXT,
  });
  response.end("Method not allowed");
}

export {
  sendJsonResponse,
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
  redirect,
  methodNotAllowed,
};
