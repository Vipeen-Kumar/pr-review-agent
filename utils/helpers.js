import { randomBytes } from "node:crypto";

function createId(prefix) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function parseGitHubPullUrl(prUrl) {
  try {
    const url = new URL(prUrl);
    if (url.hostname !== "github.com") {
      return null;
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 4 || parts[2] !== "pull") {
      return null;
    }

    const pullNumber = Number(parts[3]);
    if (!pullNumber) {
      return null;
    }

    return {
      owner: parts[0],
      repo: parts[1],
      pullNumber,
    };
  } catch {
    return null;
  }
}

function summarizeGithubFiles(files) {
  return files
    .slice(0, 12)
    .map((file) => {
      const patchPreview = (file.patch || "").slice(0, 1200);
      return [
        `File: ${file.filename}`,
        `Status: ${file.status}`,
        `Additions: ${file.additions}, Deletions: ${file.deletions}`,
        patchPreview ? `Patch:\n${patchPreview}` : "Patch: Not available",
      ].join("\n");
    })
    .join("\n\n");
}

function extractReviewMeta(review, input) {
  const ratingMatch = review.match(/## Rating\s+(.+)/i);
  const summaryMatch = review.match(/## Summary\s+([\s\S]*?)(?:##|$)/i);

  return {
    rating: ratingMatch ? ratingMatch[1].trim() : "No rating",
    summary: summaryMatch
      ? summaryMatch[1].trim().replace(/\s+/g, " ").slice(0, 180)
      : "Saved review",
    label:
      input.prUrl ||
      input.issueUrl ||
      input.prText.split("\n").find(Boolean) ||
      "PR review",
  };
}

function mergeGitHubIntoInput(input, githubPr) {
  return {
    ...input,
    prText: [
      githubPr.title ? `GitHub PR Title:\n${githubPr.title}` : "",
      githubPr.body ? `GitHub PR Description:\n${githubPr.body}` : "",
      githubPr.filesSummary ? `GitHub Changed Files:\n${githubPr.filesSummary}` : "",
      input.prText ? `User PR Notes:\n${input.prText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

export {
  createId,
  parseGitHubPullUrl,
  summarizeGithubFiles,
  extractReviewMeta,
  mergeGitHubIntoInput,
};
