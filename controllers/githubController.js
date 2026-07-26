import { readRequestBody } from "../utils/http.js";
import { getAuthenticatedUser } from "../utils/session.js";
import * as githubService from "../services/githubService.js";
import { ok, badRequest, unauthorized } from "../utils/response.js";
import { validateGitHubUrl } from "../utils/validators.js";
import { info, error as logError } from "../utils/logger.js";

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
    unauthorized(response, "Please log in to fetch pull requests.");
    return;
  }

  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const parsed = validateGitHubUrl(body.prUrl || "");
    
    info("Fetching GitHub PR", { userId: user.id, owner: parsed.owner, repo: parsed.repo, pr: parsed.pullNumber });
    const githubPr = await githubService.fetchPullRequest(body.prUrl || "");
    
    info("GitHub PR fetched successfully", { userId: user.id });
    ok(response, { githubPr });
  } catch (err) {
    logError("GitHub PR fetch failed", err);
    badRequest(response, err.message || "Unable to fetch this PR.");
  }
}

export {
  fetchPullRequest,
};
