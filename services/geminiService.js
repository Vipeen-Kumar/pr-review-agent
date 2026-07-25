import { reviewSubmission, reviewPR } from "../gemini.js";

/**
 * Gemini Service
 * 
 * Wraps the Gemini API integration for PR reviews.
 * Provides a service-level interface to the Gemini module.
 * Does not modify Gemini behavior or prompts.
 */

async function generateReview(input) {
  return reviewSubmission(input);
}

async function generateCodeReview(code) {
  return reviewPR(code);
}

export {
  generateReview,
  generateCodeReview,
};
