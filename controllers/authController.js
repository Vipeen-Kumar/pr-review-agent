import { randomBytes } from "node:crypto";
import { sendJson, sendRedirect, readRequestBody } from "../utils/http.js";
import {
  createSession,
  getAuthenticatedUser,
  clearSessionCookie,
} from "../utils/session.js";
import * as authService from "../services/authService.js";
import * as githubService from "../services/githubService.js";

/**
 * Auth Controller
 * 
 * Handles HTTP authentication requests.
 * Receives requests, reads bodies, calls auth service, sends responses.
 * NO business logic - all validation and auth happens in authService.
 */

const auth0States = new Map();

// Helper to get Auth0 config (loaded lazily to ensure .env is configured first)
function getAuth0Config() {
  return {
    domain: process.env.AUTH0_DOMAIN || "",
    clientId: process.env.AUTH0_CLIENT_ID || "",
    clientSecret: process.env.AUTH0_CLIENT_SECRET || "",
    callbackUrl: process.env.AUTH0_CALLBACK_URL || `http://localhost:${Number(process.env.PORT || 3000)}/auth/auth0/callback`,
    baseUrl: (process.env.AUTH0_DOMAIN ? `https://${process.env.AUTH0_DOMAIN}` : ""),
  };
}

async function signup(request, response) {
  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const user = await authService.createUser(body.name, body.email, body.password);
    createSession(response, user.id);
    sendJson(response, 201, { user, reviews: [] });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Unable to create account." });
  }
}

async function login(request, response) {
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

function logout(response) {
  clearSessionCookie(response);
  sendJson(response, 200, { success: true });
}

async function getMe(request, response) {
  const auth0Config = getAuth0Config();
  const user = await getAuthenticatedUser(request);

  if (!user) {
    sendJson(response, 200, {
      user: null,
      reviews: [],
      googleAuthEnabled: Boolean(auth0Config.domain && auth0Config.clientId && auth0Config.clientSecret),
      githubIntegrationEnabled: githubService.isGitHubConfigured(),
    });
    return;
  }

  const reviews = await authService.getUserReviews(user.id);

  sendJson(response, 200, {
    user,
    reviews,
    googleAuthEnabled: Boolean(auth0Config.domain && auth0Config.clientId && auth0Config.clientSecret),
    githubIntegrationEnabled: githubService.isGitHubConfigured(),
  });
}

function googleStart(response) {
  const auth0Config = getAuth0Config();
  
  if (!auth0Config.domain || !auth0Config.clientId || !auth0Config.clientSecret) {
    sendRedirect(response, "/?auth=google_not_configured");
    return;
  }

  const state = randomBytes(12).toString("hex");
  auth0States.set(state, Date.now());
  const params = new URLSearchParams({
    client_id: auth0Config.clientId,
    redirect_uri: auth0Config.callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    connection: "google-oauth2",
    prompt: "login",
    state,
  });

  sendRedirect(response, `${auth0Config.baseUrl}/authorize?${params.toString()}`);
}

async function googleCallback(request, response, url) {
  const auth0Config = getAuth0Config();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state || !auth0States.has(state)) {
    sendRedirect(response, "/?auth=google_failed");
    return;
  }

  auth0States.delete(state);

  try {
    const tokenResponse = await fetch(`${auth0Config.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: auth0Config.clientId,
        client_secret: auth0Config.clientSecret,
        redirect_uri: auth0Config.callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error("Auth0 token exchange failed.");
    }

    const userResponse = await fetch(`${auth0Config.baseUrl}/userinfo`, {
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

export {
  signup,
  login,
  logout,
  getMe,
  googleStart,
  googleCallback,
};
