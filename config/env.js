/**
 * Environment Configuration
 *
 * Single source of truth for all environment variables.
 * Nobody except this module should access process.env directly.
 * All configuration is loaded here and exported.
 *
 * This ensures:
 * 1. Type safety and validation
 * 2. Single point to verify all required vars
 * 3. Easy to test with different configs
 * 4. Clear dependencies
 */

function getEnv(key, defaultValue = undefined) {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value !== undefined ? value : defaultValue;
}

// Server configuration
const PORT = Number(getEnv("PORT", "3000"));

// Session configuration
const SESSION_SECRET = getEnv("SESSION_SECRET", "local-dev-session-secret");

// Auth0 configuration (optional - only required for Google OAuth)
const AUTH0_DOMAIN = getEnv("AUTH0_DOMAIN", "");
const AUTH0_CLIENT_ID = getEnv("AUTH0_CLIENT_ID", "");
const AUTH0_CLIENT_SECRET = getEnv("AUTH0_CLIENT_SECRET", "");
const AUTH0_CALLBACK_URL = getEnv("AUTH0_CALLBACK_URL", `http://localhost:${PORT}/auth/auth0/callback`);

// GitHub configuration (optional - only required for PR fetch and comments)
const GITHUB_TOKEN = getEnv("GITHUB_TOKEN", "");

// Gemini API configuration
const GEMINI_API_KEY = getEnv("GEMINI_API_KEY", "");
const GEMINI_MODEL = getEnv("GEMINI_MODEL", "gemini-1.5-flash");

// Logging configuration
const LOG_LEVEL = getEnv("LOG_LEVEL", "info");

const config = {
  port: PORT,
  sessionSecret: SESSION_SECRET,
  auth0: {
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    clientSecret: AUTH0_CLIENT_SECRET,
    callbackUrl: AUTH0_CALLBACK_URL,
    baseUrl: AUTH0_DOMAIN ? `https://${AUTH0_DOMAIN}` : "",
    isConfigured: Boolean(AUTH0_DOMAIN && AUTH0_CLIENT_ID && AUTH0_CLIENT_SECRET),
  },
  github: {
    token: GITHUB_TOKEN,
    isConfigured: Boolean(GITHUB_TOKEN),
  },
  gemini: {
    apiKey: GEMINI_API_KEY,
    model: GEMINI_MODEL,
    isConfigured: Boolean(GEMINI_API_KEY),
  },
  logging: {
    level: LOG_LEVEL,
  },
};

export default config;
