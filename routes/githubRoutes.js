import * as githubController from "../controllers/githubController.js";

/**
 * GitHub Routes
 *
 * Handles all GitHub-related requests.
 * Determines if a request is a GitHub request and delegates to githubController.
 *
 * Routes:
 * - POST /api/github/fetch-pr
 */

async function handleGitHubRoutes(request, response, pathname) {
  const method = request.method;

  if (method === "POST" && pathname === "/api/github/fetch-pr") {
    await githubController.fetchPullRequest(request, response);
    return true;
  }

  return false;
}

export { handleGitHubRoutes };
