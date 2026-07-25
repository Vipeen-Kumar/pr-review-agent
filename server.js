import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { randomBytes } from "node:crypto";
import { reviewSubmission } from "./gemini.js";
import { readStore, writeStore } from "./storage/store.js";
import { hashPassword, verifyPassword } from "./utils/password.js";
import {
  sessions,
  signValue,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  getVerifiedSessionId,
  createSession,
  getAuthenticatedUser,
  sanitizeUser,
  getInitials,
} from "./utils/session.js";
import { sendJson, sendRedirect, readRequestBody } from "./utils/http.js";
import {
  createId,
  parseGitHubPullUrl,
  summarizeGithubFiles,
  extractReviewMeta,
  mergeGitHubIntoInput,
} from "./utils/helpers.js";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 3000);
const githubToken = process.env.GITHUB_TOKEN || "";
const auth0Domain = process.env.AUTH0_DOMAIN || "";
const auth0ClientId = process.env.AUTH0_CLIENT_ID || "";
const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET || "";
const auth0CallbackUrl =
  process.env.AUTH0_CALLBACK_URL || `http://localhost:${port}/auth/auth0/callback`;
const auth0BaseUrl = auth0Domain ? `https://${auth0Domain}` : "";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const auth0States = new Map();

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

async function fetchGitHubPullRequest(prUrl) {
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

async function postGitHubComment(prUrl, body) {
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

async function handleSignup(request, response) {
  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!name || !email || !password) {
      sendJson(response, 400, { error: "Name, email, and password are required." });
      return;
    }

    const store = await readStore();
    const existing = store.users.find((user) => user.email === email);

    if (existing) {
      sendJson(response, 400, { error: "An account with this email already exists." });
      return;
    }

    const user = {
      id: createId("user"),
      name,
      email,
      passwordHash: hashPassword(password),
      authProvider: "email",
      avatarUrl: "",
      createdAt: new Date().toISOString(),
    };

    store.users.push(user);
    await writeStore(store);
    createSession(response, user.id);

    sendJson(response, 201, { user: sanitizeUser(user), reviews: [] });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Unable to create account." });
  }
}

async function handleLogin(request, response) {
  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const store = await readStore();
    const user = store.users.find((entry) => entry.email === email);

    if (!user || user.authProvider !== "email" || !verifyPassword(password, user.passwordHash)) {
      sendJson(response, 401, { error: "Invalid email or password." });
      return;
    }

    createSession(response, user.id);
    const reviews = store.reviews
      .filter((review) => review.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    sendJson(response, 200, { user: sanitizeUser(user), reviews });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Unable to log in." });
  }
}

function handleLogout(response) {
  clearSessionCookie(response);
  sendJson(response, 200, { success: true });
}

async function handleMe(request, response) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    sendJson(response, 200, {
      user: null,
      reviews: [],
      googleAuthEnabled: Boolean(auth0Domain && auth0ClientId && auth0ClientSecret),
      githubIntegrationEnabled: Boolean(githubToken),
    });
    return;
  }

  const store = await readStore();
  const reviews = store.reviews
    .filter((review) => review.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  sendJson(response, 200, {
    user,
    reviews,
    googleAuthEnabled: Boolean(auth0Domain && auth0ClientId && auth0ClientSecret),
    githubIntegrationEnabled: Boolean(githubToken),
  });
}

async function handleGitHubFetch(request, response) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    sendJson(response, 401, { error: "Please log in to fetch pull requests." });
    return;
  }

  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const githubPr = await fetchGitHubPullRequest(body.prUrl || "");
    sendJson(response, 200, { githubPr });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Unable to fetch this PR." });
  }
}

