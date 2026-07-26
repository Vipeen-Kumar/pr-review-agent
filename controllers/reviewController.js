import { readRequestBody } from "../utils/http.js";
import { getAuthenticatedUser } from "../utils/session.js";
import * as reviewService from "../services/reviewService.js";
import { ok, badRequest, unauthorized } from "../utils/response.js";
import { validateReview } from "../utils/validators.js";
import { info, error as logError } from "../utils/logger.js";

/**
 * Review Controller
 * 
 * Handles HTTP review generation requests.
 * Receives request, reads body, calls review service, sends response.
 * NO business logic - all orchestration happens in reviewService.
 */

async function generateReview(request, response) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    unauthorized(response, "Please log in to create and save reviews.");
    return;
  }

  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const validated = validateReview(body);
    
    info("Review generation started", { userId: user.id, prUrl: validated.prUrl });
    const result = await reviewService.generateAndSaveReview(user.id, validated);
    
    info("Review generated successfully", { userId: user.id, reviewId: result.reviewRecord?.id });
    ok(response, result);
  } catch (err) {
    logError("Review generation failed", err);
    badRequest(response, err.message || "Unable to review this submission.");
  }
}

export {
  generateReview,
};
