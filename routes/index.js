import { handleAuthRoutes } from "./authRoutes.js";
import { handleReviewRoutes } from "./reviewRoutes.js";
import { handleGitHubRoutes } from "./githubRoutes.js";
import { handlePageRoutes } from "./pageRoutes.js";

/**
 * Router
 *
 * Central request router.
 * Delegates requests to specific route modules in order.
 * Each route module returns true if it handled the request, false otherwise.
 *
 * Route handling order:
 * 1. Auth routes (specific paths)
 * 2. Review routes (specific paths)
 * 3. GitHub routes (specific paths)
 * 4. Page routes (catch-all for GET requests)
 */

async function handleRoutes(request, response, url) {
  const pathname = url.pathname;

  // Try auth routes first
  if (await handleAuthRoutes(request, response, pathname, url)) {
    return true;
  }

  // Try review routes
  if (await handleReviewRoutes(request, response, pathname)) {
    return true;
  }

  // Try GitHub routes
  if (await handleGitHubRoutes(request, response, pathname)) {
    return true;
  }

  // Try page routes (catch-all for GET requests)
  if (await handlePageRoutes(request, response, pathname)) {
    return true;
  }

  // No route matched
  return false;
}

export { handleRoutes };
