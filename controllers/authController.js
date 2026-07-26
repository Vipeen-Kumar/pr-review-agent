import { randomBytes } from "node:crypto";
import { readRequestBody } from "../utils/http.js";
import {
  createSession,
  getAuthenticatedUser,
  clearSessionCookie,
} from "../utils/session.js";
import * as authService from "../services/authService.js";
import * as githubService from "../services/githubService.js";
import config from "../config/env.js";
import { ok, redirect, created, badRequest, unauthorized, serverError } from "../utils/response.js";
import { validateSignup, validateLogin } from "../utils/validators.js";
import { info, error as logError } from "../utils/logger.js";

/**
 * Auth Controller
 * 
 * Handles HTTP authentication requests.
 * Receives requests, reads bodies, calls auth service, sends responses.
 * NO business logic - all validation and auth happens in authService.
 */

const auth0States = new Map();

async function signup(request, response) {
  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const validated = validateSignup(body);
    
    const user = await authService.createUser(validated.name, validated.email, validated.password);
    createSession(response, user.id);
    
    info("User signed up", { userId: user.id, email: user.email });
    created(response, { user, reviews: [] });
  } catch (err) {
    logError("Signup failed", err);
    badRequest(response, err.message || "Unable to create account.");
  }
}

async function login(request, response) {
  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const validated = validateLogin(body);
    
    const user = await authService.verifyUser(validated.email, validated.password);
    createSession(response, user.id);
    const reviews = await authService.getUserReviews(user.id);

    info("User logged in", { userId: user.id, email: user.email });
    ok(response, { user, reviews });
  } catch (err) {
    logError("Login failed", err);
    badRequest(response, err.message || "Unable to log in.");
  }
}

function logout(response) {
  clearSessionCookie(response);
  info("User logged out");
  ok(response, { success: true });
}

async function getMe(request, response) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    ok(response, {
      user: null,
      reviews: [],
      googleAuthEnabled: config.auth0.isConfigured,
      githubIntegrationEnabled: githubService.isGitHubConfigured(),
    });
    return;
  }

  const reviews = await authService.getUserReviews(user.id);

  ok(response, {
    user,
    reviews,
    googleAuthEnabled: config.auth0.isConfigured,
    githubIntegrationEnabled: githubService.isGitHubConfigured(),
  });
}

function googleStart(response) {
  if (!config.auth0.isConfigured) {
    redirect(response, "/?auth=google_not_configured");
    return;
  }

  const state = randomBytes(12).toString("hex");
  auth0States.set(state, Date.now());
  const params = new URLSearchParams({
    client_id: config.auth0.clientId,
    redirect_uri: config.auth0.callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    connection: "google-oauth2",
    prompt: "login",
    state,
  });

  info("Google OAuth started", { state });
  redirect(response, `${config.auth0.baseUrl}/authorize?${params.toString()}`);
}

async function googleCallback(request, response, url) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state || !auth0States.has(state)) {
    logError("Google OAuth callback failed", { code: !!code, state: !!state, stateKnown: state ? auth0States.has(state) : false });
    redirect(response, "/?auth=google_failed");
    return;
  }

  auth0States.delete(state);

  try {
    const tokenResponse = await fetch(`${config.auth0.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: config.auth0.clientId,
        client_secret: config.auth0.clientSecret,
        redirect_uri: config.auth0.callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error("Auth0 token exchange failed.");
    }

    const userResponse = await fetch(`${config.auth0.baseUrl}/userinfo`, {
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
    info("Google OAuth successful", { userId: user.id, email: user.email });
    redirect(response, "/");
  } catch (err) {
    logError("Google OAuth callback error", err);
    redirect(response, "/?auth=google_failed");
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
