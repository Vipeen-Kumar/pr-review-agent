import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import * as userRepository from "../repositories/userRepository.js";
import config from "../config/env.js";
import { COOKIE_CONFIG } from "../config/constants.js";

const sessions = new Map();

function signValue(value) {
  return createHmac("sha256", config.sessionSecret).update(value).digest("hex");
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
    `${COOKIE_CONFIG.SESSION_NAME}=${encodeURIComponent(signed)}; HttpOnly; Path=${COOKIE_CONFIG.PATH}; SameSite=${COOKIE_CONFIG.SAME_SITE}; Max-Age=${COOKIE_CONFIG.MAX_AGE}`,
  );
}

function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${COOKIE_CONFIG.SESSION_NAME}=; HttpOnly; Path=${COOKIE_CONFIG.PATH}; SameSite=${COOKIE_CONFIG.SAME_SITE}; Max-Age=0`,
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
  const raw = cookies[COOKIE_CONFIG.SESSION_NAME];

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

  const user = await userRepository.findUserById(session.userId);

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
