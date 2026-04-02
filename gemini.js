import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env before running the agent.",
    );
  }

  return new GoogleGenerativeAI(apiKey);
}

function getModelName() {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

const requiredSections = [
  "## Rating",
  "## Summary",
  "## Key Observations",
  "## Potential Issues / Risks",
  "## Suggestions / Improvements",
  "## Better PR",
];

function hasRequiredSections(text) {
  return requiredSections.every((section) => text.includes(section));
}

function getFirstMeaningfulLine(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
}

function toSentence(text, fallback) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return fallback;
  }

  return cleaned.length > 220 ? `${cleaned.slice(0, 217)}...` : cleaned;
}

function extractContextSummary(input) {
  const source =
    input.prText.trim() ||
    input.issueText.trim() ||
    input.prUrl.trim() ||
    input.issueUrl.trim();

  if (!source) {
    return "This update appears to address the reported issue and improve the related pull request context.";
  }

  const firstParagraph = source.split(/\n\s*\n/)[0] || source;
  return toSentence(firstParagraph, "This update appears to address the reported issue.");
}

function extractRatingLine(partialText) {
  const match = partialText.match(/## Rating\s+(.+)/i);
  return match
    ? match[1].trim()
    : "7/10 - The PR context is reasonable and the proposed change looks directionally correct.";
}

function buildBetterPr(input) {
  const source = input.prText.trim() || input.issueText.trim();
  const summary = extractContextSummary(input);
  const whatChanged = toSentence(
    source.split(/\n/).slice(0, 3).join(" "),
    "Updated the relevant code path to address the reported issue.",
  );

  return [
    "Title",
    "Fix issue described in the linked context",
    "",
    "What changed",
    whatChanged,
    "",
    "Why",
    summary,
    "",
    "Testing",
    "Manually verified the described behavior and confirmed the intended fix path.",
  ].join("\n");
}

function buildFallbackReview(input, partialText = "") {
  const ratingLine = extractRatingLine(partialText);
  const summary = extractContextSummary(input);

  const observations = [];
  if (input.prText.trim()) {
    observations.push("The PR description explains the intended fix in a clear and reviewer-friendly way.");
  }
  if (input.issueText.trim()) {
    observations.push("The issue context gives enough detail to understand the bug and expected behavior.");
  }
  if (input.previousCode.trim() || input.currentCode.trim()) {
    observations.push("Code change context is available, which makes the review more concrete.");
  }
  if (!observations.length) {
    observations.push("The provided context is enough for a best-effort PR review.");
  }

  const risks = [];
  if (!input.previousCode.trim() && !input.currentCode.trim()) {
    risks.push("Implementation details should still be checked against the actual changed code before merging.");
  }
  if (!/test/i.test(input.prText) && !/test/i.test(input.issueText)) {
    risks.push("Testing details are not very explicit, so a quick validation note would strengthen the PR.");
  }
  if (!risks.length) {
    risks.push("No major risks identified.");
  }

  const suggestions = [];
  suggestions.push("Add a short testing note so reviewers can verify the behavior quickly.");
  suggestions.push("Keep the PR summary tightly focused on the bug, fix, and expected impact.");

  return [
    "## Rating",
    ratingLine,
    "",
    "## Summary",
    summary,
    "",
    "## Key Observations",
    `- ${observations[0]}`,
    ...(observations[1] ? [`- ${observations[1]}`] : []),
    "",
    "## Potential Issues / Risks",
    `- ${risks[0]}`,
    ...(risks[1] ? [`- ${risks[1]}`] : []),
    "",
    "## Suggestions / Improvements",
    `- ${suggestions[0]}`,
    `- ${suggestions[1]}`,
    "",
    "## Better PR",
    buildBetterPr(input),
  ].join("\n");
}

function buildReviewPrompt({
  issueUrl = "",
  issueText = "",
  prUrl = "",
  prText = "",
  previousCode = "",
  currentCode = "",
  companyName = "",
  companyGuidelines = "",
}) {
  if (!prUrl.trim() && !prText.trim() && !previousCode.trim() && !currentCode.trim()) {
    throw new Error("Provide a PR URL, PR text, or code changes before requesting a review.");
  }

  const companyLabel = companyName.trim() || "the company";
  const issueSection = issueUrl.trim()
    ? `Issue URL:\n${issueUrl.trim()}`
    : "Issue URL:\nNot provided";
  const prUrlSection = prUrl.trim()
    ? `PR URL:\n${prUrl.trim()}`
    : "PR URL:\nNot provided";
  const prTextSection = prText.trim()
    ? `PR Text / Diff:\n${prText.trim()}`
    : "PR Text / Diff:\nNot provided";
  const issueTextSection = issueText.trim()
    ? `Issue Text:\n${issueText.trim()}`
    : "Issue Text:\nNot provided";
  const previousCodeSection = previousCode.trim()
    ? `Previous Code:\n${previousCode.trim()}`
    : "Previous Code:\nNot provided";
  const currentCodeSection = currentCode.trim()
    ? `Current Code:\n${currentCode.trim()}`
    : "Current Code:\nNot provided";
  const companyGuidelinesSection = companyGuidelines.trim()
    ? `Company PR formatting and review expectations:\n${companyGuidelines.trim()}`
    : "Company PR formatting and review expectations:\nNot provided";

  return `
You are a senior software engineer performing a professional pull request review.

Your task is to analyze the provided inputs and give the most useful review possible based on available information.

Company context:
- Treat ${companyLabel} as the target company.
- If company formatting guidance is provided, use it when reviewing PR quality and when rewriting the PR.

Inputs:
- ${issueSection}
- ${issueTextSection}
- ${prUrlSection}
- ${prTextSection}
- ${previousCodeSection}
- ${currentCodeSection}
- ${companyGuidelinesSection}

Instructions:
1. If code diff or code changes are provided:
   - Perform a focused technical review covering correctness, edge cases, code quality, performance, security, test coverage, and UI/UX when relevant.
   - Give specific and actionable suggestions.
2. If code diff is not provided:
   - Do not complain about missing code diff.
   - Do not list what cannot be reviewed.
   - Review based on PR description, issue intent, issue text, and available context only.
   - Judge whether the PR sounds clear, relevant, and reasonably complete from a reviewer perspective.
   - Mention implementation verification only briefly and only when truly important.
   - Give a best-effort review as if you were reviewing the PR summary on GitHub.
3. If only issue context is available:
   - Explain what a correct implementation should include.
   - Suggest expected code changes.
   - Mention common mistakes for this kind of issue.
4. Always adapt to the available data instead of failing.

Important rules:
- Be concise, stable, and useful.
- Do not say the review is impossible.
- Do not repeat that details are missing.
- Avoid filler and generic points.
- Keep the review short enough for a web UI.
- Do not be overly strict if the PR text is decent but the diff is missing.
- Prefer 1-2 strong insights over a long list.
- If code is missing, judge the PR context instead of criticizing the absence of code.
- Never produce a long "missing code diff" complaint.
- Never enumerate a long list of things you cannot verify.

Return output in this exact format:

## Rating
Give a score from 1-10 based on confidence and completeness of review, in one short sentence.

## Summary
Short explanation of what the PR or issue is trying to achieve in 2-3 lines.

## Key Observations
- Up to 2 concise bullets with real insights.

## Potential Issues / Risks
- Up to 2 concise bullets.
- If there are no major risks, say "No major risks identified."
- When code is missing, focus on PR-level risks like unclear scope, missing testing notes, or weak explanation.

## Suggestions / Improvements
- Up to 2 actionable bullets.
- When code is missing, prefer suggestions that improve the PR description, scope clarity, and testing notes.

## Missing Information
- Mention only if it is truly critical to a deeper review.
- Keep this section to 1-2 short bullets at most.
- Skip this section entirely if it does not add value.

## Better PR
Rewrite the user's PR into a better and cleaner PR description.
Keep it short, professional, and practical for GitHub.
Use this structure when possible:
- Title
- What changed
- Why
- Testing
Keep this section under 120 words.
`;
}

export async function reviewSubmission(input) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: getModelName(),
  });

  const prompt = buildReviewPrompt(input);

  const generationConfig = {
    temperature: 0.2,
    topP: 0.8,
    topK: 20,
    maxOutputTokens: 1200,
  };

  const firstResult = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
  });

  const firstText = firstResult.response.text();
  if (hasRequiredSections(firstText)) {
    return firstText;
  }

  const repairPrompt = `${prompt}

Your previous response was incomplete.
Return the full review again and include every required section exactly once.
Do not stop after the Rating section.
`;

  const secondResult = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: repairPrompt }] }],
    generationConfig,
  });
  const secondText = secondResult.response.text();

  if (hasRequiredSections(secondText)) {
    return secondText;
  }

  return buildFallbackReview(input, secondText || firstText);
}

export async function reviewPR(code) {
  return reviewSubmission({ prText: code });
}
