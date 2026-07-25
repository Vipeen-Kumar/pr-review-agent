import * as pageController from "../controllers/pageController.js";

/**
 * Page Routes
 *
 * Handles all static file requests.
 * Determines if a request is for a static file and delegates to pageController.
 *
 * Routes:
 * - GET * (all GET requests for static files)
 */

async function handlePageRoutes(request, response, pathname) {
  const method = request.method;

  if (method === "GET") {
    await pageController.serveStaticFile(pathname, response);
    return true;
  }

  return false;
}

export { handlePageRoutes };
