import * as reviewRepository from "../repositories/reviewRepository.js";
import { createId, extractReviewMeta, mergeGitHubIntoInput } from "../utils/helpers.js";
import { fetchPullRequest, postComment } from "./githubService.js";
import { generateReview } from "./geminiService.js";

/**
 * Review Service
 * 
 * Orchestrates the review generation process.
 * Coordinates between GitHub, Gemini, and repository layers.
 * Does not know about HTTP requests or responses.
 */

function buildReviewInput(body) {
  return {
    issueUrl: body.issueUrl || "",
    issueText: body.issueText || "",
    prUrl: body.prUrl || "",
    prText: body.prText || "",
    previousCode: body.previousCode || "",
    currentCode: body.currentCode || "",
    companyName: body.companyName || "",
    companyGuidelines: body.companyGuidelines || "",
  };
}

async function generateAndSaveReview(userId, body, user = null) {
  const input = buildReviewInput(body);

  let githubPr = null;
  if (body.fetchFromGitHub && input.prUrl) {
    githubPr = await fetchPullRequest(input.prUrl);
  }

  const reviewInput = githubPr ? mergeGitHubIntoInput(input, githubPr) : input;
  const review = await generateReview(reviewInput);

  let githubComment = null;
  if (body.postComment && input.prUrl) {
    const userInfo = user ? `${user.name} (${user.email})` : "Unknown User";
    const attributionMessage = `## Automated PR Review

${review}

---

**ℹ️ About this review:**
This AI-generated response was created by user: **${userInfo}**

This review is from the PR Review Agent, a project created by **Vipeen Kumar**.

- **GitHub:** https://github.com/Vipeen-Kumar
- **Website:** Coming live soon
- **Contact:** vipeenk023@gmail.com

*For feedback or issues, please reach out to the creator.*`;

    githubComment = await postComment(input.prUrl, attributionMessage);
  }

  const meta = extractReviewMeta(review, input);
  const record = {
    id: createId("review"),
    userId,
    createdAt: new Date().toISOString(),
    input,
    review,
    meta,
    githubPr: githubPr
      ? {
          title: githubPr.title,
          author: githubPr.author,
          changedFiles: githubPr.changedFiles,
          additions: githubPr.additions,
          deletions: githubPr.deletions,
          headBranch: githubPr.headBranch,
          baseBranch: githubPr.baseBranch,
          htmlUrl: githubPr.htmlUrl,
        }
      : null,
    githubCommentUrl: githubComment?.html_url || "",
  };

  await reviewRepository.saveReview(record);

  return {
    review,
    reviewRecord: record,
    githubPr: record.githubPr,
    githubCommentUrl: record.githubCommentUrl,
  };
}

export {
  generateAndSaveReview,
};
