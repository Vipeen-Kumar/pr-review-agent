# Folder Structure & File Organization

## Complete Project Structure

```
pr-review-agent/
│
├── 📁 config/                          [Configuration Layer]
│   ├── env.js                          Environment variables & app config
│   └── constants.js                    Application constants & defaults
│
├── 📁 controllers/                     [Controller Layer - HTTP Handlers]
│   ├── authController.js               Authentication endpoints (signup, login, logout, OAuth)
│   ├── reviewController.js             Review generation endpoint
│   ├── githubController.js             GitHub PR fetch endpoint
│   └── pageController.js               Static file serving
│
├── 📁 routes/                          [Routing Layer - Route Matching]
│   ├── index.js                        Central router orchestrator
│   ├── authRoutes.js                   Auth route matching logic
│   ├── reviewRoutes.js                 Review route matching logic
│   ├── githubRoutes.js                 GitHub route matching logic
│   └── pageRoutes.js                   Static file route matching
│
├── 📁 services/                        [Service Layer - Business Logic]
│   ├── authService.js                  User auth & account management
│   ├── reviewService.js                Review generation orchestration
│   ├── githubService.js                GitHub API integration
│   └── geminiService.js                Gemini AI integration
│
├── 📁 storage/                         [Storage Layer - Data Persistence]
│   └── store.js                        File-based data storage
│
├── 📁 utils/                           [Utilities - Reusable Functions]
│   ├── errors.js                       ✨ [NEW] Error class definitions
│   ├── validators.js                   ✨ [NEW] Request validation functions
│   ├── logger.js                       ✨ [NEW] Structured logging
│   ├── response.js                     ✨ [NEW] HTTP response helpers
│   ├── asyncHandler.js                 ✨ [NEW] Async error wrapper
│   ├── http.js                         HTTP request parsing utilities
│   ├── session.js                      Session & cookie management
│   ├── password.js                     Password hashing utilities
│   └── helpers.js                      General utility functions
│
├── 📁 public/                          [Frontend - Static Assets]
│   ├── index.html                      Main HTML page
│   ├── app.js                          Frontend JavaScript
│   └── styles.css                      Frontend CSS
│
├── 📁 data/                            [Runtime Data]
│   └── store.json                      Persistent data file
│
├── 📁 memory/                          [Internal Documentation]
│   └── MEMORY.md                       Project memory/notes
│
├── 📁 docs/                            ✨ [NEW] Documentation
│   ├── ARCHITECTURE.md                 System architecture overview
│   ├── PRODUCTION_READINESS.md         Production checklist & improvements
│   └── FOLDER_STRUCTURE.md             This file
│
├── 📁 skills/                          [Kiro Skills]
│   └── pr-review/
│       └── SKILL.md                    PR review skill definition
│
├── 📁 .git/                            [Git Repository]
│   └── (git internal files)
│
├── 📁 .vscode/                         [IDE Configuration]
│   └── (VSCode settings)
│
├── 📁 node_modules/                    [Dependencies]
│   └── (npm packages)
│
├── server.js                           Main HTTP server entry point
├── package.json                        npm package configuration
├── package-lock.json                   npm lock file
├── .env                                Environment variables (local)
├── .env.example                        Example environment template
├── .gitignore                          Git ignore patterns
├── README.md                           Project readme
├── RULES.md                            Application rules
├── SOUL.md                             Agent soul/personality
└── agent.yaml                          Kiro agent configuration

```

---

## Layer Responsibilities

### 1. Config Layer (`config/`)
**Purpose:** Centralized configuration management

| File | Exports | Purpose |
|------|---------|---------|
| `env.js` | Configuration object | Environment variables, defaults, validation |
| `constants.js` | Constants object | HTTP status codes, MIME types, cookie config, etc. |

**Key Point:** No direct `process.env` access outside this layer

---

### 2. Controller Layer (`controllers/`)
**Purpose:** HTTP request/response handling

| File | Methods | Responsibility |
|------|---------|-----------------|
| `authController.js` | signup, login, logout, getMe, googleStart, googleCallback | Handle auth endpoints |
| `reviewController.js` | generateReview | Handle review generation |
| `githubController.js` | fetchPullRequest | Handle GitHub PR fetch |
| `pageController.js` | serveStaticFile | Serve HTML/CSS/JS files |

**Key Point:** Controllers only handle HTTP I/O, not business logic

---

### 3. Routing Layer (`routes/`)
**Purpose:** Route matching and delegation

| File | Methods | Responsibility |
|------|---------|-----------------|
| `index.js` | handleRoutes | Orchestrate all routes, return true/false |
| `authRoutes.js` | handleAuthRoutes | Match auth-related requests |
| `reviewRoutes.js` | handleReviewRoutes | Match review-related requests |
| `githubRoutes.js` | handleGitHubRoutes | Match GitHub-related requests |
| `pageRoutes.js` | handlePageRoutes | Match static file requests |

**Key Point:** Routes only decide "who handles this", nothing else

---

### 4. Service Layer (`services/`)
**Purpose:** Business logic and external integrations

