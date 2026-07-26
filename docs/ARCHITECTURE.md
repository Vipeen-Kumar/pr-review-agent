# PR Review Agent - Production-Ready Architecture

## Overview

The PR Review Agent is a Node.js application with a clean, layered architecture designed for maintainability, testability, and production readiness. The application follows strict separation of concerns with no external frameworks.

**Current Version:** Phase 5 - Production Ready

---

## Architecture Layers

```
┌─────────────────────────────────────────┐
│    Client (Browser / Frontend)          │
│         (HTML, CSS, JS)                 │
└────────────────────┬────────────────────┘
                     │ HTTP
                     ▼
┌─────────────────────────────────────────┐
│         HTTP Request Dispatcher         │
│            (server.js)                  │
│   - Parse URL & create URL object       │
│   - Delegate to routing layer           │
│   - Handle unmatched requests           │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│       Routing Layer (routes/)           │
│   - Route matching logic                │
│   - Determine which controller handles  │
│   - No business logic                   │
│                                         │
│   ├─ authRoutes.js                      │
│   ├─ reviewRoutes.js                    │
│   ├─ githubRoutes.js                    │
│   ├─ pageRoutes.js                      │
│   └─ index.js (router)                  │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│    Controller Layer (controllers/)      │
│   - HTTP request/response handling      │
│   - Input parsing & validation          │
│   - Session management                  │
│   - Response formatting                 │
│   - No business logic                   │
│                                         │
│   ├─ authController.js                  │
│   ├─ reviewController.js                │
│   ├─ githubController.js                │
│   └─ pageController.js                  │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│     Service Layer (services/)           │
│   - Business logic                      │
│   - Data orchestration                  │
│   - External API integration            │
│   - No HTTP concerns                    │
│                                         │
│   ├─ authService.js                     │
│   ├─ reviewService.js                   │
│   ├─ githubService.js                   │
│   └─ geminiService.js                   │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│      Storage Layer (storage/)           │
│   - Data persistence                    │
│   - File-based storage                  │
│   - No HTTP/business logic              │
│                                         │
│   └─ store.js                           │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│    Utilities & Config                   │
│   - Reusable functions                  │
│   - Centralized configuration           │
│   - Error handling                      │
│   - Response formatting                 │
│   - Validation                          │
│   - Logging                             │
│                                         │
│   ├─ utils/errors.js                    │
│   ├─ utils/validators.js                │
│   ├─ utils/logger.js                    │
│   ├─ utils/response.js                  │
│   ├─ utils/asyncHandler.js              │
│   ├─ utils/http.js                      │
│   ├─ utils/session.js                   │
│   ├─ utils/password.js                  │
│   ├─ utils/helpers.js                   │
│   ├─ config/env.js                      │
│   └─ config/constants.js                │
└─────────────────────────────────────────┘
```

---

## Request Lifecycle

### Authentication Flow (Signup/Login)

```
User clicks "Sign Up" / "Log In"
           │
           ▼
    Frontend (app.js)
    POST /api/signup or /api/login
           │
           ▼
    server.js (dispatcher)
    Parse URL
           │
           ▼
    routes/index.js
    Check authRoutes
           │
           ▼
    routes/authRoutes.js
    Match POST /api/signup or /api/login
           │
           ▼
    controllers/authController.js
    signup() or login()
    ├─ Parse request body
    ├─ Validate input (validateSignup/validateLogin)
    ├─ Call authService
           │
           ▼
    services/authService.js
    createUser() or verifyUser()
    ├─ Hash password (with password.js)
    ├─ Store user (with storage/store.js)
    ├─ Return sanitized user
           │
           ▼
    Back to controllers/authController.js
    ├─ Create session
    ├─ Format response
    ├─ Send JSON response (200 OK or 201 Created)
           │
           ▼
    Frontend displays user and reviews
```

---

### Google OAuth Flow

```
User clicks "Continue with Google"
           │
           ▼
    GET /auth/google/start
           │
           ▼
    authController.googleStart()
    ├─ Check if Auth0 configured
    ├─ Generate OAuth state
    ├─ Store state in memory
    ├─ Redirect to Auth0 authorize endpoint
           │
           ▼
    User authenticates with Auth0
           │
           ▼
    Auth0 redirects to /auth/auth0/callback
    with code and state
           │
           ▼
    authController.googleCallback()
    ├─ Validate state
    ├─ Exchange code for token
    ├─ Fetch user info from Auth0
    ├─ Call authService.findOrCreateGoogleUser()
    ├─ Create session
    ├─ Redirect to /
           │
           ▼
    Frontend fetches user info and displays
```

