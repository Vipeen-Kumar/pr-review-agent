# PR Review Agent - Production Ready

`pr-review-agent` is a Gemini-powered code review project with a clean browser UI that reviews pull requests against issue context and company standards.

It is built with a clean layered architecture (Phase 5: Production Ready):

- Clean 6-layer architecture (Config, Routing, Controller, Service, Storage, Utils)
- Centralized error handling and validation
- Structured logging and configuration management
- `gitclaw` agent metadata
- a dedicated `pr-review` skill
- a Gemini review engine
- a browser UI with dark and light mode
- email login and sign-up with bcrypt password hashing
- Google OAuth support via Auth0
- per-user saved review history
- profile display with avatar or initials
- optional company guideline upload support
- a CLI runner for reviewing pasted PR diffs

## Project Phases

- ✅ Phase 1: Utils + Storage Layer
- ✅ Phase 2: Service Layer
- ✅ Phase 3: Controller Layer
- ✅ Phase 4: Routing Layer
- ✅ Phase 5: Production-Ready (Error Handling, Validation, Logging, Config)

## Architecture

The application uses a clean 6-layer architecture:

```
HTTP Request
    ↓
server.js (Dispatcher)
    ↓
routes/ (Route Matching)
    ↓
controllers/ (HTTP Handlers)
    ↓
services/ (Business Logic)
    ↓
storage/ (Data Persistence)
    ↓
utils/ + config/ (Reusable Functions & Configuration)
```

For detailed architecture documentation, see `docs/ARCHITECTURE.md`.

## Project Structure

```text
pr-review-agent/
├── config/                     ✨ Configuration layer (NEW)
│   ├── env.js
│   └── constants.js
├── controllers/                Controllers (HTTP handlers)
│   ├── authController.js
│   ├── reviewController.js
│   ├── githubController.js
│   └── pageController.js
├── routes/                     Routing layer
│   ├── index.js
│   ├── authRoutes.js
│   ├── reviewRoutes.js
│   ├── githubRoutes.js
│   └── pageRoutes.js
├── services/                   Business logic
│   ├── authService.js
│   ├── reviewService.js
│   ├── githubService.js
│   └── geminiService.js
├── storage/                    Data persistence
│   └── store.js
├── utils/                      Utilities & helpers
│   ├── errors.js               ✨ Error classes (NEW)
│   ├── validators.js           ✨ Request validators (NEW)
│   ├── logger.js               ✨ Structured logging (NEW)
│   ├── response.js             ✨ Response helpers (NEW)
│   ├── asyncHandler.js         ✨ Async error wrapper (NEW)
│   ├── http.js
│   ├── session.js
│   ├── password.js
│   └── helpers.js
├── public/                     Frontend assets
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── data/                       Runtime data
│   └── store.json
├── docs/                       ✨ Documentation (NEW)
│   ├── ARCHITECTURE.md
│   ├── PRODUCTION_READINESS.md
│   ├── FOLDER_STRUCTURE.md
│   └── PHASE_5_SUMMARY.md
├── server.js                   Main entry point
├── package.json
├── .env
└── README.md (this file)
```

## What This Project Does

This project takes issue context, PR context, and optional company formatting guidance, then sends everything to Gemini with a strict review prompt.

The model is asked to:

- rate the PR out of 10
- summarize the change
- identify bugs
- check edge cases
- suggest corrections
- look at time complexity
- comment on naming conventions
- flag security issues
- evaluate alignment with issue scope
- evaluate compliance with company expectations
- give a final verdict

The response is returned in this format:

```md
## Rating
...

## Summary
...

## Issues
- ...

## Corrections
- ...

## Verdict
APPROVE or REQUEST CHANGES
```

## How It Works

### 1. Input

You open the UI and provide:

- issue URL
- issue text
- PR URL
- PR text or diff
- previous code
- current code
- optional company name
- optional company formatting/rubric text
- optional uploaded guideline file

### 2. Prompting

The input is sent to the server, then passed into `reviewSubmission()` in `gemini.js`, which builds a structured review prompt for Gemini.

### 3. Gemini Review

The Gemini API analyzes the diff and produces review feedback.

### 4. Output

The result is displayed in the UI as a structured review with:

- rating
- summary
- issues
- corrections
- final verdict

## Requirements

Make sure you have:

- Node.js 18 or newer
- npm
- git
- a valid Gemini API key

## Installation

From the project folder:

```bash
npm install
```

## Environment Setup

Create or update `.env` with your configuration:

```env
# Server
PORT=3000

# Session
SESSION_SECRET=your-secret-key

# Gemini API
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# Auth0 (optional - required for Google OAuth)
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_CALLBACK_URL=http://localhost:3000/auth/auth0/callback

# GitHub (optional - required for PR fetch and comments)
GITHUB_TOKEN=your_github_token

# Logging
LOG_LEVEL=info
```

**Notes:**
- `GEMINI_API_KEY` is required for review generation
- `GEMINI_MODEL` can be changed to use different Gemini models
- `SESSION_SECRET` signs login sessions (required)
- Auth0 configuration enables Google login
- GitHub token enables PR metadata fetching
- `LOG_LEVEL` can be: debug, info, warn, error

## How To Run The Project

### Run the web app

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

In the UI:

