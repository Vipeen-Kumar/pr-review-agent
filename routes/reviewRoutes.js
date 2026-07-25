import * as reviewController from "../controllers/reviewController.js";

/**
 * Review Routes
 *
 * Handles all review-related requests.
 * Determines if a request is a review request and delegates to reviewController.
 *
 * Routes:
 * - POST /api/review
 */

async function handleReviewRoutes(request, response, pathname) {
  const method = request.method;

  if (method === "POST" && pathname === "/api/review") {
    await reviewController.generateReview(request, response);
    return true;
  }

  return false;
}

export { handleReviewRoutes };
