import * as authController from "../controllers/authController.js";

/**
 * Auth Routes
 *
 * Handles all authentication-related requests.
 * Determines if a request is an auth request and delegates to authController.
 *
 * Routes:
 * - GET /api/me
 * - POST /api/signup
 * - POST /api/login
 * - POST /api/logout
 * - GET /auth/google/start
 * - GET /auth/auth0/callback
 */

async function handleAuthRoutes(request, response, pathname, url) {
  const method = request.method;

  if (method === "GET" && pathname === "/api/me") {
    await authController.getMe(request, response);
    return true;
  }

  if (method === "POST" && pathname === "/api/signup") {
    await authController.signup(request, response);
    return true;
  }

  if (method === "POST" && pathname === "/api/login") {
    await authController.login(request, response);
    return true;
  }

  if (method === "POST" && pathname === "/api/logout") {
    authController.logout(response);
    return true;
  }

  if (method === "GET" && pathname === "/auth/google/start") {
    authController.googleStart(response);
    return true;
  }

  if (method === "GET" && pathname === "/auth/auth0/callback") {
    await authController.googleCallback(request, response, url);
    return true;
  }

  return false;
}

export { handleAuthRoutes };