async function handleReview(request, response) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    sendJson(response, 401, { error: "Please log in to create and save reviews." });
    return;
  }

  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const input = {
      issueUrl: body.issueUrl || "",
      issueText: body.issueText || "",
      prUrl: body.prUrl || "",
      prText: body.prText || "",
      previousCode: body.previousCode || "",
      currentCode: body.currentCode || "",
      companyName: body.companyName || "",
      companyGuidelines: body.companyGuidelines || "",
    };
    let githubPr = null;
    if (body.fetchFromGitHub && input.prUrl) {
      githubPr = await fetchGitHubPullRequest(input.prUrl);
    }

    const reviewInput = githubPr ? mergeGitHubIntoInput(input, githubPr) : input;
    const review = await reviewSubmission(reviewInput);

    let githubComment = null;
    if (body.postComment && input.prUrl) {
      githubComment = await postGitHubComment(
        input.prUrl,
        `## Automated PR Review\n\n${review}`,
      );
    }

    const meta = extractReviewMeta(review, input);
    const store = await readStore();
    const record = {
      id: createId("review"),
      userId: user.id,
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

    store.reviews.push(record);
    await writeStore(store);

    sendJson(response, 200, {
      review,
      reviewRecord: record,
      githubPr: record.githubPr,
      githubCommentUrl: record.githubCommentUrl,
    });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Unable to review this submission." });
  }
}

async function handleAuth0GoogleStart(response) {
  if (!auth0Domain || !auth0ClientId || !auth0ClientSecret) {
    sendRedirect(response, "/?auth=google_not_configured");
    return;
  }

  const state = randomBytes(12).toString("hex");
  auth0States.set(state, Date.now());
  const params = new URLSearchParams({
    client_id: auth0ClientId,
    redirect_uri: auth0CallbackUrl,
    response_type: "code",
    scope: "openid email profile",
    connection: "google-oauth2",
    prompt: "login",
    state,
  });

  sendRedirect(response, `${auth0BaseUrl}/authorize?${params.toString()}`);
}

async function handleAuth0Callback(request, response, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state || !auth0States.has(state)) {
    sendRedirect(response, "/?auth=google_failed");
    return;
  }

  auth0States.delete(state);

  try {
    const tokenResponse = await fetch(`${auth0BaseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: auth0ClientId,
        client_secret: auth0ClientSecret,
        redirect_uri: auth0CallbackUrl,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error("Auth0 token exchange failed.");
    }

    const userResponse = await fetch(`${auth0BaseUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const auth0User = await userResponse.json();
    if (!userResponse.ok || !auth0User.email) {
      throw new Error("Auth0 user profile fetch failed.");
    }

    const store = await readStore();
    let user = store.users.find(
      (entry) => entry.auth0Sub === auth0User.sub || entry.email === auth0User.email,
    );

    if (!user) {
      user = {
        id: createId("user"),
        name: auth0User.name || auth0User.email,
        email: auth0User.email,
        authProvider: "google",
        avatarUrl: auth0User.picture || "",
        auth0Sub: auth0User.sub,
        createdAt: new Date().toISOString(),
      };
      store.users.push(user);
    } else {
      user.name = auth0User.name || user.name;
      user.avatarUrl = auth0User.picture || user.avatarUrl || "";
      user.auth0Sub = auth0User.sub || user.auth0Sub;
      user.authProvider = "google";
    }

    await writeStore(store);
    createSession(response, user.id);
    sendRedirect(response, "/");
  } catch {
    sendRedirect(response, "/?auth=google_failed");
  }
}

async function handleStaticFile(pathname, response) {
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(publicDir, requestPath);

  try {
    const file = await readFile(filePath);
    const extension = path.extname(filePath);

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "text/plain; charset=utf-8",
    });
    response.end(file);
  } catch {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const { pathname } = url;

  if (request.method === "GET" && pathname === "/api/me") {
    await handleMe(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/signup") {
    await handleSignup(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    await handleLogin(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    handleLogout(response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/review") {
    await handleReview(request, response);
    return;
  }

  if (request.method === "POST" && pathname === "/api/github/fetch-pr") {
    await handleGitHubFetch(request, response);
    return;
  }

  if (request.method === "GET" && pathname === "/auth/google/start") {
    await handleAuth0GoogleStart(response);
    return;
  }

  if (request.method === "GET" && pathname === "/auth/auth0/callback") {
    await handleAuth0Callback(request, response, url);
    return;
  }

  if (request.method === "GET") {
    await handleStaticFile(pathname, response);
    return;
  }

  response.writeHead(405, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`PR Review Agent UI running at http://localhost:${port}`);
});