---

### Review Generation Flow

```
User submits review form
           │
           ▼
    Frontend (app.js)
    POST /api/review
    body: { prUrl, issueUrl, ... }
           │
           ▼
    reviewController.generateReview()
    ├─ Check authentication
    ├─ Validate request (validateReview)
    ├─ Call reviewService
           │
           ▼
    services/reviewService.js
    generateAndSaveReview()
    ├─ If fetchFromGitHub: call githubService
    ├─ If postComment: call githubService
    ├─ Call geminiService.generateReview()
    ├─ Extract metadata
    ├─ Save to storage
    ├─ Return result
           │
           ▼
    Back to reviewController
    ├─ Format response
    ├─ Send JSON (200 OK)
           │
           ▼
    Frontend displays review
```

---

### GitHub Pull Request Fetch Flow

```
User clicks "Fetch PR Details"
           │
           ▼
    Frontend (app.js)
    POST /api/github/fetch-pr
    body: { prUrl }
           │
           ▼
    githubController.fetchPullRequest()
    ├─ Check authentication
    ├─ Validate GitHub URL (validateGitHubUrl)
    ├─ Call githubService
           │
           ▼
    services/githubService.js
    fetchPullRequest()
    ├─ Parse PR URL (helpers.parseGitHubPullUrl)
    ├─ Fetch from GitHub API
    ├─ Summarize changed files
    ├─ Return PR object
           │
           ▼
    Back to githubController
    ├─ Format response
    ├─ Send JSON (200 OK)
           │
           ▼
    Frontend displays PR metadata
```

---

### Static File Serving Flow

```
User navigates to / or requests /app.js
           │
           ▼
    server.js
    URL matches GET request
           │
           ▼
    routes/index.js
    Not auth, review, or github routes
           │
           ▼
    routes/pageRoutes.js
    Matches GET requests
           │
           ▼
    pageController.serveStaticFile()
    ├─ Default / to /index.html
    ├─ Read file from disk
    ├─ Determine MIME type
    ├─ Send with appropriate headers
           │
           ▼
    Frontend receives HTML/CSS/JS
```

---

## Folder Structure

```
pr-review-agent/
├── config/
│   ├── env.js                 # Environment variables & configuration
│   └── constants.js           # Application constants
│
├── controllers/
│   ├── authController.js      # Auth HTTP handlers
│   ├── reviewController.js    # Review HTTP handlers
│   ├── githubController.js    # GitHub HTTP handlers
│   └── pageController.js      # Static file handlers
│
├── routes/
│   ├── index.js               # Central router
│   ├── authRoutes.js          # Auth routing logic
│   ├── reviewRoutes.js        # Review routing logic
│   ├── githubRoutes.js        # GitHub routing logic
│   └── pageRoutes.js          # Static file routing logic
│
├── services/
│   ├── authService.js         # Auth business logic
│   ├── reviewService.js       # Review orchestration
│   ├── githubService.js       # GitHub API integration
│   └── geminiService.js       # Gemini AI integration
│
├── storage/
│   └── store.js               # Data persistence layer
│
├── utils/
│   ├── errors.js              # Error classes (NEW)
│   ├── validators.js          # Request validators (NEW)
│   ├── logger.js              # Logging utility (NEW)
│   ├── response.js            # Response helpers (NEW)
│   ├── asyncHandler.js        # Async error wrapper (NEW)
│   ├── http.js                # HTTP utilities
│   ├── session.js             # Session management
│   ├── password.js            # Password hashing
│   └── helpers.js             # General helpers
│
├── public/
│   ├── index.html             # Frontend HTML
│   ├── app.js                 # Frontend JavaScript
│   └── styles.css             # Frontend CSS
│
├── docs/
│   └── ARCHITECTURE.md        # This file
│
├── server.js                  # Main server entry point
├── package.json
├── .env
└── .gitignore
```

---

## Key Design Decisions

