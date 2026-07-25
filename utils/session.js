import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readStore } from "../storage/store.js";

const sessions = new Map();
const sessionSecret = process.env.SESSION_SECRET || "local-dev-session-secret";

function signValue(value) {
  return createHmac("sha256", sessionSecret).update(value).digest("hex");
}

function verifySignedValue(sessionId, signature) {
  const expected = signValue(sessionId);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return false;
  }

  return true;
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

  if (!verifySignedValue(sessionId, signature)) {
    return null;
  }

  return sessionId;
}

function createSession(response, userId) {
  const sessionId = `sess_${randomBytes(8).toString("hex")}`;
  sessions.set(sessionId, {
    userId,
    createdAt: new Date().toISOString(),
  });
  setSessionCookie(response, sessionId);
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

export {
  sessions,
  signValue,
  verifySignedValue,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  getVerifiedSessionId,
  createSession,
  getAuthenticatedUser,
  sanitizeUser,
  getInitials,
};
