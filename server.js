import { createServer } from "node:http";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { reviewSubmission } from "./gemini.js";

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const storePath = path.join(dataDir, "store.json");
const port = Number(process.env.PORT || 3000);
const sessionSecret = process.env.SESSION_SECRET || "local-dev-session-secret";
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

const sessions = new Map();
const auth0States = new Map();

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });

  try {
    await access(storePath);
  } catch {
    await writeFile(
      storePath,
      JSON.stringify({ users: [], reviews: [] }, null, 2),
      "utf8",
    );
  }
}

async function readStore() {
  await ensureStore();
  const raw = await readFile(storePath, "utf8");
  return JSON.parse(raw);
}

async function writeStore(store) {
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(data));
}

function sendRedirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function parseCookies(request) {
  const cookieHeader = request.headers.cookie || "";
  const cookies = {};

  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key) {
      continue;
    }
    cookies[key] = decodeURIComponent(rest.join("="));
  }

  return cookies;
}

function signValue(value) {
  return createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function setSessionCookie(response, sessionId) {
  const signed = `${sessionId}.${signValue(sessionId)}`;
  response.setHeader(
    "Set-Cookie",
    `pr_review_session=${encodeURIComponent(signed)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`,
  );
}

function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    "pr_review_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
  );
}

function getVerifiedSessionId(request) {
  const cookies = parseCookies(request);
  const raw = cookies.pr_review_session;

  if (!raw) {
    return null;
  }

  const [sessionId, signature] = raw.split(".");
  if (!sessionId || !signature) {
    return null;
  }

  const expected = signValue(sessionId);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  return sessionId;
}

async function getAuthenticatedUser(request) {
  const sessionId = getVerifiedSessionId(request);

  if (!sessionId) {
    return null;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const store = await readStore();
  const user = store.users.find((entry) => entry.id === session.userId);

  if (!user) {
    sessions.delete(sessionId);
    return null;
  }

  return sanitizeUser(user);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    authProvider: user.authProvider,
    avatarUrl: user.avatarUrl || "",
    initials: getInitials(user.name || user.email),
  };
}

function getInitials(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, existingHash] = stored.split(":");
  const computed = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(existingHash), Buffer.from(computed));
}

function createId(prefix) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function createSession(response, userId) {
  const sessionId = createId("sess");
  sessions.set(sessionId, {
    userId,
    createdAt: new Date().toISOString(),
  });
  setSessionCookie(response, sessionId);
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
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
  });
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

    const review = await reviewSubmission(input);
    const meta = extractReviewMeta(review, input);
    const store = await readStore();
    const record = {
      id: createId("review"),
      userId: user.id,
      createdAt: new Date().toISOString(),
      input,
      review,
      meta,
    };

    store.reviews.push(record);
    await writeStore(store);

    sendJson(response, 200, { review, reviewRecord: record });
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
