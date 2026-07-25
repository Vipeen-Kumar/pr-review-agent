import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { randomBytes } from "node:crypto";
import { sendJson, sendRedirect, readRequestBody } from "./utils/http.js";
import {
  createSession,
  getAuthenticatedUser,
  clearSessionCookie,
} from "./utils/session.js";
import * as authService from "./services/authService.js";
import * as githubService from "./services/githubService.js";
import * as reviewService from "./services/reviewService.js";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 3000);
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

async function handleSignup(request, response) {
  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const user = await authService.createUser(body.name, body.email, body.password);
    createSession(response, user.id);
    sendJson(response, 201, { user, reviews: [] });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Unable to create account." });
  }
}

async function handleLogin(request, response) {
  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const email = body.email || "";
    const password = body.password || "";
    
    const user = await authService.verifyUser(email, password);
    createSession(response, user.id);
    const reviews = await authService.getUserReviews(user.id);

    sendJson(response, 200, { user, reviews });
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
      githubIntegrationEnabled: githubService.isGitHubConfigured(),
    });
    return;
  }

  const reviews = await authService.getUserReviews(user.id);

  sendJson(response, 200, {
    user,
    reviews,
    googleAuthEnabled: Boolean(auth0Domain && auth0ClientId && auth0ClientSecret),
    githubIntegrationEnabled: githubService.isGitHubConfigured(),
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
    const githubPr = await githubService.fetchPullRequest(body.prUrl || "");
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
    const result = await reviewService.generateAndSaveReview(user.id, body);
    sendJson(response, 200, result);
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

    const user = await authService.findOrCreateGoogleUser(auth0User);
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