| File | Methods | Responsibility |
|------|---------|-----------------|
| `authService.js` | createUser, verifyUser, findOrCreateGoogleUser | Auth logic |
| `reviewService.js` | generateAndSaveReview | Review orchestration |
| `githubService.js` | fetchPullRequest, postComment | GitHub API integration |
| `geminiService.js` | generateReview | Gemini AI integration |

**Key Point:** Services have no HTTP concerns

---

### 5. Storage Layer (`storage/`)
**Purpose:** Data persistence

| File | Methods | Responsibility |
|------|---------|-----------------|
| `store.js` | readStore, writeStore | File-based CRUD operations |

**Key Point:** Storage layer is independent, can be replaced

---

### 6. Utils Layer (`utils/`)
**Purpose:** Reusable functions and utilities

| File | Exports | Purpose |
|------|---------|---------|
| `errors.js` | Error classes | Typed errors with HTTP status |
| `validators.js` | Validation functions | Request input validation |
| `logger.js` | Logger functions | Structured logging |
| `response.js` | Response helpers | HTTP response formatting |
| `asyncHandler.js` | Wrapper function | Async error handling |
| `http.js` | HTTP utilities | Request body parsing |
| `session.js` | Session functions | Cookie/session management |
| `password.js` | Password functions | Password hashing |
| `helpers.js` | Helper functions | General utilities |

**Key Point:** All reusable logic goes here, no business logic

---

## Data Flow Architecture

```
REQUEST ARRIVES
    ↓
server.js (Dispatcher)
    ├─ Parse URL
    ├─ Create URL object
    └─ Call router
    ↓
routes/index.js (Orchestrator)
    ├─ Try authRoutes → controller
    ├─ Try reviewRoutes → controller
    ├─ Try githubRoutes → controller
    └─ Try pageRoutes → controller
    ↓
controllers/* (HTTP Handler)
    ├─ Parse request body
    ├─ Validate with validators.js
    ├─ Call appropriate service
    └─ Format response
    ↓
services/* (Business Logic)
    ├─ Process request
    ├─ Access storage if needed
    ├─ Call external APIs
    └─ Return result
    ↓
storage/store.js (if needed)
    ├─ Read/write data
    └─ Return to service
    ↓
Back to controller
    ├─ Format with response.js
    └─ Send to client
```

---

## File Dependency Graph

```
server.js
  ├─ config/env.js
  ├─ routes/index.js
  │   ├─ routes/authRoutes.js
  │   │   └─ controllers/authController.js
  │   │       ├─ config/env.js
  │   │       ├─ utils/response.js
  │   │       ├─ utils/validators.js
  │   │       ├─ utils/logger.js
  │   │       ├─ utils/session.js
  │   │       └─ services/authService.js
  │   │           ├─ storage/store.js
  │   │           ├─ utils/password.js
  │   │           └─ utils/helpers.js
  │   │
  │   ├─ routes/reviewRoutes.js
  │   │   └─ controllers/reviewController.js
  │   │       ├─ utils/response.js
  │   │       ├─ utils/validators.js
  │   │       ├─ utils/logger.js
  │   │       └─ services/reviewService.js
  │   │           ├─ services/githubService.js
  │   │           ├─ services/geminiService.js
  │   │           ├─ storage/store.js
  │   │           └─ utils/helpers.js
  │   │
  │   ├─ routes/githubRoutes.js
  │   │   └─ controllers/githubController.js
  │   │       ├─ utils/response.js
  │   │       ├─ utils/validators.js
  │   │       ├─ utils/logger.js
  │   │       └─ services/githubService.js
  │   │           └─ utils/helpers.js
  │   │
  │   └─ routes/pageRoutes.js
  │       └─ controllers/pageController.js
  │           ├─ config/constants.js
  │           └─ utils/logger.js
  │
  └─ utils/response.js
      └─ config/constants.js
```

---

## Configuration Access Pattern

```
Only config/* can access process.env

config/env.js
├─ Reads all process.env
├─ Applies defaults
├─ Validates
└─ Exports config object
    ↑
    ├─ server.js
    ├─ controllers/
    ├─ utils/session.js
    └─ other modules
        (All access config through import)
```

---

## Module Sizes (Approximate)

```
Core Modules:
  server.js ..................... 20 lines
  routes/index.js ............... 50 lines

Route Modules (each):
  routes/authRoutes.js ........... 50 lines
  routes/reviewRoutes.js ......... 20 lines
  routes/githubRoutes.js ......... 20 lines
  routes/pageRoutes.js ........... 20 lines

Controller Modules (each):
  controllers/authController.js .. 150 lines
  controllers/reviewController.js  30 lines
  controllers/githubController.js  30 lines
  controllers/pageController.js ... 40 lines

Service Modules (each):
  services/authService.js ........ 80 lines
  services/reviewService.js ...... 100 lines
  services/githubService.js ...... 100 lines
  services/geminiService.js ...... 80 lines

Storage:
  storage/store.js ............... 30 lines

Utilities:
  utils/errors.js ............... 70 lines [NEW]
  utils/validators.js ........... 100 lines [NEW]
  utils/logger.js ............... 50 lines [NEW]
  utils/response.js ............. 60 lines [NEW]
  utils/asyncHandler.js ......... 50 lines [NEW]
  utils/http.js ................. 20 lines
  utils/session.js .............. 100 lines
  utils/password.js ............. 20 lines
  utils/helpers.js .............. 60 lines

Config:
  config/env.js ................. 60 lines [NEW]
  config/constants.js ........... 80 lines [NEW]

Frontend:
  public/index.html ............. 300 lines
  public/app.js ................. 500 lines
  public/styles.css ............. 300 lines

Documentation:
  docs/ARCHITECTURE.md .......... 500 lines [NEW]
  docs/PRODUCTION_READINESS.md .. 400 lines [NEW]
  docs/FOLDER_STRUCTURE.md ...... 350 lines [NEW]

TOTAL CODE: ~2,500 lines
TOTAL DOCS: ~1,250 lines
```

