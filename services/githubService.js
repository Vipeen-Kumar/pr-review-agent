import { parseGitHubPullUrl, summarizeGithubFiles } from "../utils/helpers.js";

/**
 * GitHub Service
 * 
 * Handles all GitHub API interactions and PR-related operations.
 * Encapsulates GitHub integration logic.
 * Does not know about HTTP requests or responses.
 */

const githubToken = process.env.GITHUB_TOKEN || "";

async function githubRequest(pathname, options = {}) {
  if (!githubToken) {
    throw new Error("GitHub integration is not configured. Add GITHUB_TOKEN to .env.");
  }

  const response = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "User-Agent": "pr-review-agent",
      ...(options.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "GitHub API request failed.");
  }

  return data;
}

async function fetchPullRequest(prUrl) {
  const parsed = parseGitHubPullUrl(prUrl);
  if (!parsed) {
    throw new Error("Enter a valid GitHub pull request URL.");
  }

  const pr = await githubRequest(
    `/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pullNumber}`,
  );
  const files = await githubRequest(
    `/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pullNumber}/files`,
  );

  return {
    owner: parsed.owner,
    repo: parsed.repo,
    pullNumber: parsed.pullNumber,
    title: pr.title || "",
    body: pr.body || "",
    state: pr.state || "",
    draft: Boolean(pr.draft),
    author: pr.user?.login || "",
    headBranch: pr.head?.ref || "",
    baseBranch: pr.base?.ref || "",
    changedFiles: pr.changed_files || files.length,
    additions: pr.additions || 0,
    deletions: pr.deletions || 0,
    files,
    filesSummary: summarizeGithubFiles(files),
    htmlUrl: pr.html_url || prUrl,
  };
}

async function postComment(prUrl, body) {
  const parsed = parseGitHubPullUrl(prUrl);
  if (!parsed) {
    throw new Error("A valid GitHub PR URL is required to post a comment.");
  }

  return githubRequest(
    `/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.pullNumber}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    },
  );
}

function isGitHubConfigured() {
  return Boolean(githubToken);
}

export {
  fetchPullRequest,
  postComment,
  isGitHubConfigured,
};