### 1. No External Frameworks
- **Why:** Lightweight, transparent, easy to understand and debug
- **Trade-off:** More boilerplate, but better control
- **Benefit:** Zero dependencies for HTTP layer

### 2. Centralized Configuration (config/env.js)
- **Why:** Single source of truth for all env variables
- **Benefit:** Easy to test, validate, and modify configuration
- **Impact:** No direct `process.env` access outside config

### 3. Centralized Error Handling (utils/errors.js)
- **Why:** Consistent error reporting and HTTP status mapping
- **Benefit:** Easier debugging, cleaner controllers
- **Impact:** Services throw typed errors, controllers map to HTTP

### 4. Request Validation Layer (utils/validators.js)
- **Why:** Validation logic separated from business logic
- **Benefit:** Reusable, testable, consistent error messages
- **Impact:** Controllers validate before calling services

### 5. Centralized Response Formatting (utils/response.js)
- **Why:** Consistent JSON structure across all endpoints
- **Benefit:** Frontend predictability, easier client-side handling
- **Impact:** All controllers use response helpers

### 6. Async Wrapper (utils/asyncHandler.js)
- **Why:** Eliminate repetitive try-catch blocks
- **Benefit:** Cleaner controllers, automatic error handling
- **Impact:** All async controller functions wrapped

### 7. Structured Logging (utils/logger.js)
- **Why:** Visibility into application behavior
- **Benefit:** Debug production issues, audit actions
- **Impact:** Replace console.log with logger calls

---

## Data Flow Summary

```
REQUEST COMES IN
    ↓
server.js parses URL
    ↓
routes/index.js attempts to match
    ↓
Specific route module matches request
    ↓
Controller receives request
    ↓
Controller parses & validates input
    (using validators.js)
    ↓
Controller calls appropriate service
    ↓
Service performs business logic
    ↓
Service calls storage layer if needed
    ↓
Service returns result or throws error
    ↓
Controller formats response
    (using response.js)
    ↓
HTTP response sent to client
```

---

## Error Handling

### Error Class Hierarchy

```
ApplicationError (base)
├── ValidationError (400)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── GitHubError (400)
├── GeminiError (500)
├── ConfigurationError (500)
└── ServerError (500)
```

### Error Flow

```
Service throws error
    ↓
Controller catches error
    ↓
Controller checks error type
    ↓
Controller calls appropriate response helper
    ├─ badRequest() for ValidationError
    ├─ unauthorized() for AuthenticationError
    ├─ serverError() for ServerError
    └─ etc.
    ↓
JSON error response sent to client
```

---

## Configuration Sources

### Primary Sources (in order of precedence)

1. **.env file** - Local environment variables
2. **process.env** - System environment variables
3. **Defaults** - Hardcoded defaults in config/env.js

### Environment Variables

```javascript
// Server
PORT                      // default: 3000

// Session
SESSION_SECRET           // default: "local-dev-session-secret"

// Auth0
AUTH0_DOMAIN             // required for Google OAuth
AUTH0_CLIENT_ID          // required for Google OAuth
AUTH0_CLIENT_SECRET      // required for Google OAuth
AUTH0_CALLBACK_URL       // default: http://localhost:3000/auth/auth0/callback

// GitHub
GITHUB_TOKEN             // required for PR fetch and comments

// Gemini
GEMINI_API_KEY           // required for review generation
GEMINI_MODEL             // default: gemini-1.5-flash

// Logging
LOG_LEVEL                // default: info (debug, info, warn, error)
```

---

## Authentication & Sessions

### Session Storage
- **Type:** In-memory Map
- **Structure:** `{ sessionId → { userId, createdAt } }`
- **Duration:** 7 days (configurable in constants.js)
- **Cookie:** HttpOnly, SameSite=Lax, signed with HMAC

### Cookie Structure
```
pr_review_session = sessionId.signature
Where signature = HMAC-SHA256(SESSION_SECRET, sessionId)
```

### Auth Providers
1. **Email/Password** - Local accounts with bcrypt hashing
2. **Google/Auth0** - OAuth 2.0 via Auth0

---

## API Endpoints

### Authentication
- `POST /api/signup` - Create new account
- `POST /api/login` - Login with email/password
- `POST /api/logout` - Logout
- `GET /api/me` - Get current user and config
- `GET /auth/google/start` - Start Google OAuth
- `GET /auth/auth0/callback` - Auth0 OAuth callback

