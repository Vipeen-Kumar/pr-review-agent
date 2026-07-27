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

async function generateAndSaveReview(userId, body) {
  const input = buildReviewInput(body);

  let githubPr = null;
  if (body.fetchFromGitHub && input.prUrl) {
    githubPr = await fetchPullRequest(input.prUrl);
  }

  const reviewInput = githubPr ? mergeGitHubIntoInput(input, githubPr) : input;
  const review = await generateReview(reviewInput);

  let githubComment = null;
  if (body.postComment && input.prUrl) {
    githubComment = await postComment(
      input.prUrl,
      `## Automated PR Review\n\n${review}`,
    );
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