1. Sign up with email or log in with existing account
2. (Optional) Use Google login if Auth0 is configured
3. Enter issue context (URL or text)
4. Enter PR URL and/or paste PR text
5. (Optional) Fetch PR details from GitHub
6. (Optional) Add company formatting rules or upload guidelines
7. Click `Review PR`

The app will show:
- Rating (out of 10)
- Summary of changes
- Issues identified
- Suggested corrections
- Final verdict (APPROVE or REQUEST CHANGES)

Each review is saved to your account and shown in the history panel.

### Run interactive CLI mode

```bash
npm run cli
```

Then paste the PR diff and type `END` on its own line when finished.

### Run the sample review

```bash
node run-agent.js --sample
```

This runs the built-in sample diff and shows the expected output format.

### Start the gitclaw agent shell

```bash
npx gitclaw --help
```

If you want to use the full agent environment, make sure `GOOGLE_API_KEY` is available in your environment.

## Example Usage

Example input:

```diff
- function multiply(a, b) {
-   return a + b;
- }

+ function multiply(a, b) {
+   return a * b;
+ }
```

Example output:

```markdown
## Rating
8/10

## Summary
Fixed critical bug in multiply function - was adding instead of multiplying

## Issues
- Function performed addition instead of multiplication
- Variable names could be more descriptive

## Corrections
- Corrected operator from + to *
- Consider renaming for clarity if used in performance-critical code

## Verdict
APPROVE
```

## Main Files

- `server.js` - Main HTTP server dispatcher (no routing logic, 20 lines)
- `routes/` - Route matching modules (4 specific routes + router)
- `controllers/` - HTTP request handlers (thin adapters only)
- `services/` - Business logic (authentication, review generation, GitHub integration)
- `storage/store.js` - Data persistence layer (file-based JSON)
- `config/` - Centralized configuration and constants
- `utils/` - Reusable utilities (errors, validators, logger, responses)
- `public/` - Frontend HTML, CSS, and JavaScript
- `data/store.json` - Persistent data storage

## Phase 5 Improvements

### ✨ New Production-Ready Features

1. **Centralized Error Handling** (`utils/errors.js`)
   - 10 typed error classes with HTTP status codes
   - Consistent error representation across application

2. **Request Validation** (`utils/validators.js`)
   - 7 reusable validators for all request types
   - Consistent validation error messages

3. **Structured Logging** (`utils/logger.js`)
   - 4 log levels (debug, info, warn, error)
   - Configurable via LOG_LEVEL environment variable
   - No external dependencies

4. **Configuration Management** (`config/env.js`, `config/constants.js`)
   - All environment variables in one place
   - Type-safe configuration access
   - Clear dependencies

5. **Response Formatting** (`utils/response.js`)
   - 10 response helper functions
   - Consistent JSON structure
   - Reduced code duplication

6. **Async Error Wrapper** (`utils/asyncHandler.js`)
   - Automatic error handling for async functions
   - Eliminates repetitive try-catch blocks

7. **Comprehensive Documentation** (`docs/`)
   - Architecture overview
   - Production readiness checklist
   - Folder structure guide
   - Phase 5 summary

## Documentation

For detailed information, see:

- **`docs/ARCHITECTURE.md`** - System architecture, request flows, data models
- **`docs/PRODUCTION_READINESS.md`** - Production deployment checklist
- **`docs/FOLDER_STRUCTURE.md`** - Code organization and file descriptions
- **`docs/PHASE_5_SUMMARY.md`** - Phase 5 improvements and completion summary

## API Endpoints

### Authentication
- `POST /api/signup` - Create new account
- `POST /api/login` - Login with email/password
- `POST /api/logout` - Logout
- `GET /api/me` - Get current user
- `GET /auth/google/start` - Start Google OAuth flow
- `GET /auth/auth0/callback` - OAuth callback handler

### Reviews
- `POST /api/review` - Generate and save review

### GitHub Integration
- `POST /api/github/fetch-pr` - Fetch PR details from GitHub

### Static Files
- `GET /` - Serve index.html
- `GET /app.js` - Serve frontend JavaScript
- `GET /styles.css` - Serve frontend CSS

## Notes

- The UI supports both light mode and dark mode (toggle in header)
- The project reviews using URLs, pasted PR text, or both
- The current default model is `gemini-1.5-flash`
- Session storage is in-memory with HMAC-signed cookies
- User data is persisted to `data/store.json`
- Passwords are hashed with bcrypt
- If your API quota is limited, you may need to adjust billing

## Security

- Passwords are hashed with bcrypt
- Sessions are HMAC-signed and HttpOnly
- OAuth state is validated for CSRF protection
- Input validation on all endpoints
- No sensitive data in error messages
- Error details logged server-side only

## Future Improvements

- Add unit and integration tests
- Add database support (PostgreSQL)
- Add API documentation (OpenAPI/Swagger)
- Add rate limiting
- Add error tracking (Sentry)
- Add performance monitoring
- Add cache layer (Redis)
- Add event/notification system

## Production Status

✅ **Production Ready**

The application has been enhanced to production-ready status with:
- Robust error handling
- Centralized configuration
- Structured logging
- Request validation
- Comprehensive documentation
- No external framework dependencies
- 100% backward compatible