### Reviews
- `POST /api/review` - Generate and save review

### GitHub
- `POST /api/github/fetch-pr` - Fetch PR details

### Static Files
- `GET *` - Serve static files

---

## Validation

### Request Validators

1. **validateSignup(body)** - Validates signup request
   - name: 2+ chars, required
   - email: valid format, required
   - password: 6+ chars, required

2. **validateLogin(body)** - Validates login request
   - email: valid format, required
   - password: required

3. **validateReview(body)** - Validates review request
   - prUrl or issueUrl: at least one required
   - fetchFromGitHub: boolean
   - postComment: boolean

4. **validateGitHubUrl(prUrl)** - Validates GitHub PR URL
   - Format: https://github.com/owner/repo/pull/number

---

## Response Format

### Success Response (HTTP 200)
```json
{
  "user": { ... },
  "reviews": [ ... ],
  "success": true
}
```

### Created Response (HTTP 201)
```json
{
  "user": { ... },
  "reviews": []
}
```

### Error Response (HTTP 400-500)
```json
{
  "error": "Error message"
}
```

---

## Logging

### Log Levels
- **debug** - Detailed debugging information
- **info** - General informational messages
- **warn** - Warning messages
- **error** - Error messages

### Log Output
```
[2024-01-01T12:00:00.000Z] INFO: User signed up
[2024-01-01T12:00:01.000Z] ERROR: Validation failed
```

---

## Production Readiness Checklist

✅ **Architecture**
- Clean separation of concerns (6 layers)
- No circular dependencies
- No direct process.env access outside config
- Consistent error handling
- Structured logging

✅ **Code Quality**
- No unused imports
- No dead code
- No commented code
- Consistent naming conventions
- JSDoc comments on all modules

✅ **Error Handling**
- Typed error classes
- Proper HTTP status codes
- Error logging
- Graceful degradation
- User-friendly error messages

✅ **Security**
- Password hashing (bcrypt)
- HMAC session signing
- CSRF-safe OAuth flow
- HttpOnly cookies
- Input validation

✅ **Reliability**
- No unhandled promise rejections
- Async/await error handling
- Input validation before processing
- Consistent response format
- Defensive programming

✅ **Maintainability**
- Clear folder structure
- Single responsibility principle
- DRY (Don't Repeat Yourself)
- Centralized configuration
- Documented architecture

✅ **Performance**
- Async I/O operations
- Session management
- Static file caching headers
- Efficient data structures

---

## Future Improvements

1. **Middleware System**
   - Add middleware for auth checks, logging, rate limiting
   - Create middleware chain pattern

2. **Database Integration**
   - Replace file-based storage with database
   - Add query builders and migrations

3. **Testing Framework**
   - Add unit tests for services
   - Add integration tests for API endpoints
   - Add E2E tests for critical flows

4. **API Documentation**
   - Add OpenAPI/Swagger documentation
   - Auto-generate API docs from comments

5. **Monitoring & Analytics**
   - Add performance monitoring
   - Add error tracking (Sentry integration)
   - Add analytics

6. **Caching Layer**
   - Add Redis for session storage
   - Cache frequently accessed data

7. **Rate Limiting**
   - Add rate limiting per user/IP
   - Configurable limits per endpoint

8. **Input Sanitization**
   - Add HTML sanitization
   - Add SQL injection prevention (if DB added)

---

## Troubleshooting

### Application won't start
1. Check all environment variables are set in `.env`
2. Verify `config/env.js` can be loaded
3. Check `data/store.json` is readable/writable

### Auth0 OAuth not working
1. Verify AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET are set
2. Check Auth0 dashboard has Google-oauth2 connection enabled
3. Verify AUTH0_CALLBACK_URL matches Auth0 allowed callback URLs

### Reviews not generating
1. Verify GEMINI_API_KEY is valid
2. Check Gemini API quota/billing
3. Review server logs for error details

### GitHub PR fetch failing
1. Verify GITHUB_TOKEN is valid
2. Check GitHub API rate limits (60 requests/hour for unauthenticated)
3. Verify PR URL format is correct

---

**Last Updated:** January 2024  
**Phase:** 5 - Production Ready
