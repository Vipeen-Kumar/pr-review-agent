import { sendJson, readRequestBody } from "../utils/http.js";
import { getAuthenticatedUser } from "../utils/session.js";
import * as githubService from "../services/githubService.js";

/**
 * GitHub Controller
 * 
 * Handles HTTP GitHub pull request fetch requests.
 * Receives request, reads body, calls GitHub service, sends response.
 * NO business logic - all GitHub operations in githubService.
 */

async function fetchPullRequest(request, response) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    sendJson(response, 401, { error: "Please log in to fetch pull requests." });
    return;
  }

  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const githubPr = await githubService.fetchPullRequest(body.prUrl || "");
    sendJson(response, 200, { githubPr });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Unable to fetch this PR." });
  }
}

export {
  fetchPullRequest,
};
