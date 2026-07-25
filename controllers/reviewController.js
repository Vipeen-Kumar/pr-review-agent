import { sendJson, readRequestBody } from "../utils/http.js";
import { getAuthenticatedUser } from "../utils/session.js";
import * as reviewService from "../services/reviewService.js";

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
    sendJson(response, 401, { error: "Please log in to create and save reviews." });
    return;
  }

  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const result = await reviewService.generateAndSaveReview(user.id, body);
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Unable to review this submission." });
  }
}

export {
  generateReview,
};