---

## Circular Dependency Check

### ✅ No Circular Dependencies

**Confirmed Safe:**
- `utils/helpers.js` imports `utils/session.js` (getInitials)
- `utils/session.js` defines `sanitizeUser` locally
- All config imports are one-way
- All service imports are one-way
- All controller imports are one-way

---

## Import Patterns

### Pattern 1: Configuration
```javascript
import config from "../config/env.js";
console.log(config.port);
```

### Pattern 2: Constants
```javascript
import { HTTP_STATUS, CONTENT_TYPE } from "../config/constants.js";
```

### Pattern 3: Error Classes
```javascript
import { ValidationError, ServerError } from "../utils/errors.js";
throw new ValidationError("Invalid input");
```

### Pattern 4: Validators
```javascript
import { validateSignup } from "../utils/validators.js";
const data = validateSignup(body);
```

### Pattern 5: Logger
```javascript
import { info, error } from "../utils/logger.js";
info("Action completed");
error("Something failed", err);
```

### Pattern 6: Response Helpers
```javascript
import { ok, badRequest, serverError } from "../utils/response.js";
ok(response, data);
badRequest(response, "Invalid");
```

---

## Environment Variables Usage

```
┌─ .env file
│
├─ PORT                      → config.port
├─ SESSION_SECRET            → config.sessionSecret
│
├─ AUTH0_DOMAIN             → config.auth0.domain
├─ AUTH0_CLIENT_ID          → config.auth0.clientId
├─ AUTH0_CLIENT_SECRET      → config.auth0.clientSecret
├─ AUTH0_CALLBACK_URL       → config.auth0.callbackUrl
│
├─ GITHUB_TOKEN             → config.github.token
│
├─ GEMINI_API_KEY           → config.gemini.apiKey
├─ GEMINI_MODEL             → config.gemini.model
│
└─ LOG_LEVEL                → config.logging.level
    (only accessed via logger.js)
```

---

## Static Assets

```
public/
├── index.html          Main entry point
├── app.js             ~500 lines of frontend logic
└── styles.css         ~300 lines of styling

Served by: pageController.js
Route: GET /* (catch-all)
```

---

## Data Persistence

```
data/
└── store.json

Example structure:
{
  "users": [
    {
      "id": "user_xxxxx",
      "name": "John Doe",
      "email": "john@example.com",
      "passwordHash": "...",
      "authProvider": "email",
      "avatarUrl": "",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "reviews": [
    {
      "id": "review_xxxxx",
      "userId": "user_xxxxx",
      "review": "# Rating\n...",
      "meta": {
        "label": "PR title",
        "rating": "8/10",
        "summary": "..."
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Documentation Files

```
docs/
├── ARCHITECTURE.md          Complete architecture overview
├── PRODUCTION_READINESS.md  Production readiness checklist
└── FOLDER_STRUCTURE.md      This file
```

---

## Adding New Features

### To add a new endpoint:

1. **Define in routes/**
   ```javascript
   // routes/newRoutes.js
   export async function handleNewRoutes(request, response, pathname) {
     if (request.method === "POST" && pathname === "/api/new") {
       await newController.handleNew(request, response);
       return true;
     }
     return false;
   }
   ```

2. **Create controller**
   ```javascript
   // controllers/newController.js
   import { validateNew } from "../utils/validators.js";
   export async function handleNew(request, response) {
     const body = JSON.parse(await readRequestBody(request));
     const data = validateNew(body);
     const result = await newService.process(data);
     ok(response, result);
   }
   ```

3. **Create service**
   ```javascript
   // services/newService.js
   export async function process(data) {
     // Business logic
     return result;
   }
   ```

4. **Add validators**
   ```javascript
   // utils/validators.js - add validateNew()
   ```

5. **Update router**
   ```javascript
   // routes/index.js - import and call new route
   ```

---

## Summary

- **Total Files:** ~30 (excluding node_modules, .git)
- **Total Lines (Code):** ~2,500
- **Total Lines (Docs):** ~1,250
- **Layers:** 6 (Config, Routing, Controller, Service, Storage, Utils)
- **Endpoints:** 11 (6 auth, 1 review, 1 github, 3 static)
- **Key Features:** Clean separation, no external deps, production-ready

**Status: WELL-ORGANIZED & PRODUCTION-READY** ✅
